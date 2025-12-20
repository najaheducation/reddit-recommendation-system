//package com.reddit.recommender.test
//
//import com.reddit.recommender.consumer._
//import org.apache.spark.sql.SparkSession
//
//import scala.util.{Failure, Success, Try}
//
///**
// * Controller for the consumer pipeline (Kafka → MongoDB)
// */
//class StorageController(spark: SparkSession, config: AppConfig) {
//  private val 
//  
//  processor = new KafkaToMongoProcessor(spark, config)
//  private var isRunning: Boolean = false
//
//  /**
//   * Start the consumer pipeline
//   */
//  def start(): Unit = {
//    if (!isRunning) {
//      println(s"💾 Starting consumer pipeline for topics: ${config.topics.mkString(", ")}")
//
//      // Start in a separate thread to avoid blocking
//      val thread = new Thread(() => {
//        Try(processor.start()) match {
//          case Success(_) =>
//            println(" Storage pipeline completed")
//          case Failure(e) =>
//            println(s" Storage pipeline failed: ${e.getMessage}")
//        }
//      })
//
//      thread.setDaemon(true)
//      thread.start()
//
//      isRunning = true
//      println(" Storage pipeline started")
//    }
//  }
//
//  /**
//   * Stop the consumer pipeline
//   */
//  def stop(): Unit = {
//    Try(processor.stop())
//    isRunning = false
//    println("  Storage pipeline stopped")
//  }
//
//  /**
//   * Check if consumer is running
//   */
//  def isActive: Boolean = isRunning
//}