package com.linkedin.recommender.api

import org.json.{JSONArray, JSONObject}
import java.util.{List => JList}
import scala.collection.JavaConverters._

class ScraperParameters {
  private val parameters = new JSONObject()

  // Default values for curious_coder/linkedin-jobs-scraper
  parameters.put("count", 50)

  def addUrl(url: String): ScraperParameters = {
    if (!parameters.has("urls")) {
      parameters.put("urls", new JSONArray())
    }
    parameters.getJSONArray("urls").put(url)
    this
  }

  def addUrls(urls: JList[String]): ScraperParameters = {
    if (!parameters.has("urls")) {
      parameters.put("urls", new JSONArray())
    }
    urls.asScala.foreach(parameters.getJSONArray("urls").put)
    this
  }

  def setCount(count: Int): ScraperParameters = {
    parameters.put("count", count)
    this
  }

  def build(): JSONObject = parameters
}

object ScraperParameters {
  def createJobSearchParameters(url: String, count: Int = 50): JSONObject = {
    new ScraperParameters()
      .addUrl(url)
      .setCount(count)
      .build()
  }
}
