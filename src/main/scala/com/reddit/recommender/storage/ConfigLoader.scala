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
    val mongoUri = sys.env.getOrElse("MONGO_URI", "mongodb://localhost:27017")
    val mongoDb = sys.env.getOrElse("MONGO_DB", "reddit_recommender")
    val mongoUser = sys.env.get("MONGO_USER")
    val mongoPass = sys.env.get("MONGO_PASSWORD")

    val kafkaBootstrap = sys.env.getOrElse("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

    val config = AppConfig(
      mongo = MongoConfig(mongoUri, mongoDb, mongoUser, mongoPass),
      kafka = KafkaConfig(kafkaBootstrap)
    )

    validateConfig(config)
    config
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
    require(config.mongo.uri.startsWith("mongodb://"),
      s"Invalid MongoDB URI: must start with 'mongodb://'")
    require(config.mongo.database.nonEmpty, "MongoDB database name cannot be empty")

    // Kafka validation
    require(config.kafka.bootstrapServers.nonEmpty, "Kafka bootstrap servers cannot be empty")

    // Topics validation
    require(config.topics.nonEmpty, "At least one Kafka topic must be specified")
    require(config.topics.forall(_.nonEmpty), "Kafka topic names cannot be empty")

    println("✅ Configuration validated successfully")
  }
}

//package com.reddit.recommender.storage
//
//import io.circe.generic.auto._
//import io.circe.parser._
//
//import java.io.File
//import scala.io.Source
//
//case class MongoConfig(
//                        uri: String,
//                        database: String,
//                        username: Option[String],
//                        password: Option[String]
//                      )
//
//case class KafkaConfig(
//                        bootstrapServers: String,
//                        groupId: String = "reddit-mongo-processor"
//                      )
//
//
//case class AppConfig(
//                      mongo: MongoConfig,
//                      kafka: KafkaConfig,
//                      topics: List[String] = List("reddit-posts", "reddit-comments"),
//                      featureExtractor: Option[FeatureExtractorConfig] = None
//                    )
//
//object ConfigLoader {
//
//  def loadFromEnv(): AppConfig = {
//    val mongoUri = sys.env.getOrElse("MONGO_URI", "mongodb://localhost:27017")
//    val mongoDb = sys.env.getOrElse("MONGO_DB", "reddit_recommender")
//    val mongoUser = sys.env.get("MONGO_USER")
//    val mongoPass = sys.env.get("MONGO_PASSWORD")
//
//    val kafkaBootstrap = sys.env.getOrElse("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
//
//    AppConfig(
//      mongo = MongoConfig(mongoUri, mongoDb, mongoUser, mongoPass),
//      kafka = KafkaConfig(kafkaBootstrap)
//    )
//  }
//
//  def loadFromFile(path: String = "config.json"): AppConfig = {
//    val source = Source.fromFile(new File(path))
//    val configJson = source.mkString
//    source.close()
//
//    decode[AppConfig](configJson) match {
//      case Right(config) => config
//      case Left(error) => throw new RuntimeException(s"Failed to parse config: $error")
//    }
//  }
//
//  // Add to ConfigLoader.scala
//  def loadFromFileWithFeatureConfig(configPath: String, featurePath: String): AppConfig = {
//    val baseConfig = loadFromFile(configPath)
//
//    val featureSource = Source.fromFile(new File(featurePath))
//    val featureJson = featureSource.mkString
//    featureSource.close()
//
//    decode[FeatureExtractorConfig](featureJson) match {
//      case Right(featureConfig) => baseConfig.copy(featureExtractor = Some(featureConfig))
//      case Left(error) => throw new RuntimeException(s"Failed to parse feature config: $error")
//    }
//  }
//}