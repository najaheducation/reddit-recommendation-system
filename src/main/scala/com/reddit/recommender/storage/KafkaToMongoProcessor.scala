package com.reddit.recommender.storage

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
    cms.ensureIndexes()

    ensureCheckpointDir()

    println(s"[START] topics: ${config.topics.mkString(", ")}")
    println(s"[START] checkpointLocation: $checkpointLocation")

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
        println(s"[BATCH $batchId] rows=$rowsCount")

        processBatch(batchDF, batchId, rowsCount)E
      }
      .option("checkpointLocation", checkpointLocation)
      .trigger(Trigger.ProcessingTime("10 seconds"))
      .start()

    println(s"[STREAM] started id=${query.id} runId=${query.runId} isActive=${query.isActive}")

    query.awaitTermination()
  }

  private def ensureCheckpointDir(): Unit = {
    try {
      val p = Paths.get(checkpointLocation)
      if (!Files.exists(p)) {
        Files.createDirectories(p)
        println(s"[CHECKPOINT] directory created: $checkpointLocation")
      } else {
        println(s"[CHECKPOINT] directory exists: $checkpointLocation")
      }
    } catch {
      case NonFatal(e) =>
        println(s"[ERROR] Cannot create checkpoint directory: ${e.getMessage}")
        throw e
    }
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

        extractRedditId(json) match {
          case Some(redditId) =>
            val doc = Document(json)
            topic match {
              case "reddit-posts"    => posts += ((redditId, doc))
              case "reddit-comments" => comments += ((redditId, doc))
              case _                 =>
            }
            batchCount += 1

          case None =>
            println(s"[WARN] No Reddit ID found, skipping insert: ${json.take(200)}...")
        }
      }
    }

    if (posts.nonEmpty) upsertMany("posts", posts.toList)
    if (comments.nonEmpty) upsertMany("comments", comments.toList)

    metrics("processed") += batchCount
    println(s"[BATCH $batchId] processed=$batchCount total=${metrics("processed")} batches=${metrics("batches")}")

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
        println(s"[UPSERT] $collectionName: ${operations.size} documents processed (with upsert)")
      } catch {
        case NonFatal(e) =>
          println(s"[ERROR] Bulk upsert failed for $collectionName: ${e.getMessage}")
      }
    }

    if (operations.nonEmpty) {
      try {
        Await.result(collection.bulkWrite(operations).toFuture(), 60.seconds)
        println(s"[UPSERT] $collectionName: ${operations.size} documents processed (with upsert)")
      } catch {
        case NonFatal(e) =>
          println(s"[ERROR] Bulk upsert failed for $collectionName: ${e.getMessage}")
      }
    }
  }

  private def extractRedditId(json: String): Option[String] = {
    extractField(json, List("id", "name"))
      .map(_.trim)
      .filter(_.nonEmpty)
      .map(id => if (id.startsWith("t3_") || id.startsWith("t1_")) id.drop(3) else id)
  }

  private def extractField(json: String, fields: List[String]): Option[String] = {
    fields.view.flatMap { f =>
      val r1 = (""""""" + f + """"\s*:\s*"([^"]*)"""").r
      val r2 = (""""""" + f + """"\s*:\s*([0-9]+)""").r
      r1.findFirstMatchIn(json).map(_.group(1))
        .orElse(r2.findFirstMatchIn(json).map(_.group(1)))
    }.headOption
  }

  private def extractRedditId(json: String): Option[String] = {
    extractField(json, List("id", "name"))
      .map(_.trim)
      .filter(_.nonEmpty)
      .map(id => if (id.startsWith("t3_") || id.startsWith("t1_")) id.drop(3) else id)
  }

  private def extractField(json: String, fields: List[String]): Option[String] = {
    fields.view.flatMap { f =>
      val r1 = (""""""" + f + """"\s*:\s*"([^"]*)"""").r
      val r2 = (""""""" + f + """"\s*:\s*([0-9]+)""").r
      r1.findFirstMatchIn(json).map(_.group(1))
        .orElse(r2.findFirstMatchIn(json).map(_.group(1)))
    }.headOption
  }

  private def createIndexes(): Unit = {
    val posts = mongoConnection.getCollection("posts")
    val comments = mongoConnection.getCollection("comments")

    Await.result(posts.createIndex(Document("id" -> 1)).toFuture(), 10.seconds)
    Await.result(comments.createIndex(Document("id" -> 1)).toFuture(), 10.seconds)

    println("[START] Indexes ready")
  }

  def stop(): Unit = {
    println(s"Stopping — processed ${metrics("processed")} items total")
    mongoConnection.close()
  }
}