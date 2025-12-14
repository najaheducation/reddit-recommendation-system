package com.reddit.recommender.ingestion

import scala.collection.mutable

class ScrapeResult {
  private var totalPosts: Int = 0
  private var totalComments: Int = 0
  private var startTime: Long = System.currentTimeMillis()
  private var endTime: Long = 0L

  private val successfulSources = mutable.ListBuffer[String]()
  private val failedSources = mutable.Map[String, String]()
  private val postsBySubreddit = mutable.Map[String, Int]()
  private val commentsBySubreddit = mutable.Map[String, Int]()

  def addSuccess(source: String, posts: Int, comments: Int): ScrapeResult = {
    successfulSources += source
    totalPosts += posts
    totalComments += comments

    val subreddit = extractSubreddit(source)
    postsBySubreddit(subreddit) = postsBySubreddit.getOrElse(subreddit, 0) + posts
    if (comments > 0) {
      commentsBySubreddit(subreddit) = commentsBySubreddit.getOrElse(subreddit, 0) + comments
    }

    this
  }

  def addFailure(source: String, error: String): ScrapeResult = {
    failedSources(source) = error
    this
  }

  def complete(): ScrapeResult = {
    endTime = System.currentTimeMillis()
    this
  }

  private def extractSubreddit(source: String): String = {
    if (source.startsWith("r/")) source
    else if (source.contains("reddit.com/r/")) {
      val parts = source.split("/r/")
      if (parts.length > 1) {
        val sub = parts(1).split("/")(0)
        "r/" + sub
      } else source
    } else if (source.startsWith("keyword:")) source
    else source
  }


  def getTotalPosts: Int = totalPosts
  def getTotalComments: Int = totalComments
  def getDurationMs: Long = endTime - startTime
  def getPostsPerSecond: Double = {
    val duration = getDurationMs
    if (duration > 0) (totalPosts * 1000.0) / duration else 0.0
  }

  def getSuccessfulSources: List[String] = successfulSources.toList
  def getFailedSources: Map[String, String] = failedSources.toMap
  def getPostsBySubreddit: Map[String, Int] = postsBySubreddit.toMap
  def getCommentsBySubreddit: Map[String, Int] = commentsBySubreddit.toMap

  def getSummary: String = {
    f"Scrape completed in ${getDurationMs / 1000.0}%.2f seconds. Posts: $totalPosts%d, Comments: $totalComments%d, Success: ${successfulSources.size}%d, Failed: ${failedSources.size}%d"
  }

  def printReport(): Unit = {
    println("\n" + "=" * 50)
    println("SCRAPE REPORT")
    println("=" * 50)
    println(getSummary)
    printf("\nPosts per second: %.2f\n", getPostsPerSecond)

    if (postsBySubreddit.nonEmpty) {
      println("\nPosts by Subreddit:")
      postsBySubreddit.foreach { case (sub, count) =>
        printf("  %-20s: %d posts%n", sub, count.asInstanceOf[AnyRef])
      }
    }

    if (failedSources.nonEmpty) {
      println("\nFailed Sources:")
      failedSources.foreach { case (source, error) =>
        printf("  %-30s: %s%n", source, error)
      }
    }
    println("=" * 50)
  }
}










