package com.reddit.recommender.domain

final case class PostScore(
       timeScore: Double,
       upvoteVelocityScore: Double,
       commentActivityScore: Double,
       engagementScore: Double,
       interestMatchScore: Double,
       trendingBoostScore: Double,
       finalScore: Double
                          )