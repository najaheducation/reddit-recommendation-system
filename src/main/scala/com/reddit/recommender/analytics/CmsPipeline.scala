package com.reddit.recommender.analytics

import com.reddit.recommender.mongo.MongoConnection
import org.mongodb.scala.bson.Document

import scala.concurrent.Await
import scala.concurrent.duration._

/**
 * Facade over trend analytics (CMS-based).
 * Keeps Kafka/Spark layer clean.
 */
final class CmsPipeline(
                         mongo: MongoConnection,
                         stopWordsPath: String,
                         windowDays: Int = 7,
                         bucketMillis: Long = 5L * 60L * 1000L,
                         epsilon: Double = 0.001,
                         delta: Double = 1e-5,
                         topN: Int = 10
                       ) extends Serializable {

  @transient private lazy val analytics =
    new TrendAnalyticsService(
      mongo = mongo,
      stopWordsPath = stopWordsPath,
      windowDays = windowDays,
      bucketMillis = bucketMillis,
      epsilon = epsilon,
      delta = delta
    )

  /** called for every incoming Kafka message */
  def onMessage(json: String): Unit =
    analytics.onMessage(json)

  /** called once per micro-batch */
  def onBatchEnd(): Unit =
    analytics.snapshot()

  /** ensure indexes for CMS snapshots */
  def ensureIndexes(): Unit = {
    val col = mongo.getCollection("count_min_sketch")
    Await.result(col.createIndex(Document("_id" -> 1)).toFuture(), 10.seconds)
    Await.result(col.createIndex(Document("updatedAt" -> -1)).toFuture(), 10.seconds)
  }
}
