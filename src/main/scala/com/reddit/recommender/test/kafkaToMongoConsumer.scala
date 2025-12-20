// File: src/main/scala/com/reddit/recommender/examples/KafkaToMongoOnly.scala
package com.reddit.recommender.test

import com.reddit.recommender.consumer.{ConfigLoader, KafkaToMongoProcessor}
import org.apache.spark.sql.SparkSession

object KafkaToMongoOnly {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("Kafka-to-MongoDB-Only")
      .master("local[*]")
      .config("spark.sql.streaming.checkpointLocation", "C:/tmp/checkpoints/kafkaproducer-mongo-only")
      .getOrCreate()

    
    val config = ConfigLoader.loadFromEnv()

    val processor = new KafkaToMongoProcessor(spark, config)
    processor.start()

    println("Kafka → MongoDB running... Press Enter to stop.")
    scala.io.StdIn.readLine()
    processor.stop()
    spark.stop()
  }
}