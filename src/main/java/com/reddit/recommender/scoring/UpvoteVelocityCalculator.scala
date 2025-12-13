package com.reddit.recommender.scoring

object UpvoteVelocityCalculator {

  def compute(score: Int, ageHours: Double): Double = {
    if (ageHours <= 0) return score.toDouble
    math.log(score + 1) / math.log(ageHours + 2)
  }
}
