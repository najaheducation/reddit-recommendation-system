package com.reddit.recommender.scoring

object TrendingBoostCalculator {
  def compute(topicCount: Long, globalAverage: Double): Double = {
    if (globalAverage <= 0.0) 0.0
    else {
      val ratio = topicCount.toDouble / globalAverage
      val value = math.tanh(ratio - 1.0)
      math.max(0.0, value)
    }
  }
}
