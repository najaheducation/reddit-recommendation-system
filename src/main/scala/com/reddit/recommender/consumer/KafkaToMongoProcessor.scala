package com.reddit.recommender.consumer

import com.reddit.recommender.analytics.CmsPipeline
import com.reddit.recommender.mongo.MongoConnection
import org.apache.spark.sql._
import org.apache.spark.sql.streaming._
import org.mongodb.scala.bson.Document
import org.mongodb.scala.model.{ReplaceOneModel, ReplaceOptions}
import org.mongodb.scala.model.Filters._
import scala.collection.mutable
import scala.concurrent.Await
import scala.concurrent.duration._
import scala.util.control.NonFatal
import java.nio.file.{Files, Paths}

class KafkaToMongoProcessor(spark: SparkSession, config: AppConfig) extends Serializable {
  @transient lazy private val mongoConnection = new MongoConnection(config.mongo)
  private val checkpointLocation: String =
    sys.props.getOrElse("java.io.tmpdir", "/tmp") + "/checkpoints/reddit-mongo"
  private val stopWordsPath: String = "stopwords.txt"

  @transient private lazy val cms =
    new CmsPipeline(
      mongoConnection = mongoConnection,
      stopWordsPath = stopWordsPath,
      windowDays = 7,
      bucketSizeMillis = 5L * 60L * 1000L,
      epsilon = 0.001,
      delta = 1e-5,
      topN = 10
    )

  @transient private val metrics = mutable.Map[String, Long](
    "processed" -> 0L,
    "batches" -> 0L
  )

  def start(): Unit = {
    mongoConnection.connect()
    createIndexes()
    
    val kafkaDF = spark.readStream
      .format("kafka")
      .option("kafka.bootstrap.servers", config.kafka.bootstrapServers)
      .option("subscribe", config.topics.mkString(","))
      .option("startingOffsets", "latest")
      .load()

    val query = kafkaDF
      .selectExpr("CAST(value AS STRING) as json", "topic")
      .writeStream
      .foreachBatch { (batchDF: Dataset[Row], batchId: Long) =>
        val rowsCount = batchDF.count()
        processBatch(batchDF, batchId, rowsCount)
      }
      .option("checkpointLocation", checkpointLocation)
      .trigger(Trigger.ProcessingTime("10 seconds"))
      .start()

    query.awaitTermination()
  }



  private def processBatch(batchDF: Dataset[Row], batchId: Long, rowsCount: Long): Unit = {
    metrics("batches") += 1
    if (rowsCount == 0) {
      cms.onBatchEnd()
      return
    }

    val posts = mutable.ListBuffer[(String, Document)]()
    val comments = mutable.ListBuffer[(String, Document)]()
    val rows = batchDF.toLocalIterator()
    var batchCount = 0

    while (rows.hasNext) {
      val row = rows.next()
      val json = row.getString(0)
      val topic = row.getString(1)

      if (json != null && json.nonEmpty) {
        cms.onMessage(topic, json)
        getRedditId(json) match {
          case Some(redditId) =>
            val doc = Document(json)
            topic match {
              case "reddit-posts" => posts += ((redditId, doc))
              case "reddit-comments" => comments += ((redditId, doc))
              case _ =>
            }
            batchCount += 1
          case None => // skip invalid messages
        }
      }
    }

    if (posts.nonEmpty) upsertMany("posts", posts.toList)
    if (comments.nonEmpty) upsertMany("comments", comments.toList)

    metrics("processed") += batchCount
    cms.onBatchEnd()
  }

  private def upsertMany(collectionName: String, items: List[(String, Document)]): Unit = {
    val collection = mongoConnection.getCollection(collectionName)
    val operations = items.map { case (redditId, doc) =>
      val filter = equal("id", redditId)
      ReplaceOneModel(filter, doc, new ReplaceOptions().upsert(true))
    }

    if (operations.nonEmpty) {
      try {
        Await.result(collection.bulkWrite(operations).toFuture(), 60.seconds)
      } catch {
        case NonFatal(e) =>
        // Silent on bulk write failures (can be re-enabled with proper logging framework if needed)
      }
    }
  }

  private def getRedditId(json: String): Option[String] = {
    val IdRegex = """"(?:id|name)"\s*:\s*"(t[1-3]_)?([^"]+)"""".r
    IdRegex.findFirstMatchIn(json).map(_.group(2))
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