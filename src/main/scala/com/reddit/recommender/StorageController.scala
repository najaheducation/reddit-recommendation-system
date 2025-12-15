package com.reddit.recommender.controller

import com.reddit.recommender.storage._
import org.apache.spark.sql.SparkSession
import scala.util.{Try, Success, Failure}

/**
 * Controller for the storage pipeline (Kafka → MongoDB)
 */
class StorageController(spark: SparkSession, config: AppConfig) {
  private val processor = new KafkaToMongoProcessor(spark, config)
  private var isRunning: Boolean = false

  /**
   * Start the storage pipeline
   */
  def start(): Unit = {
    if (!isRunning) {
      println(s"💾 Starting storage pipeline for topics: ${config.topics.mkString(", ")}")

      // Start in a separate thread to avoid blocking
      val thread = new Thread(() => {
        Try(processor.start()) match {
          case Success(_) =>
            println("✅ Storage pipeline completed")
          case Failure(e) =>
            println(s"❌ Storage pipeline failed: ${e.getMessage}")
        }
      })

      thread.setDaemon(true)
      thread.start()

      isRunning = true
      println("✅ Storage pipeline started")
    }
  }

  /**
   * Stop the storage pipeline
   */
  def stop(): Unit = {
    Try(processor.stop())
    isRunning = false
    println("⏸️  Storage pipeline stopped")
  }

  /**
   * Check if storage is running
   */
  def isActive: Boolean = isRunning
}