package com.reddit.recommender.api

import scala.io.Source

class ApifyConfig(private val apiToken: String, private val actorId: String) {

  def this() = this({
    val (token, _) = ApifyConfig.loadFromEnv()
    token
  }, {
    val (_, actor) = ApifyConfig.loadFromEnv()
    actor
  })

  def getApiToken: String = apiToken

  def getActorId: String = actorId

  def getApiActorId: String = actorId.replace("/", "~")
}

object ApifyConfig {

  private def loadFromEnv(): (String, String) = {
    var source: Source = null
    try {
      source = Source.fromFile(".env")
      val lines = source.getLines().map(_.trim).toList

      val token = findValue(lines, "APIFY_API_TOKEN")
      val actor = findValue(lines, "APIFY_REDDIT_ACTOR_ID")

      if (token.isEmpty || actor.isEmpty) {
        throw new RuntimeException("Missing APIFY_API_TOKEN or APIFY_REDDIT_ACTOR_ID in .env file")
      }

      (token, actor)
    } catch {
      case e: Exception =>
        throw new RuntimeException("Failed to load .env file: " + e.getMessage, e)
    } finally {
      if (source != null) {
        source.close()
      }
    }
  }

  private def findValue(lines: List[String], key: String): String = {
    val prefix = key + "="
    lines
      .find { line => line.startsWith(prefix) }
      .map { line => line.substring(prefix.length) }
      .getOrElse("")
  }
}