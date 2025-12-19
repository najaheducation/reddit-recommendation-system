package com.reddit.recommender.mongo

import com.reddit.recommender.storage.MongoConfig
import org.mongodb.scala.bson.Document
import org.mongodb.scala.connection.{ClusterSettings, SocketSettings}
import org.mongodb.scala.{ConnectionString, MongoClient, MongoClientSettings, MongoCollection, MongoDatabase}

import java.util.concurrent.TimeUnit
import scala.concurrent.Await
import scala.concurrent.duration._
import scala.util.{Failure, Success, Try}

class MongoConnection(config: MongoConfig) {
  private var client: MongoClient = _
  private var database: MongoDatabase = _
  private var isConnected: Boolean = false

  def connect(): Unit = {
    if (!isConnected) {
      val connectionString = buildConnectionString()

      val settings = MongoClientSettings.builder()
        .applyConnectionString(new ConnectionString(connectionString))
        .applyToClusterSettings((builder: ClusterSettings.Builder) => {
          builder.serverSelectionTimeout(10, TimeUnit.SECONDS)
        })
        .applyToSocketSettings((builder: SocketSettings.Builder) => {
          builder.connectTimeout(10, TimeUnit.SECONDS)
          builder.readTimeout(30, TimeUnit.SECONDS)
        })
        .build()

      client = MongoClient(settings)
      database = client.getDatabase(config.database)

      // Test connection
      Try {
        Await.result(database.runCommand(Document("ping" -> 1)).toFuture(), 5.seconds)
      } match {
        case Success(_) =>
          isConnected = true
          println(s"Connected to MongoDB: ${config.database}")
        case Failure(e) =>
          throw new RuntimeException(s"Failed to connect to MongoDB: ${e.getMessage}")
      }
    }
  }


  private def buildConnectionString(): String = {
    val baseUri = config.uri

    (config.username, config.password) match {
      case (Some(user), Some(pass)) =>
        val uriWithoutProtocol = baseUri.replaceFirst("mongodb://", "")
        val authPart = s"$user:$pass@"
        s"mongodb://$authPart$uriWithoutProtocol"
      case _ => baseUri
    }
  }

  def getDatabase: MongoDatabase = {
    if (!isConnected) connect()
    database
  }

  def getCollection(name: String): MongoCollection[Document] = {
    if (!isConnected) connect()
    database.getCollection(name)
  }

  def close(): Unit = {
    if (client != null) {
      Try(client.close())
      isConnected = false
    }
  }
}
