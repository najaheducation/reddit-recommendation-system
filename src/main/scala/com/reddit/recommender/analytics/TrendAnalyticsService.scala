package com.reddit.recommender.analytics

import com.reddit.recommender.mongo.MongoConnection

class TrendAnalyticsService(
                             mongo: MongoConnection,
                             stopWordsPath: String,
                             windowDays: Int = 7,
                             bucketMillis: Long = 5L * 60L * 1000L,
                             epsilon: Double = 0.001,
                             delta: Double = 1e-5
                           ) extends Serializable {

  @transient private lazy val tracker =
    new TrendWindowTracker(
      mongo = mongo,
      windowDays = windowDays,
      bucketMillis = bucketMillis,
      epsilon = epsilon,
      delta = delta,
      stopWordsPath = stopWordsPath
    )

  /** called for every incoming Kafka message */
  def onMessage(json: String): Unit =
    tracker.onMessage(json)

  /** called once per micro-batch */
  def snapshot(): Unit =
    tracker.snapshot()
}
