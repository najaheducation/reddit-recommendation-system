package com.reddit.recommender.analytics

import com.reddit.recommender.mongo.MongoConnection
class TrendAnalyticsService(
                             mongoConnection: MongoConnection,
                             stopWordsPath: String,
                             windowDays: Int = 7,
                             bucketSizeMillis: Long = 5L * 60L * 1000L,
                             epsilon: Double = 0.001,
                             delta: Double = 1e-5
                           ) extends Serializable {

  @transient private lazy val tracker =
    new TrendWindowTracker(
      mongoConnection = mongoConnection,
      windowDays = windowDays,
      bucketSizeMillis = bucketSizeMillis,
      epsilon = epsilon,
      delta = delta,
      stopWordsPath = stopWordsPath
    )

  def onMessage(topic: String, json: String): Unit =
    tracker.onMessage(topic, json)

  def storeSnapshotAlways(topN: Int): Unit =
    tracker.storeSnapshotAlways(topN)
}
