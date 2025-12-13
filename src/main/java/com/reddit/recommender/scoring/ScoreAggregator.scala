package com.reddit.recommender.scoring

object ScoreAggregator {

  def aggregate(
                 base: Double,
                 engagement: Double,
                 comments: Double,
                 velocity: Double,
                 trending: Double,
                 preference: Double
               ): Double = {
    base * 0.3 +
      engagement * 0.2 +
      comments * 0.1 +
      velocity * 0.2 +
      trending * 0.1 +
      preference * 0.1
  }
}
