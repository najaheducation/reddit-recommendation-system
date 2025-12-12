
package com.reddit.recommender.domain

import java.time.Instant

final case class TrendingTopic(
         topic: String,
         approxCount: Long,
         windowStart: Instant,
         windowEnd: Instant


                              )
