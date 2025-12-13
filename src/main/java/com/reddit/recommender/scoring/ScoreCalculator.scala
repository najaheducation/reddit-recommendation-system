package com.reddit.recommender.scoring

import java.time.Instant
import com.reddit.recommender.domain.RedditPost

object ScoreCalculator {

  def computeScore(
                    post: RedditPost,
                    prefs: Map[String, Double],
                    sketch: CountMinSketch
                  ): Double = {

    val safeCreated   = Option(post.createdUtc).getOrElse(Instant.now())
    val safeScore     = post.score.getOrElse(0)
    val safeComments  = post.numComments.getOrElse(0)
    val safeTitle     = Option(post.title).getOrElse("")
    val safeBody      = Option(post.body).getOrElse("")

    sketch.add(safeTitle)

    val baseTime        = TimeScoreCalculator.compute(safeCreated)
    val engagement      = UserEngagementCalculator.compute(safeScore, safeComments)
    val commentActivity = CommentActivityCalculator.compute(safeComments)
    val upvoteVelocity  = UpvoteVelocityCalculator.compute(
      safeScore,
      (Instant.now.toEpochMilli - safeCreated.toEpochMilli) / 3600000.0
    )
    val trending        = TrendingBoostCalculator.compute(sketch, safeTitle)
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
