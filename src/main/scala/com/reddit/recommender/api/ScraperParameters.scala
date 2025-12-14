package com.reddit.recommender.api

import org.json.{JSONArray, JSONObject}
import java.util.{List => JList}
import scala.collection.JavaConverters._
class ScraperParameters {
  private val parameters = new JSONObject()


  parameters.put("maxPosts", 10) //will be reset later this is only for testing to prevent depletion
  parameters.put("scrapeComments", false) //will be reset later this is only for testing to prevent depletion
  parameters.put("includeNsfw", false)
  parameters.put("sort", "relevance")
  parameters.put("timeframe", "month")


  def addQuery(query: String): ScraperParameters = {
    if (!parameters.has("queries")) {
      parameters.put("queries", new JSONArray())
    }
    parameters.getJSONArray("queries").put(query)
    this
  }

  def addQueries(queries: JList[String]): ScraperParameters = {
    if (!parameters.has("queries")) {
      parameters.put("queries", new JSONArray())
    }
    queries.asScala.foreach(parameters.getJSONArray("queries").put)
    this
  }

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

  def setMaxPosts(maxPosts: Int): ScraperParameters = {
    parameters.put("maxPosts", maxPosts)
    this
  }

  def setMaxComments(maxComments: Int): ScraperParameters = {
    parameters.put("maxComments", maxComments)
    this
  }

  def setScrapeComments(scrapeComments: Boolean): ScraperParameters = {
    parameters.put("scrapeComments", scrapeComments)
    this
  }

  // ill keep this sfw ◉‿◉ for the sake of my sanity
  // def setIncludeNsfw(includeNsfw: Boolean): ScraperParameters = {
  //   parameters.put("includeNsfw", includeNsfw)
  //   this
  // }

  def setSort(sort: String): ScraperParameters = {
    parameters.put("sort", sort)
    this
  }

  def setTimeframe(timeframe: String): ScraperParameters = {
    parameters.put("timeframe", timeframe)
    this
  }

  def setProxyConfiguration(proxyConfig: JSONObject): ScraperParameters = {
    parameters.put("proxyConfiguration", proxyConfig)
    this
  }

  def setCustomData(customData: JSONObject): ScraperParameters = {
    parameters.put("customData", customData)
    this
  }

  def clearQueries(): ScraperParameters = {
    if (parameters.has("queries")) {
      parameters.remove("queries")
    }
    this
  }

  def clearUrls(): ScraperParameters = {
    if (parameters.has("urls")) {
      parameters.remove("urls")
    }
    this
  }

  def build(): JSONObject = parameters
}

object ScraperParameters {
  def createSearchParameters(query: String, maxPosts: Int): JSONObject = {
    new ScraperParameters()
      .addQuery(query)
      .setMaxPosts(maxPosts)
      .build()
  }

  def createSubredditParameters(subreddit: String, maxPosts: Int): JSONObject = {
    val url = s"https://www.reddit.com/r/$subreddit/"
    new ScraperParameters()
      .addUrl(url)
      .setMaxPosts(maxPosts)
      .build()
  }

  def createAdvancedParameters(
                                queries: JList[String],
                                urls: JList[String],
                                maxPosts: Int,
                                scrapeComments: Boolean,
                                sort: String,
                                timeframe: String
                              ): JSONObject = {
    val builder = new ScraperParameters()
      .setMaxPosts(maxPosts)
      .setScrapeComments(scrapeComments)
      .setSort(sort)
      .setTimeframe(timeframe)

    if (queries != null) {
      builder.addQueries(queries)
    }

    if (urls != null) {
      builder.addUrls(urls)
    }

    builder.build()
  }
}
