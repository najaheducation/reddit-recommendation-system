package com.reddit.recommender.storage

import com.reddit.recommender.domain.PostScore
import org.apache.spark.sql.{Dataset, SparkSession}

case class UserInterest(
                         user_id: Int,
                         interest: String,
                         weight: Double
                       )

object PostgresReader {

  private val url = "jdbc:postgresql://localhost:5432/redditsrs"
  private val user = "postgres"
  private val password = "0569315404"
  private val driver = "org.postgresql.Driver"

  def readPostScores(spark: SparkSession): Dataset[PostScore] = {
    import spark.implicits._
    spark.read
      .format("jdbc")
      .option("url", url)
      .option("dbtable", "post_scores")
      .option("user", user)
      .option("password", password)
      .option("driver", driver)
      .load()
      .select(
        $"id",
        $"base_time_score".as("baseTimeScore"),
        $"engagement_score".as("engagementScore"),
        $"comment_activity_score".as("commentActivityScore"),
        $"upvote_velocity_score".as("upvoteVelocityScore"),
        $"trending_score".as("trendingScore"),
        $"preference_score".as("preferenceScore"),
        $"final_score".as("finalScore")
      )
      .as[PostScore]
  }

  def readUserInterests(spark: SparkSession): Dataset[UserInterest] = {
    import spark.implicits._
    spark.read
      .format("jdbc")
      .option("url", url)
      .option("dbtable", "user_interests")
      .option("user", user)
      .option("password", password)
      .option("driver", driver)
      .load()
      .as[UserInterest]
  }
}
