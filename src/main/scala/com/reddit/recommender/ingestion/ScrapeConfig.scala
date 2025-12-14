package com.reddit.recommender.ingestion

import scala.collection.JavaConverters._
import scala.collection.mutable.ListBuffer
import scala.annotation.varargs

class ScrapeConfig private (
                             private val subreddits: List[String],
                             private val keywords: List[String],
                             private val urls: List[String],
                             private val postsPerSource: Int,
                             private val maxCommentsPerPost: Int,
                             private val scrapeComments: Boolean,
                             private val timeframe: String,
                             private val sort: String,
                             private val includeNsfw: Boolean,
                             private val maxRetries: Int,
                             private val delayBetweenSourcesMs: Long
                           ) {
  def getSubreddits: java.util.List[String] = subreddits.asJava
  def getKeywords: java.util.List[String] = keywords.asJava
  def getUrls: java.util.List[String] = urls.asJava
  def getPostsPerSource: Int = postsPerSource
  def getMaxCommentsPerPost: Int = maxCommentsPerPost
  def isScrapeComments: Boolean = scrapeComments
  def getTimeframe: String = timeframe
  def getSort: String = sort
  def isIncludeNsfw: Boolean = includeNsfw
  def getMaxRetries: Int = maxRetries
  def getDelayBetweenSourcesMs: Long = delayBetweenSourcesMs
}

object ScrapeConfig {
  class Builder {
    private val subreddits = ListBuffer[String]()
    private val keywords = ListBuffer[String]()
    private val urls = ListBuffer[String]()
    private var postsPerSource: Int = 10
    private var maxCommentsPerPost: Int = 5
    private var scrapeComments: Boolean = false
    private var timeframe: String = "day"
    private var sort: String = "relevance"
    private var includeNsfw: Boolean = false
    private var maxRetries: Int = 3
    private var delayBetweenSourcesMs: Long = 2000L

    // Varargs version — matches Java: replaces the list
    @varargs
    def subreddits(subs: String*): Builder = {
      subreddits.clear()
      subreddits ++= subs
      this
    }

    @varargs
    def keywords(keys: String*): Builder = {
      keywords.clear()
      keywords ++= keys
      this
    }

    @varargs
    def urls(us: String*): Builder = {
      urls.clear()
      urls ++= us
      this
    }


    def subreddits(subs: java.util.List[String]): Builder = {
      subreddits.clear()
      subreddits ++= subs.asScala
      this
    }



    def postsPerSource(p: Int): Builder = {
      if (p < 10 || p > 30)
        throw new IllegalArgumentException("postsPerSource must be between 10 and 30")
      postsPerSource = p
      this
    }

    def maxCommentsPerPost(m: Int): Builder = { maxCommentsPerPost = m; this }
    def scrapeComments(s: Boolean): Builder = { scrapeComments = s; this }
    def timeframe(t: String): Builder = { timeframe = t; this }
    def sort(s: String): Builder = { sort = s; this }
    def includeNsfw(i: Boolean): Builder = { includeNsfw = i; this }
    def maxRetries(m: Int): Builder = { maxRetries = m; this }
    def delayBetweenSourcesMs(d: Long): Builder = { delayBetweenSourcesMs = d; this }

    def build(): ScrapeConfig = {
      if (subreddits.isEmpty && keywords.isEmpty && urls.isEmpty)
        throw new IllegalStateException("At least one source (subreddits, keywords, or urls) must be specified")

      new ScrapeConfig(
        subreddits.toList,
        keywords.toList,
        urls.toList,
        postsPerSource,
        maxCommentsPerPost,
        scrapeComments,
        timeframe,
        sort,
        includeNsfw,
        maxRetries,
        delayBetweenSourcesMs
      )
    }
  }

  def trendingTechConfig(): ScrapeConfig = new Builder()
    .subreddits("programming", "technology", "gaming", "MachineLearning", "datascience")
    .postsPerSource(10)
    .timeframe("month")
    .sort("new")
    .scrapeComments(true)
    .maxCommentsPerPost(1)
    .build()

  def newsMonitoringConfig(): ScrapeConfig = new Builder()
    .keywords("news", "breaking", "update")
    .subreddits("worldnews", "news", "politics")
    .postsPerSource(100)
    .timeframe("hour")
    .sort("new")
    .scrapeComments(true)
    .maxCommentsPerPost(3)
    .build()


  @varargs
  def competitorMonitoringConfig(competitorNames: String*): ScrapeConfig = new Builder()
    .keywords(competitorNames: _*)
    .postsPerSource(20)
    .timeframe("week")
    .sort("relevance")
    .scrapeComments(true)
    .maxCommentsPerPost(5)
    .build()
}