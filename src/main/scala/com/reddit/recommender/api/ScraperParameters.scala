package com.reddit.recommender.api

import org.json.{JSONArray, JSONObject}
import java.util.{List => JList}
import scala.collection.JavaConverters._
class ScraperParameters {
  private val parameters = new JSONObject()

//default values
// those values are for mot depleting my credit
  parameters.put("maxPosts", 10)
  parameters.put("scrapeComments", false)
  parameters.put("includeNsfw", false)
  parameters.put("sort", "relevance")
  parameters.put("timeframe", "week")
  parameters.put("maxComments", 5)   




  //search for words or sentences
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
 // direct Reddit URL to scrape like post or subreddit
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
// max number of posts for the query on the api
  def setMaxPosts(maxPosts: Int): ScraperParameters = {
    parameters.put("maxPosts", maxPosts)
    this
  }

  def setMaxComments(maxComments: Int): ScraperParameters = {
    parameters.put("maxComments", maxComments)
    this
  }
//do I want comments or not?
  def setScrapeComments(scrapeComments: Boolean): ScraperParameters = {
    parameters.put("scrapeComments", scrapeComments)
    this
  }

  // this is only here as a concept, im not going to use this,
  // for posts that are regarded as not safe for work,
  // things that contain mature content
  // like violent videos are marked as not safe for work
   def setIncludeNsfw(includeNsfw: Boolean): ScraperParameters = {
     parameters.put("includeNsfw", includeNsfw)
     this
   }
  /** Accepted values:
   *   "relevance" , best match to query (default)
   *   "new"       , newest first
   *   "top"       , highest score
   *   "hot"       , trending
   *   "controversial" */
  def setSort(sort: String): ScraperParameters = {
    parameters.put("sort", sort)
    this
  }
  /** Sets time range for posts
   * Accepted values:
   *   "hour"
   *   "day"
   *   "week" (default)
   *   "month"
   *   "year"
   *   "all"
   */
  def setTimeframe(timeframe: String): ScraperParameters = {
    parameters.put("timeframe", timeframe)
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


  }}