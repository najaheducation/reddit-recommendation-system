package com.reddit.recommender.ingestion

import com.reddit.recommender.api.{ApifyClient, ScraperParameters}
import com.reddit.recommender.kafka.SimpleKafkaProducer
import org.json.{JSONArray, JSONObject}

class ApifyToKafkaService(apifyClient: ApifyClient = new ApifyClient()) {
  def this() = this(new ApifyClient())// ← THIS LINE FIXES THE JAVA CALL


  private var kafkaProducer: SimpleKafkaProducer = _


  def execute(config: ScrapeConfig): ScrapeResult = {
    val result = new ScrapeResult()
    kafkaProducer = new SimpleKafkaProducer()

    try {
      // Process subreddits
      config.getSubreddits.forEach { subreddit =>
        processSource(result, "r/" + subreddit, createSubredditParams(subreddit, config))
        delay(config.getDelayBetweenSourcesMs)
      }

      // Process keywords
      config.getKeywords.forEach { keyword =>
        processSource(result, "keyword:" + keyword, createKeywordParams(keyword, config))
        delay(config.getDelayBetweenSourcesMs)
      }

      // Process URLs
      config.getUrls.forEach { url =>
        processSource(result, "url:" + url, createUrlParams(url, config))
        delay(config.getDelayBetweenSourcesMs)
      }

    } finally {
      if (kafkaProducer != null) {
        kafkaProducer.flush()
        kafkaProducer.close()
      }
      result.complete()
    }

    result
  }


  def executeWithRetry(config: ScrapeConfig): ScrapeResult = {
    for (attempt <- 1 to config.getMaxRetries) {
      try {
        println(s"Attempt $attempt of ${config.getMaxRetries}")
        return execute(config)
      } catch {
        case e: Exception =>
          if (attempt == config.getMaxRetries) {
            throw new RuntimeException(s"Failed after ${config.getMaxRetries} attempts", e)
          }

          val backoffTime = 5000L * attempt
          System.err.println(s"Attempt $attempt failed: ${e.getMessage}")
          System.err.println(s"Retrying in ${backoffTime / 1000} seconds...")
          delay(backoffTime)
      }
    }

    throw new IllegalStateException("Should not reach here")
  }

  // Process a single source (subreddit, keyword, or URL)

  private def processSource(result: ScrapeResult, source: String, params: JSONObject): Unit = {
    try {
      println(s"\nProcessing: $source")

      // Scrape data from Apify
      val scrapedData = scrapeWithRetry(source, params, 3)

      // Send to Kafka
      var postsSent = 0
      var commentsSent = 0

      var i = 0
      while (i < scrapedData.length()) {
        val item = scrapedData.getJSONObject(i)

        if (isPost(item)) {
          kafkaProducer.sendPost(item)
          postsSent += 1
        } else if (isComment(item)) {
          kafkaProducer.sendComment(item)
          commentsSent += 1
        }

        // Small batch flush every 10 items
        if ((postsSent + commentsSent) % 10 == 0) {
          kafkaProducer.flush()
        }

        i += 1
      }

      kafkaProducer.flush()
      result.addSuccess(source, postsSent, commentsSent)

      println(f"✓ $source%s: $postsSent%d posts, $commentsSent%d comments")

    } catch {
      case e: Exception =>
        result.addFailure(source, e.getMessage)
        System.err.println("✗ " + source + ": " + e.getMessage)
    }
  }

  //Scrape with retry logic

  @throws(classOf[Exception])
  private def scrapeWithRetry(source: String, params: JSONObject, maxRetries: Int): JSONArray = {
    var lastException: Exception = null

    for (i <- 0 until maxRetries) {
      try {
        return apifyClient.scrapeReddit(params)
      } catch {
        case e: Exception =>
          lastException = e
          if (i < maxRetries - 1) {
            System.err.println(s"Retry ${i + 1} for $source")
            delay(2000L * (i + 1))
          }
      }
    }

    throw new RuntimeException(s"Failed to scrape $source after $maxRetries attempts", lastException)
  }

  /**
   * Create parameters for subreddit scraping — now respects full config
   */
  private def createSubredditParams(subreddit: String, config: ScrapeConfig): JSONObject = {
    new ScraperParameters()
      .addUrl(s"https://www.reddit.com/r/$subreddit/")
      .setMaxPosts(config.getPostsPerSource)
      .setMaxComments(config.getMaxCommentsPerPost)
      .setScrapeComments(config.isScrapeComments)
      .setTimeframe(config.getTimeframe)
      .setSort(config.getSort)
      .build()
  }

  // Create parameters for keyword search
  private def createKeywordParams(keyword: String, config: ScrapeConfig): JSONObject = {
    new ScraperParameters()
      .addQuery(keyword)
      .setMaxPosts(config.getPostsPerSource)
      .setMaxComments(config.getMaxCommentsPerPost)
      .setScrapeComments(config.isScrapeComments)
      .setTimeframe(config.getTimeframe)
      .setSort(config.getSort)
      .build()
  }

  // Create parameters for specific URL
  private def createUrlParams(url: String, config: ScrapeConfig): JSONObject = {
    new ScraperParameters()
      .addUrl(url)
      .setMaxPosts(config.getPostsPerSource)
      .setMaxComments(config.getMaxCommentsPerPost)
      .setScrapeComments(config.isScrapeComments)
      .setTimeframe(config.getTimeframe)
      .setSort(config.getSort)
      .build()
  }

  private def isPost(item: JSONObject): Boolean = item.has("title") && item.has("subreddit")

  private def isComment(item: JSONObject): Boolean = item.has("body") && item.has("parentId")

  private def delay(milliseconds: Long): Unit = {
    if (milliseconds <= 0) return

    try {
      Thread.sleep(milliseconds)
    } catch {
      case _: InterruptedException =>
        Thread.currentThread.interrupt()
    }
  }
}