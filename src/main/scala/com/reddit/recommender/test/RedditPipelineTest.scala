//package com.reddit.recommender.test
//
//import com.reddit.recommender.storage._
//import org.apache.spark.sql.SparkSession
//
//object RedditPipelineTest {
//
//  def main(args: Array[String]): Unit = {
//    println("🧪 Reddit Pipeline Test Suite")
//    println("=" * 60)
//
//    // Test 1: Builder Pattern
//    println("\n1. Testing Builder Pattern...")
//    testBuilderPattern()
//
//    // Test 2: Individual Components
//    println("\n2. Testing Individual Components...")
//    testIndividualComponents()
//
//    // Test 3: Complete Pipeline
//    println("\n3. Testing Complete Pipeline...")
//    testCompletePipeline()
//
//    // Test 4: Error Handling
//    println("\n4. Testing Error Handling...")
//    testErrorHandling()
//
//    println("\n" + "=" * 60)
//    println("🎉 All tests completed!")
//    println("=" * 60)
//  }
//
//  private def testBuilderPattern(): Unit = {
//    println("   Creating pipeline with builder...")
//
//    val pipeline = new RedditPipelineBuilder()
//      .withIngestion(
//        new ScrapeConfig.Builder()
//          .subreddits("programming", "technology")
//          .postsPerSource(10)
//          .build()
//      )
//      .withStorage(
//        AppConfig(
//          mongo = MongoConfig(sys.env.getOrElse("MONGO_URI", "mongodb://localhost:27017"), "reddit_test", None, None),
//          kafka = KafkaConfig("localhost:9092"),
//          topics = List("reddit-posts", "reddit-comments")
//        )
//      )
//      .withSparkSession(
//        SparkSession.builder()
//          .appName("test-builder")
//          .master("local[1]")
//          .getOrCreate()
//      )
//      .build()
//
//    println("    Builder pattern works")
//
//    // Test status
//    val status = pipeline.getStatus
//    println(s"   Status - Ingestion: ${status.ingestion.running}")
//    println(s"   Status - Storage: ${status.storage.running}")
//
//    // Cleanup
//    pipeline.stop()
//  }
//
//  private def testIndividualComponents(): Unit = {
//    println("   Testing component isolation...")
//
//    // Test ingestion only
//    val ingestionOnly = new RedditPipelineBuilder()
//      .withIngestion(
//        new ScrapeConfig.Builder()
//          .subreddits("test")
//          .postsPerSource(1)
//          .build()
//      )
//      .build()
//
//    println("    Can create ingestion-only pipeline")
//
//    // Test storage only
//    val storageOnly = new RedditPipelineBuilder()
//      .withStorage(
//        AppConfig(
//          mongo = MongoConfig(sys.env.getOrElse("MONGO_URI", "mongodb://localhost:27017"), "reddit_test", None, None),
//          kafka = KafkaConfig("localhost:9092")
//        )
//      )
//      .withSparkSession(
//        SparkSession.builder()
//          .appName("test-storage")
//          .master("local[1]")
//          .getOrCreate()
//      )
//      .build()
//
//    println("    Can create storage-only pipeline")
//
//    // Cleanup
//    ingestionOnly.stop()
//    storageOnly.stop()
//  }
//
//  private def testCompletePipeline(): Unit = {
//    println("   Testing complete pipeline workflow...")
//
//    try {
//      val pipeline = RedditPipeline.forTesting()
//
//      // Test one-time ingestion
//      println("   Running one-time ingestion...")
//      val result = pipeline.runOneTimeIngestion(
//        new ScrapeConfig.Builder()
//          .subreddits("test")
//          .postsPerSource(2)
//          .build()
//      )
//
//      println(s"    Ingested ${result.getTotalPosts} posts")
//
//      // Start storage briefly
//      println("   Starting storage pipeline...")
//      pipeline.startStorage()
//      Thread.sleep(5000) // Run for 5 seconds
//
//      // Check status
//      pipeline.printStatus()
//
//      // Stop
//      pipeline.stop()
//
//      println("    Complete pipeline test passed")
//
//    } catch {
//      case e: Exception =>
//        println(s"    Complete pipeline test failed: ${e.getMessage}")
//        println("   Note: This test requires Kafka and MongoDB to be running")
//    }
//  }
//
//  private def testErrorHandling(): Unit = {
//    println("   Testing error handling...")
//
//    // Test with invalid config
//    try {
//      val pipeline = new RedditPipelineBuilder()
//        .withIngestion(
//          new ScrapeConfig.Builder()
//            .build() // This should throw - no sources specified
//        )
//        .build()
//
//      println("    Should have thrown exception for empty config")
//
//    } catch {
//      case e: IllegalStateException =>
//        println("    Correctly caught invalid configuration")
//      case e: Exception =>
//        println(s"    Caught exception: ${e.getClass.getSimpleName}")
//    }
//
//    // Test graceful shutdown
//    val pipeline = RedditPipeline.forTesting()
//    println("   Testing graceful shutdown...")
//    pipeline.stop()
//    println("    Graceful shutdown works")
//  }
//
//  /**
//   * Integration test - requires running Kafka and MongoDB
//   */
//  def integrationTest(): Unit = {
//    println("🔗 Running Integration Test")
//    println("️  This test requires:")
//    println("   - Kafka running on localhost:9092")
//    println("   - MongoDB running on localhost:27017")
//    println("   - Apify API credentials in .env file")
//
//    val pipeline = RedditPipeline.default()
//
//    try {
//      println("\n▶️  Starting integration test...")
//      pipeline.start()
//
//      // Run for 1 minute
//      println("⏱️  Running for 60 seconds...")
//
//      for (i <- 1 to 12) { // 12 * 5 = 60 seconds
//        Thread.sleep(5000)
//        pipeline.printStatus()
//      }
//
//      println("\n Integration test completed successfully")
//
//    } catch {
//      case e: Exception =>
//        println(s"\n Integration test failed: ${e.getMessage}")
//        e.printStackTrace()
//    } finally {
//      pipeline.stop()
//    }
//  }
//
//  /**
//   * Quick demo of the pipeline
//   */
//  def demo(): Unit = {
//    println("🎬 Reddit Pipeline Demo")
//    println("=" * 60)
//
//    // Method 1: Using builder
//    println("\nMethod 1: Using Builder Pattern")
//    println("-" * 40)
//
//    val pipeline1 = new RedditPipelineBuilder()
//      .withIngestion(ScrapeConfig.trendingTechConfig())
//      .withStorage(ConfigLoader.loadFromEnv())
//      .withSparkSession(
//        SparkSession.builder()
//          .appName("reddit-demo")
//          .master("local[*]")
//          .getOrCreate()
//      )
//      .build()
//
//    println("Created pipeline with builder")
//
//    // Method 2: Using factory method
//    println("\nMethod 2: Using Factory Method")
//    println("-" * 40)
//
//    val pipeline2 = RedditPipeline.default()
//    println("Created default pipeline")
//
//    // Method 3: For testing
//    println("\nMethod 3: Test Configuration")
//    println("-" * 40)
//
//    val pipeline3 = RedditPipeline.forTesting()
//    println("Created test pipeline")
//
//    // Show status
//    println("\nPipeline Status:")
//    println("-" * 40)
//    pipeline3.printStatus()
//
//    // Cleanup
//    pipeline1.stop()
//    pipeline2.stop()
//    pipeline3.stop()
//
//    println("\n Demo completed")
//  }
//}