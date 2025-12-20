package com.reddit.recommender.analytics

import com.reddit.recommender.mongo.MongoConnection
import com.reddit.recommender.analytics.cms.CountMinSketch
import org.mongodb.scala.bson.Document

import scala.collection.mutable
import scala.concurrent.Await
import scala.concurrent.duration._
import scala.util.control.NonFatal

class TrendWindowTracker(
                          mongo: MongoConnection,
                          windowDays: Int,
                          bucketMillis: Long,
                          epsilon: Double,
                          delta: Double,
                          stopWordsPath: String
                        ) extends Serializable {

  private val windowMillis = windowDays * 24L * 60 * 60 * 1000
  private val stopWords = StopWordsLoader.load(stopWordsPath)

  private val sketches = mutable.LinkedHashMap[Long, CountMinSketch]()
  private val termsSeen = mutable.LinkedHashSet[String]()
  private val STATE_ID = "latest"

  @volatile private var lastTs = System.currentTimeMillis()

  init()

  // ---------- STREAM ----------
  def onMessage(json: String): Unit = {
    val ts = extractTs(json).getOrElse(System.currentTimeMillis())
    lastTs = math.max(lastTs, ts)

    val bucket = (ts / bucketMillis) * bucketMillis
    val sketch = sketches.getOrElseUpdate(bucket, new CountMinSketch(epsilon, delta))

    extractTerms(json).foreach { t =>
      termsSeen += t
      sketch.add(t)
    }

    cleanup(ts)
  }

  // ---------- SNAPSHOT ----------
  def snapshot(): Unit = {
    val from = lastTs - windowMillis

    
    val counts: Map[String, Long] =
      termsSeen.map { term =>
        val count =
          sketches.collect {
            case (bucket, sketch) if bucket >= from =>
              sketch.estimate(term)
          }.sum
        term -> count
      }.toMap

    if (counts.isEmpty) {
      save(Document(
        "_id" -> STATE_ID,
        "windowStart" -> from,
        "windowEnd" -> lastTs,
        "bucketSizeMillis" -> bucketMillis,
        "threshold" -> 0L,
        "trends" -> List(
          Document("key" -> "no_data_yet", "count" -> 0L)
        ),
        "updatedAt" -> System.currentTimeMillis()
      ))
      return
    }

 
    val baseThreshold = 3L
    val maxCount = counts.values.max
    val dynamicThreshold =
      math.max(baseThreshold, (maxCount * 0.05).toLong)

   
    val trends =
      counts
        .filter { case (_, count) => count >= dynamicThreshold }
        .toList
        .sortBy(-_._2)
        .map { case (term, count) =>
          Document("key" -> s"term:$term", "count" -> count)
        }

   
    val trendsSafe =
      if (trends.nonEmpty) trends
      else List(
        Document("key" -> "no_trends_yet", "count" -> 0L)
      )

   
    save(Document(
      "_id" -> STATE_ID,
      "windowStart" -> from,
      "windowEnd" -> lastTs,
      "bucketSizeMillis" -> bucketMillis,
      "threshold" -> dynamicThreshold,
      "trends" -> trendsSafe,
      "updatedAt" -> System.currentTimeMillis()
    ))
  }




  // ---------- HELPERS ----------
  private def cleanup(now: Long): Unit =
    sketches.keys.takeWhile(_ < now - windowMillis).foreach(sketches.remove)

  private def extractTerms(json: String): List[String] =
    extractField(json, List("title", "body", "selftext"))
      .map(_.toLowerCase
        .replaceAll("""https?://\S+""", " ")
        .replaceAll("""[^a-z\s]""", " ")
        .split("\\s+")
        .toList
        .filter(w => w.length >= 3 && !stopWords.contains(w))
      ).getOrElse(Nil)

  private def extractTs(json: String): Option[Long] =
    extractField(json, List("created_utc")).flatMap(s => safeLong(s).map(_ * 1000))

  private def safeLong(s: String): Option[Long] =
    try Some(s.toLong) catch { case _: Throwable => None }

  private def extractField(json: String, keys: List[String]): Option[String] =
    keys.view.flatMap { k =>
      (""""""" + k + """"\s*:\s*"([^"]+)"""").r.findFirstMatchIn(json).map(_.group(1))
    }.headOption

  private def save(doc: Document): Unit =
    try {
      Await.result(
        mongo.getCollection("count_min_sketch")
          .updateOne(
            Document("_id" -> STATE_ID),
            Document("$set" -> doc),
            new org.mongodb.scala.model.UpdateOptions().upsert(true)
          ).toFuture(),
        10.seconds
      )
    } catch { case NonFatal(_) => () }

  private def init(): Unit = ()
}
