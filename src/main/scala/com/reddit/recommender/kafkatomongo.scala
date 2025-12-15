// File: src/main/scala/com/reddit/recommender/examples/KafkaToMongoOnly.scala
package com.reddit.recommender.examples

import com.reddit.recommender.storage.{AppConfig, KafkaConfig, MongoConfig, KafkaToMongoProcessor}
import org.apache.spark.sql.SparkSession

object KafkaToMongoOnly {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("Kafka-to-MongoDB-Only")
      .master("local[*]")
      .config("spark.sql.streaming.checkpointLocation", "C:/tmp/checkpoints/kafka-mongo-only")
      .getOrCreate()

    val config = AppConfig(
      mongo = MongoConfig("${sys.env.getOrElse(\"MONGO_URI\", \"mongodb://localhost:27017\")}", "reddit_custom", None, None),
      kafka = KafkaConfig("localhost:9092"),
      topics = List("reddit-posts", "reddit-comments")
    )

    val processor = new KafkaToMongoProcessor(spark, config)
    processor.start()

    println("Kafka → MongoDB running... Press Enter to stop.")
    scala.io.StdIn.readLine()
    processor.stop()
    spark.stop()
  }
}