package com.reddit.recommender.scoring

import java.time.{Duration, Instant}

object TimeScoreCalculator {

  def compute(createdUtc: Instant): Double = {
    if (createdUtc == null) {

      return 0.5
    }

    val ageSeconds =
      try Duration.between(createdUtc, Instant.now()).getSeconds
      catch { case _: Throwable => return 0.5 }

    val hours = ageSeconds / 3600.0
    math.exp(-hours / 12.0)
  }
}
