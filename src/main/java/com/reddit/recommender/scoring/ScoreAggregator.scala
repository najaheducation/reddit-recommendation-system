package com.reddit.recommender.scoring

import com.reddit.recommender.domain.{PostScore, RedditPost, UserPreference}
import java.time.Instant

object ScoreAggregator {

  def compute(
               post: RedditPost,
               pref: UserPreference,
               topicCount: Long,
               globalAverage: Double,
               now: Instant = Instant.now()
             ): PostScore = {

    val timeScore = TimeScoreCalculator.compute(post.createdUtc, now)
    val upvoteVelocityScore = UpvoteVelocityCalculator.compute(post.score, post.createdUtc, now)
    val commentActivityScore = CommentActivityCalculator.compute(post.numComments)
    val engagementScore = UserEngagementCalculator.compute(post.likedByUser, post.commentedByUser)
    val interestMatchScore = PreferenceMatchCalculator.compute(pref, post)
    val trendingBoostScore = TrendingBoostCalculator.compute(topicCount, globalAverage)

    val w = pref.weights

    val weightedSum =
      timeScore * w.time +
        upvoteVelocityScore * w.upvotes +
        commentActivityScore * w.comments +
        engagementScore * w.engagement +
        interestMatchScore * w.interest +
        trendingBoostScore * w.trending

    val totalWeight = w.time + w.upvotes + w.comments + w.engagement + w.interest + w.trending
    val finalScore = if (totalWeight > 0) weightedSum / totalWeight else 0.0

    PostScore(
      timeScore = timeScore,
      upvoteVelocityScore = upvoteVelocityScore,
      commentActivityScore = commentActivityScore,
      engagementScore = engagementScore,
      interestMatchScore = interestMatchScore,
      trendingBoostScore = trendingBoostScore,
      finalScore = finalScore
    )
  }
}