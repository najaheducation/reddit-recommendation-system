package com.reddit.recommender.storage

import io.circe.generic.auto._
import io.circe.parser._
import java.io.File
import scala.io.Source

case class MongoConfig(
                        uri: String,
                        database: String,
                        username: Option[String],
                        password: Option[String]
                      )

case class KafkaConfig(
                        bootstrapServers: String,
                        groupId: String = "reddit-mongo-processor"
                      )

case class AppConfig(
                      mongo: MongoConfig,
                      kafka: KafkaConfig,
                      topics: List[String] = List("reddit-posts", "reddit-comments"),
                      featureExtractor: Option[FeatureExtractorConfig] = None
                    )

object ConfigLoader {
  def loadFromEnv(): AppConfig = {
    var source: Source = null
    try {
      source = Source.fromFile(".env")
      val lines = source.getLines().map(_.trim).filter(!_.startsWith("#")).toList

      val mongoUri = findValue(lines, "MONGO_URI")
        .getOrElse(throw new RuntimeException("MONGO_URI is missing in .env file"))

      val mongoDb = findValue(lines, "MONGO_DB")
        .getOrElse("reddit_recommender")

      val mongoUser = findValue(lines, "MONGO_USER").filter(_.nonEmpty)
      val mongoPass = findValue(lines, "MONGO_PASSWORD").filter(_.nonEmpty)

      val kafkaBootstrap = findValue(lines, "KAFKA_BOOTSTRAP_SERVERS")
        .getOrElse("localhost:9092")

      val config = AppConfig(
        mongo = MongoConfig(mongoUri, mongoDb, mongoUser, mongoPass),
        kafka = KafkaConfig(kafkaBootstrap)
      )

      validateConfig(config)
      config

    } catch {
      case _: java.io.FileNotFoundException =>
        throw new RuntimeException(".env file not found. Falling back to defaults where possible.")
      case e: Exception =>
        throw new RuntimeException("Failed to load .env file: " + e.getMessage, e)
    } finally {
      if (source != null) source.close()
    }
  }

  private def findValue(lines: List[String], key: String): Option[String] = {
    val prefix = key + "="
    lines
      .find(_.startsWith(prefix))
      .map(_.substring(prefix.length).trim)
  }

  def loadFromFile(path: String = "config.json"): AppConfig = {
    val source = Source.fromFile(new File(path))
    val configJson = source.mkString
    source.close()

    decode[AppConfig](configJson) match {
      case Right(config) =>
        validateConfig(config)
        config
      case Left(error) =>
        throw new RuntimeException(s"Failed to parse config: $error")
    }
  }

  def loadFromFileWithFeatureConfig(configPath: String, featurePath: String): AppConfig = {
    val baseConfig = loadFromFile(configPath)

    val featureSource = Source.fromFile(new File(featurePath))
    val featureJson = featureSource.mkString
    featureSource.close()

    decode[FeatureExtractorConfig](featureJson) match {
      case Right(featureConfig) =>
        val config = baseConfig.copy(featureExtractor = Some(featureConfig))
        validateConfig(config)
        config
      case Left(error) =>
        throw new RuntimeException(s"Failed to parse feature config: $error")
    }
  }

  private def validateConfig(config: AppConfig): Unit = {
    // MongoDB validation
    require(config.mongo.uri.nonEmpty, "MongoDB URI cannot be empty")
    require(
      config.mongo.uri.startsWith("mongodb://") || config.mongo.uri.startsWith("mongodb+srv://"),
      "Invalid MongoDB URI: must start with 'mongodb://' or 'mongodb+srv://'"
    )
    require(config.mongo.database.nonEmpty, "MongoDB database name cannot be empty")

    // Kafka validation
    require(config.kafka.bootstrapServers.nonEmpty, "Kafka bootstrap servers cannot be empty")

    // Topics validation
    require(config.topics.nonEmpty, "At least one Kafka topic must be specified")
    require(config.topics.forall(_.nonEmpty), "Kafka topic names cannot be empty")

    println("✅ Configuration validated successfully")
  }
}
