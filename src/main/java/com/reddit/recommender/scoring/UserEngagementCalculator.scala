package com.reddit.recommender.scoring

object UserEngagementCalculator {

  def compute(score: Int, numComments: Int): Double = {
    val engagement = score * 0.7 + numComments * 0.3
    math.log(engagement + 1)
  }
}
