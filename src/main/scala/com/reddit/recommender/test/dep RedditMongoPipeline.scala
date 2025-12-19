package com.reddit.recommender.test

//package com.reddit.recommender.storage
//
//import org.apache.spark.sql.SparkSession
//import org.apache.spark.SparkConf
//import scala.util.{Try, Success, Failure}
//import java.util.concurrent.atomic.AtomicBoolean
//
//object RedditMongoPipeline {
//  private val isShuttingDown = new AtomicBoolean(false)
//  private var processor: KafkaToMongoProcessor = _
//  private var spark: SparkSession = _
//
//  def main(args: Array[String]): Unit = {
//    println(" Starting Reddit Kafka → MongoDB Pipeline")
//
//    val config = if (args.length > 0 && args(0) == "--config") {
//      ConfigLoader.loadFromFile(args(1))
//    } else {
//      ConfigLoader.loadFromEnv()
//    }
//
//    setupShutdownHook()
//
//    val sparkConf = new SparkConf()
//      .setAppName("Reddit-Mongo-Processor")
//      .setIfMissing("spark.master", "local[*]")
//      .set("spark.sql.streaming.checkpointLocation", "/tmp/spark-checkpoints")
//      .set("spark.sql.streaming.schemaInference", "true")
//      .set("spark.ui.enabled", "false")
//
//    spark = SparkSession.builder()
//      .config(sparkConf)
//      .getOrCreate()
//
//    spark.sparkContext.setLogLevel("ERROR")
//
//    processor = new KafkaToMongoProcessor(spark, config)
//
//    try {
//      println("▶️  Starting processing (Ctrl+C to stop)...")
//      processor.start()
//    } catch {
//      case e: Exception =>
//        println(s" Pipeline failed: ${e.getMessage}")
//        cleanup()
//        System.exit(1)
//    }
//  }
//
//  private def setupShutdownHook(): Unit = {
//    Runtime.getRuntime.addShutdownHook(new Thread(() => {
//      if (isShuttingDown.compareAndSet(false, true)) {
//        println("\n🛑 Shutdown signal received")
//        cleanup()
//      }
//    }))
//  }
//
//  private def cleanup(): Unit = {
//    Try(processor.stop())
//    Try(if (spark != null) spark.stop())
//  }
//}