package com.reddit.recommender.consumer
import java.time.Instant
import com.reddit.recommender.mongo.MongoConnection
import org.apache.spark.sql._
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._
import org.apache.spark.sql.streaming._
import org.apache.spark.util.sketch.CountMinSketch
import org.mongodb.scala.bson.Document
import org.mongodb.scala.model.{ReplaceOneModel, ReplaceOptions, Filters}
import scala.collection.mutable
import scala.concurrent.Await
import scala.concurrent.duration._
import scala.util.Try

class KafkaToMongoProcessor(spark: SparkSession, config: AppConfig) extends Serializable {

  @transient lazy private val mongoConnection = new MongoConnection(config.mongo)

  private val checkpointLocation: String =
    sys.props.getOrElse("java.io.tmpdir", "/tmp") + "/checkpoints/reddit-mongo"

  def start(): Unit = {
    createIndexes()
    import spark.implicits._

    val stopWordsPath = "stopwords.txt"
    val stopWords = try {
      scala.io.Source.fromResource(stopWordsPath)
        .getLines()
        .map(_.trim.toLowerCase)
        .filter(_.nonEmpty)
        .toSet
    } catch {
      case _: Exception => Set[String]() // empty if file missing
    }
    val broadcastStopWords = spark.sparkContext.broadcast(stopWords)

    val redditSchema = new StructType()
      .add("kind", StringType)
      .add("query", StringType)
      .add("id", StringType)
      .add("title", StringType)
      .add("body", StringType)
      .add("author", StringType)
      .add("score", IntegerType)
      .add("upvote_ratio", DoubleType)
      .add("num_comments", IntegerType)
      .add("subreddit", StringType)
      .add("created_utc", StringType)
      .add("url", StringType)
      .add("flair", StringType)
      .add("over_18", BooleanType)
      .add("is_self", BooleanType)
      .add("spoiler", BooleanType)
      .add("locked", BooleanType)
      .add("is_video", BooleanType)
      .add("domain", StringType)
      .add("thumbnail", StringType)
      .add("url_overridden_by_dest", StringType)
      .add("author_fullname", StringType)
      .add("author_flair_text", StringType)
      .add("author_premium", BooleanType)
      .add("selftext_html", StringType)
      .add("postId", StringType)
      .add("parentId", StringType)
      .add("depth", IntegerType)
      .add("media", StringType)
      .add("media_metadata", StringType)
      .add("gallery_data", StringType)
      .add("stickied", BooleanType)
      .add("distinguished", StringType)
      .add("total_awards_received", IntegerType)
      .add("all_awardings", StringType)
      .add("gilded", IntegerType)
      .add("num_crossposts", IntegerType)
      .add("is_original_content", BooleanType)
      .add("preview", StringType)
      .add("secure_media", StringType)
      .add("secure_media_embed", StringType)
      .add("crosspost_parent_list", StringType)
      .add("is_comment", BooleanType)
      .add("treatment_tags", StringType)
      .add("post_hint", StringType)
      .add("author_cakeday", BooleanType)
      .add("num_reports", IntegerType)
      .add("approved_at_utc", StringType)
      .add("archived", BooleanType)
      .add("postUrl", StringType)
      .add("is_submitter", BooleanType)
      .add("score_hidden", BooleanType)
      .add("controversiality", IntegerType)

    val kafkaDF = spark.readStream
      .format("kafka")
      .option("kafka.bootstrap.servers", config.kafka.bootstrapServers)
      .option("subscribe", config.topics.mkString(","))
      .option("startingOffsets", "latest")
      .load()

    val parsedDF = kafkaDF
      .select(
        from_json(col("value").cast("string"), redditSchema) as "data",
        col("topic")
      )
      .select("data.*", "topic")

    val query = parsedDF.writeStream
      .trigger(Trigger.ProcessingTime("10 seconds"))
      .option("checkpointLocation", checkpointLocation)
      .foreachBatch { (batchDF: Dataset[Row], batchId: Long) =>
        // 1. Save posts/comments (upsert by id — keeps latest version)
        batchDF.foreachPartition { partition: Iterator[Row] =>
          val mongoConn = new MongoConnection(config.mongo)
          val postsColl = mongoConn.getCollection("posts")
          val commentsColl = mongoConn.getCollection("comments")

          val postOps = mutable.ListBuffer[ReplaceOneModel[Document]]()
          val commentOps = mutable.ListBuffer[ReplaceOneModel[Document]]()

          partition.foreach { row =>
            val redditId = row.getAs[String]("id")
            val kind = row.getAs[String]("kind")
            if (redditId != null) {
              var doc = Document()
              row.schema.fieldNames.foreach { fieldName =>
                val value = row.getAs[Any](fieldName)
                if (value != null) {
                  value match {
                    case v: String => doc = doc ++ Document(fieldName -> v)
                    case v: Int => doc = doc ++ Document(fieldName -> v)
                    case v: Long => doc = doc ++ Document(fieldName -> v)
                    case v: Double => doc = doc ++ Document(fieldName -> v)
                    case v: Boolean => doc = doc ++ Document(fieldName -> v)
                    case v => doc = doc ++ Document(fieldName -> v.toString)
                  }
                }
              }
              doc = doc ++ Document("processed_at" -> System.currentTimeMillis())

              val filter = Filters.eq("id", redditId)
              val replace = new ReplaceOneModel[Document](filter, doc, ReplaceOptions().upsert(true))

              val topic = row.getAs[String]("topic")
              val isPost = kind == "post" || (topic != null && topic.contains("posts"))

              if (isPost) postOps += replace else commentOps += replace
            }
          }

          if (postOps.nonEmpty) Try(Await.result(postsColl.bulkWrite(postOps.toList).toFuture(), 60.seconds))
          if (commentOps.nonEmpty) Try(Await.result(commentsColl.bulkWrite(commentOps.toList).toFuture(), 60.seconds))

          mongoConn.close()
        }

        if (!batchDF.isEmpty) {
          val phrasesDF = batchDF
            .withColumn("text", concat_ws(" ",
              coalesce(col("title"), lit("")),
              coalesce(col("selftext_html"), lit("")),
              coalesce(col("body"), lit(""))
            ))
            .withColumn("text", lower(regexp_replace(col("text"), """https?://\S+""", " ")))
            .withColumn("text", regexp_replace(col("text"), """[^a-z\s]""", " "))
            .withColumn("words", split(col("text"), "\\s+"))
            .withColumn("phrase", explode(expr("""
      array(
        element_at(words, 1),
        concat_ws(' ', element_at(words, 1), element_at(words, 2)),
        concat_ws(' ', element_at(words, 1), element_at(words, 2), element_at(words, 3))
      )
    """)))
            .filter(length(col("phrase")) >= 3)
            .filter {
              val phraseWords = split(col("phrase"), " ")
              val stopWordsLit = array(broadcastStopWords.value.toSeq.map(lit): _*)
              // If the intersection of phrase words and stopwords is empty, the phrase is clean
              size(array_intersect(phraseWords, stopWordsLit)) === 0
            }            .groupBy("phrase")
            .count()
            .orderBy(desc("count"))
            .limit(50)

          val collected = phrasesDF.collect()

          if (collected.nonEmpty) {
            val localCMS = CountMinSketch.create(0.001, 1e-5, 1234)
            val trendsList = collected.map { row =>
              val phrase = row.getAs[String]("phrase")
              val count = row.getAs[Long]("count")
              localCMS.add(phrase, count)
              Document("key" -> s"term:$phrase", "count" -> count)
            }.toList

            val trendDoc = Document(
              "_id" -> s"trends_${Instant.now().toString.replace(":", "-")}",
              "trends" -> trendsList,
              "updatedAt" -> System.currentTimeMillis()
            )

            val sketchColl = mongoConnection.getCollection("count_min_sketch")
            Try(Await.result(
              sketchColl.insertOne(trendDoc).toFuture(),
              10.seconds
            ))
          }
        }

        ()
      }
      .start()

    query.awaitTermination()
  }

  private def createIndexes(): Unit = {
    val posts = mongoConnection.getCollection("posts")
    val comments = mongoConnection.getCollection("comments")
    Await.result(posts.createIndex(Document("id" -> 1)).toFuture(), 10.seconds)
    Await.result(comments.createIndex(Document("id" -> 1)).toFuture(), 10.seconds)
    Await.result(comments.createIndex(Document("postId" -> 1)).toFuture(), 10.seconds)
  }

  def stop(): Unit = {
    mongoConnection.close()
  }
}