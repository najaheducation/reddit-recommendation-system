package com.reddit.recommender.processing

import com.reddit.recommender.domain.{PostScore, RedditPost, UserPreference, UserWeights}
import com.reddit.recommender.scoring.ScoreAggregator
import com.reddit.recommender.storage.{PostgresReader, PostgresWriter}
import org.apache.spark.sql.SparkSession
import java.time.Instant

object BatchScoringJob {

  def main(args: Array[String]): Unit = {

    println("Starting Batch Scoring Job...")

    val spark = SparkSession.builder()
      .appName("RedditBatchScoring")
      .master("local[*]")
      .getOrCreate()

    try {
      val postgresReader = PostgresReader()
      val postgresWriter = PostgresWriter()

      val userId = "default_user"

      val userPref = postgresReader.loadUserPreference(userId).getOrElse {
        println("No user preference found, using default...")
        UserPreference(
          userId,
          UserWeights(5.0, 7.0, 4.0, 10.0, 9.0, 5.0),
          Map("programming" -> 10.0, "pc_building" -> 8.0, "cats" -> 3.0)
        )
      }

      println(s"Loaded user preference for: $userId")
      println(s"Weights: ${userPref.weights}")
      println(s"Topics: ${userPref.topicWeights}")

      val posts = postgresReader.loadPostsForScoring(100)

      println(s"Found ${posts.size} posts to score...")

      if (posts.isEmpty) {
        println("No posts to score. Loading all posts...")
        val allPosts = postgresReader.loadAllPosts(50)
        scorePosts(allPosts, userPref, postgresWriter)
      } else {
        scorePosts(posts, userPref, postgresWriter)
      }

      println("Batch scoring completed successfully!")

    } catch {
      case e: Exception =>
        println(s"Error in batch scoring: ${e.getMessage}")
        e.printStackTrace()
    } finally {
      spark.stop()
    }
  }

  private def scorePosts(
                          posts: List[RedditPost],
                          userPref: UserPreference,
                          postgresWriter: PostgresWriter
                        ): Unit = {

    val now = Instant.now()
    var successCount = 0
    var failCount = 0

    posts.foreach { post =>
      try {
        val topicCount = 50L
        val globalAverage = 100.0

        println(s"Scoring post: ${post.id} - ${post.title.take(30)}...")

        val score = ScoreAggregator.compute(
          post,
          userPref,
          topicCount,
          globalAverage,
          now
        )

        println(s"Post ${post.id} scores: time=${score.timeScore}, upvote=${score.upvoteVelocityScore}, final=${score.finalScore}")

        val success = postgresWriter.savePostWithScore(post, score)

        if (success) {
          successCount += 1
          println(s"✓ Successfully saved post: ${post.id}")
        } else {
          failCount += 1
          println(s"✗ Failed to save post: ${post.id}")
        }

      } catch {
        case e: Exception =>
          failCount += 1
          println(s"✗ Error scoring post ${post.id}: ${e.getMessage}")
      }
    }

    println(s"\n=== Scoring Summary ===")
    println(s"Total posts processed: ${posts.size}")
    println(s"Successfully scored: $successCount")
    println(s"Failed: $failCount")
  }
}