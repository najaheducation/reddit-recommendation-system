package com.reddit.recommender.consumer

import scala.io.Source


case class MongoConfig(
                        uri: String,
                        database: String,
                        username: Option[String] = None,
                        password: Option[String] = None
                      )

case class KafkaConfig(
                        bootstrapServers: String
                      )

case class AppConfig(
                      mongo: MongoConfig,
                      kafka: KafkaConfig,
                      topics: List[String] = List("reddit-posts", "reddit-comments")
                    )

object ConfigLoader {
  def loadFromEnv(): AppConfig = {
    val lines = try {
      Source.fromFile(".env").getLines().map(_.trim).filter(!_.startsWith("#")).toList
    } catch {
      case _: java.io.FileNotFoundException => List.empty
    }

    val mongoUri = getValue(lines, "MONGO_URI")
      .getOrElse(throw new RuntimeException("MONGO_URI missing in .env"))

    val mongoDb = getValue(lines, "MONGO_DB").getOrElse("reddit_recommender")

    val kafkaServers = getValue(lines, "KAFKA_BOOTSTRAP_SERVERS").getOrElse("localhost:9092")

    val config = AppConfig(
      mongo = MongoConfig(mongoUri, mongoDb),
      kafka = KafkaConfig(kafkaServers)
    )

    println("Config loaded from .env")
    config
  }

  private def getValue(lines: List[String], key: String): Option[String] = {
    val prefix = s"$key="
    lines.find(_.startsWith(prefix)).map(_.substring(prefix.length))
  }
}
