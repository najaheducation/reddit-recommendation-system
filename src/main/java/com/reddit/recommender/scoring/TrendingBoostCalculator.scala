package com.reddit.recommender.scoring

object TrendingBoostCalculator {

  def compute(sketch: CountMinSketch, title: String): Double = {
    val freq = sketch.estimate(title)
    math.log(freq + 1)
  }
}
