package com.reddit.recommender.scoring

import java.time.{Duration, Instant}

object UpvoteVelocityCalculator {
  def compute(score: Int, createdAt: Instant, now: Instant = Instant.now()): Double = {
    if (createdAt == null) 0.0
    else {
      val hours = math.max(1.0, Duration.between(createdAt, now).toHours.toDouble)
      val velocity = score.toDouble / hours
      math.tanh(velocity / 50.0)
    }
  }
}
