package com.reddit.recommender.storage

import com.reddit.recommender.mongo.MongoConnection
import org.apache.spark.sql._
import org.apache.spark.sql.streaming._
import org.mongodb.scala.bson.Document
import scala.util.control.NonFatal
import scala.concurrent.Await
import scala.concurrent.duration._
import scala.collection.mutable

class KafkaToMongoProcessor(spark: SparkSession, config: AppConfig) extends Serializable {

  @transient lazy private val mongoConnection = new MongoConnection(config.mongo)

  @transient private val metrics = mutable.Map[String, Long](
    "processed" -> 0L,
    "batches" -> 0L
  )

  def start(): Unit = {
    mongoConnection.connect()
    createIndexes()

    println(s"Starting consumer for topics: ${config.topics.mkString(", ")}")

    val kafkaDF = spark.readStream
      .format("kafka")
      .option("kafka.bootstrap.servers", config.kafka.bootstrapServers)
      .option("subscribe", config.topics.mkString(","))
      .option("startingOffsets", "earliest")
      .load()

    val query = kafkaDF.selectExpr("CAST(value AS STRING) as json", "topic")
      .writeStream
      .foreachBatch { (batchDF: Dataset[Row], batchId: Long) =>
        processBatch(batchDF.collect(), batchId)
      }
      .option("checkpointLocation", "/tmp/checkpoints/reddit-mongo")
      .trigger(Trigger.ProcessingTime("30 seconds"))
      .start()

    query.awaitTermination()
  }

  private def processBatch(rows: Array[Row], batchId: Long): Unit = {
    metrics("batches") += 1

    val posts = mutable.ListBuffer[Document]()
    val comments = mutable.ListBuffer[Document]()

    rows.foreach { row =>
      val json = row.getString(0)
      val topic = row.getString(1)
      if (json.nonEmpty) {
        topic match {
          case "reddit-posts" => posts += Document(json)
          case "reddit-comments" => comments += Document(json)
          case _ => // ignore
        }
      }
    }

    if (posts.nonEmpty) insert("posts", posts.toList)
    if (comments.nonEmpty) insert("comments", comments.toList)

    metrics("processed") += posts.size + comments.size

    if (metrics("processed") % 500 == 0) {
      println(s"Processed ${metrics("processed")} items (${metrics("batches")} batches)")
    }
  }

  private def insert(collectionName: String, documents: List[Document]): Unit = {
    val collection = mongoConnection.getCollection(collectionName)
    try {
      Await.result(collection.insertMany(documents).toFuture(), 30.seconds)
    } catch {
      case NonFatal(e) =>
        println(s"Insert failed for $collectionName: ${e.getMessage}")
    }
  }

  private def createIndexes(): Unit = {
    val posts = mongoConnection.getCollection("posts")
    val comments = mongoConnection.getCollection("comments")
    posts.createIndex(Document("_id" -> 1)).toFuture()
    comments.createIndex(Document("_id" -> 1)).toFuture()
    println("Indexes ready")
  }

  def stop(): Unit = {
    println(s"Stopping — processed ${metrics("processed")} items total")
    mongoConnection.close()
  }
}
