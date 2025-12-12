package com.reddit.recommender.scoring

object UserEngagementCalculator {
  def compute(likedByUser: Boolean, commentedByUser: Boolean): Double = {
    var value = 0.0
    if (likedByUser) value += 0.6
    if (commentedByUser) value += 0.4
    value
  }
}
