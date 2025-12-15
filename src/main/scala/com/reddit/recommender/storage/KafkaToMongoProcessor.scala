package com.reddit.recommender.storage

import com.reddit.recommender.models.{RawRedditPost, RawRedditComment}
import io.circe.generic.auto._
import io.circe.parser.decode
import io.circe.syntax._
import io.circe.{Json, DecodingFailure}
import org.apache.spark.sql._
import org.apache.spark.sql.streaming._
import org.apache.spark.sql.Encoders
import org.mongodb.scala.bson.Document
import scala.util.control.NonFatal
import scala.concurrent.Await
import scala.concurrent.duration._
import scala.collection.mutable

class KafkaToMongoProcessor(spark: SparkSession, config: AppConfig) extends Serializable {

  @transient lazy private val mongoConnection = new MongoConnection(config.mongo)
  @transient lazy private val featureExtractor = config.featureExtractor match {
    case Some(featureConfig) => FeatureExtractor(featureConfig)
    case None => FeatureExtractor()
  }

  @transient private val metrics = mutable.Map[String, Long](
    "processed_messages" -> 0L,
    "failed_messages" -> 0L,
    "total_batches" -> 0L,
    "mongodb_retries" -> 0L
  )

  private var lastError: Option[String] = None
  private var lastBatchTime: Long = 0L

  def start(): Unit = {
    mongoConnection.connect()
    createIndexes()

    println(s"Starting Kafka consumer for topics: ${config.topics.mkString(", ")}")
    println("Metrics will be logged every 30 seconds")

    val kafkaDF = spark.readStream
      .format("kafka")
      .option("kafka.bootstrap.servers", config.kafka.bootstrapServers)
      .option("subscribe", config.topics.mkString(","))
      .option("startingOffsets", "earliest")
      .option("maxOffsetsPerTrigger", 1000)
      .load()

    val processedDF = kafkaDF
      .selectExpr("CAST(value AS STRING) as json", "topic")
      .as(Encoders.tuple(Encoders.STRING, Encoders.STRING))
      .map { case (json, topic) =>
        KafkaToMongoProcessor.processSingleMessage(json, topic, featureExtractor)
      }(Encoders.STRING)
      .filter(_.nonEmpty)

    val query = processedDF.writeStream
      .foreachBatch { (batchDF: Dataset[String], batchId: Long) =>
        if (!batchDF.isEmpty) {
          processBatch(batchDF.collect(), batchId)
        }
      }
      .outputMode(OutputMode.Append())
      .option("checkpointLocation", "/tmp/checkpoints/reddit-mongo")
      .trigger(Trigger.ProcessingTime("30 seconds"))
      .start()

    query.awaitTermination()
  }

  private def processBatch(documents: Array[String], batchId: Long): Unit = {
    metrics("total_batches") += 1
    lastBatchTime = System.currentTimeMillis()

    val posts = mutable.ListBuffer[Document]()
    val comments = mutable.ListBuffer[Document]()
    var parseErrors = 0

    documents.foreach { docJson =>
      if (docJson.nonEmpty) {
        decode[Json](docJson) match {
          case Right(json) =>
            json.hcursor.get[String]("kind") match {
              case Right("post") => posts += Document(docJson)
              case Right("comment") => comments += Document(docJson)
              case _ => parseErrors += 1
            }
          case Left(error) =>
            parseErrors += 1
            if (parseErrors <= 3) { // Log first 3 errors
              println(s"Parse error in batch $batchId: ${error.getMessage}")
            }
        }
      }
    }

    // Insert posts with retry
    if (posts.nonEmpty) {
      val success = insertWithRetry("posts", posts.toList, 3)
      if (success) metrics("processed_messages") += posts.size
    }

    // Insert comments with retry
    if (comments.nonEmpty) {
      val success = insertWithRetry("comments", comments.toList, 3)
      if (success) metrics("processed_messages") += comments.size
    }

    // Log metrics periodically
    val totalMessages = metrics("processed_messages") + metrics("failed_messages")
    if (totalMessages > 0 && totalMessages % 1000 == 0) {
      logMetrics()
    }
  }

  private def insertWithRetry(
                               collectionName: String,
                               documents: List[Document],
                               maxAttempts: Int
                             ): Boolean = {
    val collection = mongoConnection.getCollection(collectionName)

    for (attempt <- 1 to maxAttempts) {
      try {
        Await.result(collection.insertMany(documents).toFuture(), 30.seconds)
        return true
      } catch {
        case NonFatal(e) if attempt < maxAttempts =>
          metrics("mongodb_retries") += 1
          println(s"Retry $attempt for $collectionName: ${e.getMessage}")
          Thread.sleep(1000 * attempt) // Linear backoff
        case NonFatal(e) =>
          lastError = Some(s"Failed to insert $collectionName after $maxAttempts attempts: ${e.getMessage}")
          println(s"❌ $lastError")
          return false
      }
    }
    false
  }

  private def recordFailure(error: String): Unit = {
    metrics("failed_messages") += 1
    lastError = Some(error)

    // Log only occasional failures to avoid spam
    if (metrics("failed_messages") % 100 == 0) {
      println(s"⚠️ Total failures: ${metrics("failed_messages")}")
    }
  }

  private def logMetrics(): Unit = {
    val total = metrics("processed_messages") + metrics("failed_messages")
    val failureRate = if (total > 0) metrics("failed_messages").toDouble / total * 100 else 0

    println("\n" + "=" * 50)
    println("📊 Pipeline Metrics")
    println("=" * 50)
    println(f"Processed: ${metrics("processed_messages")}%d messages")
    println(f"Failed: ${metrics("failed_messages")}%d messages")
    println(f"Failure rate: ${failureRate}%.1f%%")
    println(f"Batches: ${metrics("total_batches")}%d")
    println(f"MongoDB retries: ${metrics("mongodb_retries")}%d")
    lastError.foreach(err => println(s"Last error: $err"))
    println("=" * 50 + "\n")
  }

  private def createIndexes(): Unit = {
    val postsCollection = mongoConnection.getCollection("posts")
    val commentsCollection = mongoConnection.getCollection("comments")

    val postIndexes = List(
      Document("_id" -> 1),
      Document("subreddit" -> 1),
      Document("author" -> 1),
      Document("created_utc" -> -1),
      Document("score" -> -1),
      Document("text_features.keywords" -> 1),
      Document("text_features.topic_category" -> 1)
    )

    val commentIndexes = List(
      Document("_id" -> 1),
      Document("postId" -> 1),
      Document("author" -> 1),
      Document("created_utc" -> -1)
    )

    postIndexes.foreach { index => postsCollection.createIndex(index).toFuture() }
    commentIndexes.foreach { index => commentsCollection.createIndex(index).toFuture() }

    println("✅ MongoDB indexes created/verified")
  }

  def stop(): Unit = {
    println("\n🛑 Stopping processor...")
    logMetrics()
    mongoConnection.close()
  }
}

object KafkaToMongoProcessor {
  def processSingleMessage(json: String, topic: String, featureExtractor: FeatureExtractor): String = {
    try {
      topic match {
        case "reddit-posts" =>
          decode[RawRedditPost](json) match {
            case Right(rawPost) =>
              val processed = featureExtractor.extractFromRawPost(rawPost)
              processed.asJson.noSpaces
            case Left(error) =>
              println(s"Parse error for post: ${error.getMessage}")
              ""
          }
        case "reddit-comments" =>
          decode[RawRedditComment](json) match {
            case Right(rawComment) =>
              val processed = featureExtractor.extractFromRawComment(rawComment)
              processed.asJson.noSpaces
            case Left(error) =>
              println(s"Parse error for comment: ${error.getMessage}")
              ""
          }
        case _ =>
          println(s"Unknown topic: $topic")
          ""
      }
    } catch {
      case NonFatal(e) =>
        println(s"Processing error: ${e.getMessage}")
        ""
    }
  }
}