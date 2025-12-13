package com.reddit.recommender.scoring

import java.time.Instant
import com.reddit.recommender.domain.RedditPost

object ScoreCalculator {

  def computeScore(
                    post: RedditPost,
                    prefs: Map[String, Double],
                    sketch: CountMinSketch
                  ): Double = {

    val safeCreated = Option(post.createdUtc).getOrElse(Instant.now())
    val safeTitle = Option(post.title).getOrElse("")
    val safeBody  = Option(post.body).getOrElse("")

    val safeScore = post.score
    val safeComments = post.numComments

    sketch.add(safeTitle)

    val baseTime = TimeScoreCalculator.compute(safeCreated)
    val engagement = UserEngagementCalculator.compute(safeScore, safeComments)
    val commentActivity = CommentActivityCalculator.compute(safeComments)

    val ageHours =
      (Instant.now().toEpochMilli - safeCreated.toEpochMilli) / 3600000.0

    val upvoteVelocity =
      UpvoteVelocityCalculator.compute(safeScore, ageHours)

    val trending =
      TrendingBoostCalculator.compute(sketch, safeTitle)

    val preferenceMatch =
      PreferenceMatchCalculator.compute(safeTitle, safeBody, prefs)

    ScoreAggregator.aggregate(
      baseTime,
      engagement,
      commentActivity,
      upvoteVelocity,
      trending,
      preferenceMatch
    )
  }
}
