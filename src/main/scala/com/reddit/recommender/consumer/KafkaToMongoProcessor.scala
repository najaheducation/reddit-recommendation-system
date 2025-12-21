package com.reddit.recommender.consumer

import com.reddit.recommender.analytics.CmsPipeline
import com.reddit.recommender.mongo.MongoConnection
import org.apache.spark.sql._
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._
import org.apache.spark.sql.streaming._
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

  private val stopWordsPath: String = "stopwords.txt"

  @transient private lazy val cms = new CmsPipeline(
    mongoConnection = mongoConnection,
    stopWordsPath = stopWordsPath,
    windowDays = 7,
    bucketSizeMillis = 5L * 60L * 1000L,
    epsilon = 0.001,
    delta = 1e-5,
    topN = 10
  )

  def start(): Unit = {
    createIndexes()

    // 1. Fully Accounted Schema (Matched to items.json)
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
      // Comment Specific fields from items.json
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
      .foreachBatch { (batchDF: Dataset[Row], _: Long) =>
        batchDF.foreachPartition { (partition: Iterator[Row]) =>
          val mongoConn = new MongoConnection(config.mongo)
          val postsColl = mongoConn.getCollection("posts")
          val commentsColl = mongoConn.getCollection("comments")

          val postOps = mutable.ListBuffer[ReplaceOneModel[Document]]()
          val commentOps = mutable.ListBuffer[ReplaceOneModel[Document]]()

          partition.foreach { row =>
            val redditId = row.getAs[String]("id")
            val kind = row.getAs[String]("kind")

            if (redditId != null) {
              // 1. Safely build the BSON Document field by field to handle nulls and types
              var doc = Document()

              row.schema.fieldNames.foreach { fieldName =>
                val value = row.getAs[Any](fieldName)
                if (value != null) {
                  // Spark types to BSON-friendly types
                  doc = doc ++ Document(fieldName -> value.toString)
                  // Note: .toString is the safest fallback, 
                  // but Document(fieldName -> value) works for primitives like Int/Boolean
                }
              }

              // 2. Add a timestamp for when we processed it
              doc = doc ++ Document("processed_at" -> System.currentTimeMillis())

              val filter = Filters.eq("id", redditId)
              val options = ReplaceOptions().upsert(true)
              val replace = new ReplaceOneModel[Document](filter, doc, options)

              // 3. Routing logic based on 'kind' or topic
              val topic = row.getAs[String]("topic")
              val isPost = kind == "post" || (topic != null && topic.contains("posts"))
              val isComment = kind == "comment" || (topic != null && topic.contains("comments"))

              if (isPost) {
                postOps += replace
              } else if (isComment) {
                commentOps += replace
              }

              // 4. Analytics
              if (topic != null) {
                cms.onMessage(topic, row.json)
              }
            }
          }

          if (postOps.nonEmpty) {
            Try(Await.result(postsColl.bulkWrite(postOps.toList).toFuture(), 60.seconds))
          }
          if (commentOps.nonEmpty) {
            Try(Await.result(commentOps.toList match {
              case Nil => scala.concurrent.Future.successful(None)
              case ops => commentsColl.bulkWrite(ops).toFuture()
            }, 60.seconds))
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
    // Extra index for comment lookups by parent post
    Await.result(comments.createIndex(Document("postId" -> 1)).toFuture(), 10.seconds)
  }

  def stop(): Unit = {
    mongoConnection.close()
  }
}