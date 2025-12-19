//// File: src/main/scala/com/reddit/recommender/examples/SimpleUsage.scala
//package com.reddit.recommender.test
//
//import com.reddit.recommender.controller._
//import com.reddit.recommender.storage._
//import org.apache.spark.sql.SparkSession
//
//import java.util.concurrent.TimeUnit
//
//object SimpleUsage {
//
//  def example1_QuickStart(): Unit = {
//    println("\n=== EXAMPLE 1: Quick Start (Default Pipeline) ===")
//    RedditPipeline.runDefault()
//  }
//
//  def example2_CustomPipeline(): Unit = {
//    println("\n=== EXAMPLE 2: Custom Pipeline ===")
//    val pipeline = new RedditPipelineBuilder()
//      .withIngestion(
//        new ScrapeConfig.Builder()
//          .subreddits("programming", "python", "javascript")
//          .keywords("machine learning", "artificial intelligence")
//          .postsPerSource(20)
//          .scrapeComments(true)
//          .maxCommentsPerPost(3)
//          .build()
//      )
//      .withStorage(
//        AppConfig(
//          mongo = MongoConfig(sys.env.getOrElse("MONGO_URI", "mongodb://localhost:27017"), "reddit_custom", None, None),
//          kafka = KafkaConfig("localhost:9092"),
//          topics = List("reddit-posts", "reddit-comments"),
//          featureExtractor = Some(
//            FeatureExtractorConfig(
//              topics = List(
//                TopicConfig("programming", List("python", "javascript", "java", "scala", "code")),
//                TopicConfig("ai", List("ai", "machine", "learning", "neural", "deep", "model"))
//              ),
//              stopWords = List("the", "a", "an", "and", "or", "but"),
//              nGramSize = 2,
//              maxKeywords = 15,
//              minWordLength = 3
//            )
//          )
//        )
//      )
//      .withSparkSession(
//        SparkSession.builder()
//          .appName("reddit-custom-example")
//          .master("local[*]")
//          .config("spark.sql.streaming.checkpointLocation", "C:/tmp/custom-checkpoints")
//          .config("spark.ui.enabled", "false")
//          .getOrCreate()
//      )
//      .build()
//
//    pipeline.start()
//
//    println("Custom pipeline running... Press Enter to stop.")
//    scala.io.StdIn.readLine()
//    pipeline.stop()
//  }
//
//  def example3_IngestionOnly(): Unit = {
//    println("\n=== EXAMPLE 3: Ingestion Only (One-time Run) ===")
//    val config = ScrapeConfig.newsMonitoringConfig()
//
//    val pipeline = new RedditPipelineBuilder()
//      .withIngestion(config)
//      .build()
//
//    val result = pipeline.runOneTimeIngestion(config)
//    result.printReport()
//    pipeline.stop()
//  }
//
//  def example4_StorageOnly(): Unit = {
//    println("\n=== EXAMPLE 4: Storage Only (Process Existing Kafka Data) ===")
//    val storageConfig = ConfigLoader.loadFromEnv()  // or hardcode if needed
//
//    val spark = SparkSession.builder()
//      .appName("reddit-storage-only")
//      .master("local[*]")
//      .config("spark.sql.streaming.checkpointLocation", "C:/tmp/storage-only-checkpoints")
//      .getOrCreate()
//
//    val pipeline = new RedditPipelineBuilder()
//      .withStorage(storageConfig)
//      .withSparkSession(spark)
//      .build()
//
//    pipeline.startStorage()
//
//    println("Storage-only pipeline running for 60 seconds...")
//    Thread.sleep(60000)
//    pipeline.stop()
//    spark.stop()
//  }
//
//  def example5_ScheduledIngestion(): Unit = {
//    println("\n=== EXAMPLE 5: Scheduled Ingestion ===")
//    val config = ScrapeConfig.trendingTechConfig()
//
//    val pipeline = new RedditPipelineBuilder()
//      .withIngestion(config)
//      .build()
//
//    val scheduler = new java.util.concurrent.ScheduledThreadPoolExecutor(1)
//    val task = new Runnable {
//      override def run(): Unit = {
//        println(s"⏰ Scheduled ingestion at ${java.time.Instant.now()}")
//        pipeline.runOneTimeIngestion(config).printReport()
//      }
//    }
//
//    scheduler.scheduleAtFixedRate(task, 0, 30, TimeUnit.SECONDS)  // Every 30 seconds for testing
//
//    println("Scheduled ingestion started. Running for 3 minutes... Press Enter to stop.")
//    scala.io.StdIn.readLine()
//
//    scheduler.shutdown()
//    pipeline.stop()
//  }
//
//  // MAIN METHOD — Run this object directly
//  def main(args: Array[String]): Unit = {
//    println("Reddit Recommender System - Example Runner")
//    println("Choose an example to run:\n")
//    println("1. Quick Start (full default pipeline)")
//    println("2. Custom Pipeline")
//    println("3. Ingestion Only")
//    println("4. Storage Only")
//    println("5. Scheduled Ingestion")
//    println("0. Run ALL examples sequentially (may take time)")
//
//    val choice = scala.io.StdIn.readLine("Enter choice (0-5): ").trim
//
//    choice match {
//      case "1" => example1_QuickStart()
//      case "2" => example2_CustomPipeline()
//      case "3" => example3_IngestionOnly()
//      case "4" => example4_StorageOnly()
//      case "5" => example5_ScheduledIngestion()
//      case "0" =>
//        example1_QuickStart()
//        example2_CustomPipeline()
//        example3_IngestionOnly()
//        example4_StorageOnly()
//        example5_ScheduledIngestion()
//      case _ =>
//        println("Invalid choice. Running Quick Start by default...")
//        example1_QuickStart()
//    }
//  }
//}