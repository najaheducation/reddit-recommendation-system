package com.linkedin.recommender.api

import scala.io.Source

class ApifyConfig private (private val apiToken: String, private val actorId: String) {
  def this() = this(ApifyConfig.load().apiToken, ApifyConfig.load().actorId)

  def getApiToken: String = apiToken
  def getApiActorId: String = actorId.replace("/", "~")
}

object ApifyConfig {
  private def load(): ApifyConfig = {
    val lines = Source.fromFile(".env").getLines().map(_.trim).filter(!_.startsWith("#")).toList

    val token = findValue(lines, "APIFY_API_TOKEN")
    val actorId = findValue(lines, "APIFY_LINKEDIN_ACTOR_ID")

    if (token.isEmpty || actorId.isEmpty) {
      throw new RuntimeException("Missing APIFY_API_TOKEN or APIFY_LINKEDIN_ACTOR_ID in .env file")
    }

    new ApifyConfig(token, actorId)  
  }

  private def findValue(lines: List[String], key: String): String = {
    val prefix = s"$key="
    lines
      .find(_.startsWith(prefix))
      .map(_.substring(prefix.length).trim.stripPrefix("\"").stripSuffix("\"").stripPrefix("'").stripSuffix("'"))
      .getOrElse("")
  }
}
