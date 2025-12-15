package com.reddit.recommender.storage

import org.apache.spark.sql.SparkSession
import org.apache.spark.SparkConf
import scala.util.{Try, Success, Failure}
import java.util.concurrent.atomic.AtomicBoolean

object RedditMongoPipeline {
  private val isShuttingDown = new AtomicBoolean(false)
  private var processor: KafkaToMongoProcessor = _
  private var spark: SparkSession = _

  def main(args: Array[String]): Unit = {
    println("🚀 Starting Reddit Kafka → MongoDB Pipeline")

    val config = if (args.length > 0 && args(0) == "--config") {
      ConfigLoader.loadFromFile(args(1))
    } else {
      ConfigLoader.loadFromEnv()
    }

    setupShutdownHook()

    val sparkConf = new SparkConf()
      .setAppName("Reddit-Mongo-Processor")
      .setIfMissing("spark.master", "local[*]")
      .set("spark.sql.streaming.checkpointLocation", "/tmp/spark-checkpoints")
      .set("spark.sql.streaming.schemaInference", "true")
      .set("spark.ui.enabled", "false")

    spark = SparkSession.builder()
      .config(sparkConf)
      .getOrCreate()

    spark.sparkContext.setLogLevel("ERROR")

    processor = new KafkaToMongoProcessor(spark, config)

    try {
      println("▶️  Starting processing (Ctrl+C to stop)...")
      processor.start()
    } catch {
      case e: Exception =>
        println(s"❌ Pipeline failed: ${e.getMessage}")
        cleanup()
        System.exit(1)
    }
  }

  private def setupShutdownHook(): Unit = {
    Runtime.getRuntime.addShutdownHook(new Thread(() => {
      if (isShuttingDown.compareAndSet(false, true)) {
        println("\n🛑 Shutdown signal received")
        cleanup()
      }
    }))
  }

  private def cleanup(): Unit = {
    Try(processor.stop())
    Try(if (spark != null) spark.stop())
  }
}

//package com.reddit.recommender.storage
//
//import org.apache.spark.sql.SparkSession
//import org.apache.spark.SparkConf
//
//import scala.util.{Failure, Success, Try}
//
//object RedditMongoPipeline {
//
//  def main(args: Array[String]): Unit = {
//    println("🚀 Starting Reddit Kafka → MongoDB Pipeline")
//
//    // Parse command line arguments
//    val argMap = args.sliding(2, 2).toList.collect {
//      case Array("--config", path) => "config" -> path
//    }.toMap
//
//    // Load configuration - SIMPLIFIED
//    val config = if (argMap.contains("config")) {
//      val configPath = argMap("config")
//      println(s"Loading config from: $configPath")
//      ConfigLoader.loadFromFile(configPath)
//    } else {
//      println("Loading config from environment variables")
//      ConfigLoader.loadFromEnv()
//    }
//
//    println(s"📊 Configuration loaded")
//    println(s"  MongoDB: ${config.mongo.database} @ ${config.mongo.uri}")
//    println(s"  Kafka: ${config.kafka.bootstrapServers}")
//    println(s"  Topics: ${config.topics.mkString(", ")}")
//    println(s"  Feature Extractor: ${config.featureExtractor.map(_ => "Custom").getOrElse("Default")}")
//
//    // Create Spark session
//    val sparkConf = new SparkConf()
//      .setAppName("Reddit-Mongo-Processor")
//      .setIfMissing("spark.master", "local[*]")
//      .set("spark.sql.streaming.checkpointLocation", "/tmp/spark-checkpoints")
//      .set("spark.sql.streaming.schemaInference", "true")
//      .set("spark.ui.enabled", "true")
//
//    val spark = Try {
//      SparkSession.builder()
//        .config(sparkConf)
//        .getOrCreate()
//    } match {
//      case Success(session) =>
//        session.sparkContext.setLogLevel("WARN")
//        session
//      case Failure(e) =>
//        println(s"Failed to create Spark session: ${e.getMessage}")
//        throw e
//    }
//
//    // Create and start processor
//    val processor = Try(new KafkaToMongoProcessor(spark, config)) match {
//      case Success(p) => p
//      case Failure(e) =>
//        println(s"Failed to create processor: ${e.getMessage}")
//        spark.stop()
//        System.exit(1)
//        throw e
//    }
//
//    // Add shutdown hook
//    sys.addShutdownHook {
//      println("\n🛑 Shutting down pipeline...")
//      Try(processor.stop()).failed.foreach(e => println(s"Error stopping processor: ${e.getMessage}"))
//      Try(spark.stop()).failed.foreach(e => println(s"Error stopping Spark: ${e.getMessage}"))
//      println("Pipeline stopped")
//    }
//
//    try {
//      println("\n▶️ Starting processing...")
//      processor.start()
//    } catch {
//      case e: Exception =>
//        println(s"❌ Pipeline failed: ${e.getMessage}")
//        e.printStackTrace()
//        spark.stop()
//        System.exit(1)
//    }
//  }
//}