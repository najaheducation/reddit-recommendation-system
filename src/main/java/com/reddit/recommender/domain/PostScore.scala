case class PostScore(
                      userId: Int,
                      id: String,
                      baseTimeScore: Double,
                      engagementScore: Double,
                      commentActivityScore: Double,
                      upvoteVelocityScore: Double,
                      trendingScore: Double,
                      preferenceScore: Double,
                      finalScore: Double
                    )
