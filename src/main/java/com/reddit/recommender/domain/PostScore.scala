package com.reddit.recommender.domain

case class PostScore(
                      id: String,
                      baseTimeScore: Double,
                      engagementScore: Double,
                      commentActivityScore: Double,
                      upvoteVelocityScore: Double,
                      trendingScore: Double,
                      preferenceScore: Double,
                      finalScore: Double
                    )
