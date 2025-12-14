package com.reddit.recommender.api

import java.nio.file.{Files, Paths}
import scala.collection.JavaConverters._

class ApifyConfig(apiToken: String, actorId: String) {

  def this() = this({
    val (token, actor) = ApifyConfig.loadFromEnv()
    token
  }, {
    val (token, actor) = ApifyConfig.loadFromEnv()
    actor
  })

  def getApiToken: String = apiToken
  def getActorId: String = actorId
  def getApiActorId: String = actorId.replace("/", "~")
}

object ApifyConfig {
  private def loadFromEnv(): (String, String) = {
    try {
      val envContent = Files.lines(Paths.get(".env"))
        .iterator()
        .asScala
        .mkString("\n")

      val token = extractValue(envContent, "APIFY_API_TOKEN")
      val actor = extractValue(envContent, "APIFY_REDDIT_ACTOR_ID")

      if (token == null || actor == null) {
        throw new RuntimeException("Missing APIFY_API_TOKEN or APIFY_REDDIT_ACTOR_ID in .env")
      }

      (token, actor)
    } catch {
      case e: Exception =>
        throw new RuntimeException("Failed to load configuration: " + e.getMessage, e)
    }
  }

  private def extractValue(envContent: String, key: String): String = {
    if (envContent == null) return null

    envContent.split("\n")
      .find(_.startsWith(key + "="))
      .map(_.substring(key.length + 1).trim)
      .orNull
  }
}