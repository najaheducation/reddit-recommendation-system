//// File: controller/IngestionController.scala
//package com.reddit.recommender.test.ingestion
//
///**
// * Controller for the ingestion pipeline (Apify → Kafka)
// */
//class IngestionController(config: ScrapeConfig) {
//  private val service = new ApifyToKafkaService()
//  private var scheduler: Option[ScrapeJobScheduler] = None
//  private var isRunning: Boolean = false
//
//  /**
//   * Start ingestion as a scheduled job
//   */
//  def start(): Unit = {
//    if (!isRunning) {
//      println(s"📥 Starting ingestion with ${config.getSubreddits.size} subreddits")
//      scheduler = Some(new ScrapeJobScheduler())
//
//      // Schedule to run every 6 hours
//      scheduler.foreach(_.scheduleRecurringJob(config, 0, 6, java.util.concurrent.TimeUnit.HOURS))
//
//      isRunning = true
//      println(" Ingestion scheduled (every 6 hours)")
//    }
//  }
//
//  /**
//   * Run a one-time ingestion job (uses controller's default config)
//   */
//  def runOnce(): ScrapeResult = {
//    println("⚡ Running one-time ingestion...")
//    service.execute(config)
//  }
//
//  /**
//   * Run a one-time ingestion job with custom config
//   */
//  def runOnce(customConfig: ScrapeConfig): ScrapeResult = {
//    println("⚡ Running one-time ingestion with custom config...")
//    service.execute(customConfig)
//  }
//
//  /**
//   * Stop ingestion
//   */
//  def stop(): Unit = {
//    scheduler.foreach(_.shutdown())
//    isRunning = false
//    println("  Ingestion stopped")
//  }
//
//  /**
//   * Check if ingestion is running
//   */
//  def isActive: Boolean = isRunning
//}