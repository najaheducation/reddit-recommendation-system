package com.reddit.recommender.scoring

import java.time.{Duration, Instant}

object TimeScoreCalculator {
  def compute(createdAt: Instant, now: Instant = Instant.now()): Double = {
    if (createdAt == null) 0.0
    else {
      val hours = math.max(1.0, Duration.between(createdAt, now).toHours.toDouble)
      1.0 / (1.0 + math.log10(hours + 1.0))
    }
  }
}
