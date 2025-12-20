package com.reddit.recommender.consumer

import com.reddit.recommender.analytics.CmsPipeline
import com.reddit.recommender.mongo.MongoConnection
import org.apache.spark.sql._
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._
import org.apache.spark.sql.streaming._
import org.mongodb.scala.bson.Document
import org.mongodb.scala.model.{ReplaceOneModel, ReplaceOptions}
import org.mongodb.scala.model.Filters._
import scala.collection.mutable
import scala.concurrent.Await
import scala.concurrent.duration._
import scala.util.Try
import java.nio.file.{Files, Paths}
import org.mongodb.scala.bson.Document
import org.mongodb.scala.model.{Filters, ReplaceOneModel, ReplaceOptions}
import org.mongodb.scala.model.Filters._

class KafkaToMongoProcessor(spark: SparkSession, config: AppConfig) extends Serializable {

  @transient lazy private val mongoConnection = new MongoConnection(config.mongo)

  private val checkpointLocation: String =
    sys.props.getOrElse("java.io.tmpdir", "/tmp") + "/checkpoints/reddit-mongo"

  private val stopWordsPath: String = "stopwords.txt"

  @transient private lazy val cms = new CmsPipeline(
   mongoConnection,
   stopWordsPath,
     7,
    5L * 60L * 1000L,
     0.001,
    1e-5,
     10
  )

  def start(): Unit = {
    createIndexes()

    // Comprehensive schema based on your actual Apify output
    val redditSchema = new StructType()
      .add("kind", StringType, nullable = true)
      .add("query", StringType, nullable = true)
      .add("id", StringType, nullable = true)
      .add("title", StringType, nullable = true)
      .add("body", StringType, nullable = true)
      .add("author", StringType, nullable = true)
      .add("score", IntegerType, nullable = true)
      .add("upvote_ratio", DoubleType, nullable = true)
      .add("num_comments", IntegerType, nullable = true)
      .add("subreddit", StringType, nullable = true)
      .add("created_utc", StringType, nullable = true)
      .add("url", StringType, nullable = true)
      .add("flair", StringType, nullable = true)
      .add("over_18", BooleanType, nullable = true)
      .add("is_self", BooleanType, nullable = true)
      .add("spoiler", BooleanType, nullable = true)
      .add("locked", BooleanType, nullable = true)
      .add("is_video", BooleanType, nullable = true)
      .add("domain", StringType, nullable = true)
      .add("thumbnail", StringType, nullable = true)
      .add("url_overridden_by_dest", StringType, nullable = true)
      .add("author_fullname", StringType, nullable = true)
      .add("author_flair_text", StringType, nullable = true)
      .add("author_premium", BooleanType, nullable = true)
      .add("selftext_html", StringType, nullable = true)
      .add("postId", StringType, nullable = true)
      .add("parentId", StringType, nullable = true)
      .add("depth", IntegerType, nullable = true)

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
      .foreachBatch { (batchDF: Dataset[Row], _: Long) =>
        batchDF.foreachPartition { (partition: Iterator[Row]) =>
          val mongoConn = new MongoConnection(config.mongo)
          val postsColl = mongoConn.getCollection("posts")
          val commentsColl = mongoConn.getCollection("comments")

          val postOps = mutable.ListBuffer[ReplaceOneModel[Document]]()
          val commentOps = mutable.ListBuffer[ReplaceOneModel[Document]]()

          partition.foreach { row =>
            Option(row.getAs[String]("id")) match {
              case Some(redditId) =>
                val topicOpt = Option(row.getAs[String]("topic"))

                val doc = Document(
                  "id"           -> redditId,
                  "kind"         -> row.getAs[String]("kind"),
                  "title"        -> row.getAs[String]("title"),
                  "body"         -> row.getAs[String]("body"),
                  "author"       -> row.getAs[String]("author"),
                  "subreddit"    -> row.getAs[String]("subreddit"),
                  "score"        -> row.getAs[Int]("score"),
                  "upvote_ratio" -> row.getAs[Double]("upvote_ratio"),
                  "num_comments" -> row.getAs[Int]("num_comments"),
                  "created_utc"  -> row.getAs[String]("created_utc"),
                  "url"          -> row.getAs[String]("url"),
                  "over_18"      -> row.getAs[Boolean]("over_18"),
                  "is_self"      -> row.getAs[Boolean]("is_self"),
                  "domain"       -> row.getAs[String]("domain"),
                  "thumbnail"    -> row.getAs[String]("thumbnail"),
                  "raw_json"     -> row.json
                )
                val filter = Filters.eq("id", redditId)

                val replace = new ReplaceOneModel[Document](
                  filter,
                  doc,
                  ReplaceOptions().upsert(true)
                )

                if (topicOpt.contains("reddit-posts")) {
                  postOps += replace
                } else if (topicOpt.contains("reddit-comments")) {
                  commentOps += replace
                }

                topicOpt.foreach { topic =>
                  cms.onMessage(row.json)
                }

              case None =>
            }

          }

          if (postOps.nonEmpty) {
            Try(Await.result(postsColl.bulkWrite(postOps.toList).toFuture(), 60.seconds))
          }
          if (commentOps.nonEmpty) {
            Try(Await.result(commentsColl.bulkWrite(commentOps.toList).toFuture(), 60.seconds))
          }

          cms.onBatchEnd()
          mongoConn.close()
        }
      }
      .start()

    query.awaitTermination()
  }


  private def createIndexes(): Unit = {
    val posts = mongoConnection.getCollection("posts")
    val comments = mongoConnection.getCollection("comments")
    Await.result(posts.createIndex(Document("id" -> 1)).toFuture(), 10.seconds)
    Await.result(comments.createIndex(Document("id" -> 1)).toFuture(), 10.seconds)
  }

  def stop(): Unit = {
    mongoConnection.close()
  }
}