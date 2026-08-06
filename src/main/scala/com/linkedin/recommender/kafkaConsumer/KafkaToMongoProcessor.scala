package com.linkedin.recommender.kafkaConsumer

import com.linkedin.recommender.mongo.MongoConnection
import org.apache.spark.sql._
import org.apache.spark.sql.functions._
import org.apache.spark.sql.streaming._
import org.mongodb.scala.bson.Document
import org.mongodb.scala.model.{Filters, ReplaceOneModel, ReplaceOptions}

import java.io.File
import scala.collection.mutable
import scala.concurrent.Await
import scala.concurrent.duration._
import scala.util.Try

class KafkaToMongoProcessor(spark: SparkSession, config: AppConfig) extends Serializable {

  @transient lazy private val mongoConnection = new MongoConnection(config.mongo)
  @transient lazy private val consumerBloomFilter = new com.linkedin.recommender.kafkaFilter.JobBloomFilter(100000, 0.01)

  private var streamingQuery: Option[StreamingQuery] = None

  def start(): StreamingQuery = {
    println(s"[SPARK CONSUMER] Initializing Spark Kafka Consumer for topic 'linkedin-jobs'...")
    println(s"[SPARK CONSUMER] Kafka bootstrap servers: ${config.kafka.bootstrapServers}")
    println(s"[SPARK CONSUMER] MongoDB database target: ${config.mongo.database}")

    createIndexes()

    // Fresh checkpoint directory per session to avoid stale offset locks
    val checkpointDir = new File(sys.props.getOrElse("java.io.tmpdir", "/tmp") + "/checkpoints/linkedin-mongo-" + System.currentTimeMillis())
    checkpointDir.mkdirs()

    val kafkaDF = spark.readStream
      .format("kafka")
      .option("kafka.bootstrap.servers", config.kafka.bootstrapServers)
      .option("subscribe", "linkedin-jobs")
      .option("startingOffsets", "earliest")
      .load()

    val rawDF = kafkaDF.select(col("value").cast("string") as "json_str")

    val query = rawDF.writeStream
      .trigger(Trigger.ProcessingTime("3 seconds"))
      .option("checkpointLocation", checkpointDir.getAbsolutePath)
      .foreachBatch { (batchDF: Dataset[Row], batchId: Long) =>
        val count = batchDF.count()
        println(s"\n[SPARK CONSUMER] Received micro-batch #$batchId containing $count message(s) from Kafka.")

        if (count > 0) {
          batchDF.foreachPartition { (partition: Iterator[Row]) =>
            val mongoConn = new MongoConnection(config.mongo)
            val jobsColl = mongoConn.getCollection("jobs")

            val jobOps = mutable.ListBuffer[ReplaceOneModel[Document]]()

            partition.foreach { row =>
              val jsonStr = row.getAs[String]("json_str")
              if (jsonStr != null && jsonStr.trim.nonEmpty) {
                try {
                  val obj = new org.json.JSONObject(jsonStr)

                  val rawId = obj.optString("id", obj.optString("jobId", ""))
                  val link = obj.optString("link", obj.optString("jobUrl", ""))
                  val jobId = if (rawId.nonEmpty) rawId
                              else if (link.nonEmpty) link
                              else java.util.UUID.randomUUID().toString

                  if (!consumerBloomFilter.mightContain(jobId)) {
                    consumerBloomFilter.add(jobId)

                    val doc = Document(jsonStr) ++ Document("_id" -> jobId, "processed_at" -> System.currentTimeMillis())

                    val filter = Filters.eq("_id", jobId)
                    val options = ReplaceOptions().upsert(true)
                    val replace = new ReplaceOneModel[Document](filter, doc, options)

                    jobOps += replace
                  } else {
                    println(s"[CONSUMER BLOOM FILTER] Duplicate job skipped in stream: $jobId")
                  }
                } catch {
                  case e: Exception =>
                    println(s"[SPARK CONSUMER ERROR] Failed to parse row JSON: ${e.getMessage}")
                }
              }
            }

            if (jobOps.nonEmpty) {
              println(s"[SPARK CONSUMER] Writing ${jobOps.size} job document(s) to MongoDB Atlas collection 'jobs'...")
              val result = Try(Await.result(jobsColl.bulkWrite(jobOps.toList).toFuture(), 60.seconds))
              result match {
                case scala.util.Success(res) =>
                  println(s"✓ SUCCESS: Written ${jobOps.size} jobs to MongoDB Atlas! (Inserted: ${res.getInsertedCount}, Modified: ${res.getModifiedCount}, Upserts: ${res.getUpserts.size()})")
                case scala.util.Failure(e) =>
                  println(s"✗ ERROR writing to MongoDB Atlas: ${e.getMessage}")
                  e.printStackTrace()
              }
            }

            mongoConn.close()
          }
        }
      }
      .start()

    streamingQuery = Some(query)
    println(s"✓ [SPARK CONSUMER] Streaming query active (ID: ${query.id})")
    query
  }

  private def createIndexes(): Unit = {
    Try {
      val jobs = mongoConnection.getCollection("jobs")
      Await.result(jobs.createIndex(Document("id" -> 1)).toFuture(), 10.seconds)
      Await.result(jobs.createIndex(Document("title" -> 1)).toFuture(), 10.seconds)
    }
  }

  def stop(): Unit = {
    streamingQuery.foreach(_.stop())
    mongoConnection.close()
  }
}
