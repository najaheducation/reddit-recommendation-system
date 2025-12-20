package com.reddit.recommender.analytics

import com.reddit.recommender.mongo.MongoConnection
import org.mongodb.scala.bson.Document

import scala.concurrent.Await
import scala.concurrent.duration._
//Facade design pat..
final class CmsPipeline(
                         mongoConnection: MongoConnection,
                         stopWordsPath: String,
                         windowDays: Int = 7,
                         bucketSizeMillis: Long = 5L * 60L * 1000L,
                         epsilon: Double = 0.001,
                         delta: Double = 1e-5,
                         topN: Int = 10
                       ) extends Serializable {

  @transient private lazy val trendService =
    new TrendAnalyticsService(
      mongoConnection = mongoConnection,
      stopWordsPath = stopWordsPath,
      windowDays = windowDays,
      bucketSizeMillis = bucketSizeMillis,
      epsilon = epsilon,
      delta = delta
    )

  /** called for every kafkaproducer message (post/comment) */
  def onMessage(topic: String, json: String): Unit =
    trendService.onMessage(topic, json)

  /** called once per micro-batch */
  def onBatchEnd(): Unit =
    trendService.storeSnapshotAlways(topN)

  /** CMS indexes only (keep KafkaToMongoProcessor clean) */
  def ensureIndexes(): Unit = {
    val cmsCol = mongoConnection.getCollection("count_min_sketch")
    Await.result(cmsCol.createIndex(Document("_id" -> 1)).toFuture(), 10.seconds)
    Await.result(cmsCol.createIndex(Document("updatedAt" -> -1)).toFuture(), 10.seconds)
  }
}
