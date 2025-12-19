package com.reddit.recommender.analytics

import com.reddit.recommender.mongo.MongoConnection
import org.mongodb.scala.bson.Document

import scala.collection.mutable
import scala.concurrent.Await
import scala.concurrent.duration._
import scala.util.control.NonFatal


class TrendWindowTracker(
                          mongoConnection: MongoConnection,
                          windowDays: Int,
                          bucketSizeMillis: Long,
                          epsilon: Double,
                          delta: Double,
                          stopWordsPath: String
                        ) extends Serializable {

  private val windowMillis: Long = windowDays.toLong * 24L * 60L * 60L * 1000L

  private val stopWords: Set[String] = StopWordsLoader.load(stopWordsPath)
  println(s"[TREND] stopWords loaded=${stopWords.size} source=$stopWordsPath")

  private val bucketTerms = mutable.LinkedHashMap[Long, mutable.Map[String, Long]]()
  private val bucketUsers = mutable.LinkedHashMap[Long, mutable.Map[String, Long]]()
  private val STATE_ID = "latest"

  @volatile private var lastEventTimeMillis: Long = System.currentTimeMillis()
  initFromMongo()

  def onMessage(topic: String, json: String): Unit = {
    val ts = extractTimestampMillis(json).getOrElse(System.currentTimeMillis())
    lastEventTimeMillis = math.max(lastEventTimeMillis, ts)

    val bucketStart = (ts / bucketSizeMillis) * bucketSizeMillis

    val terms = extractTerms(json)
    val userOpt = extractUser(json)

    if (terms.nonEmpty || userOpt.nonEmpty) {
      val tmap = bucketTerms.getOrElseUpdate(bucketStart, mutable.Map.empty[String, Long])
      terms.foreach { t =>
        tmap.update(t, tmap.getOrElse(t, 0L) + 1L)
      }

      userOpt.foreach { u =>
        val umap = bucketUsers.getOrElseUpdate(bucketStart, mutable.Map.empty[String, Long])
        umap.update(u, umap.getOrElse(u, 0L) + 1L)
      }
      purgeOld(ts)
    }
  }
  def storeSnapshotAlways(topN: Int): Unit = {
    val windowEnd = lastEventTimeMillis
    val windowStart = windowEnd - windowMillis

    purgeOld(windowEnd)

    val mergedTerms = mutable.Map[String, Long]()
    bucketTerms.foreach { case (bStart, tmap) =>
      if (bStart >= windowStart && bStart <= windowEnd) {
        tmap.foreach { case (k, v) => mergedTerms.update(k, mergedTerms.getOrElse(k, 0L) + v) }
      }
    }

    val mergedUsers = mutable.Map[String, Long]()
    bucketUsers.foreach { case (bStart, umap) =>
      if (bStart >= windowStart && bStart <= windowEnd) {
        umap.foreach { case (k, v) => mergedUsers.update(k, mergedUsers.getOrElse(k, 0L) + v) }
      }
    }

    val topTerms = mergedTerms.toList.sortBy(-_._2).take(topN).map { case (k, c) =>
      Document("key" -> s"term:$k", "count" -> c)
    }

    val topUsers = mergedUsers.toList.sortBy(-_._2).take(topN).map { case (k, c) =>
      Document("key" -> s"user:$k", "count" -> c)
    }

    val updatedAt = System.currentTimeMillis()

    val doc = Document(
      "_id" -> STATE_ID,
      "windowStart" -> windowStart,
      "windowEnd" -> windowEnd,
      "bucketSizeMillis" -> bucketSizeMillis,
      "windowBuckets" -> ((windowMillis / bucketSizeMillis).toInt),
      "topTerms" -> topTerms,
      "topUsers" -> topUsers,
      "updatedAt" -> updatedAt
    )

    try {
      val col = mongoConnection.getCollection("count_min_sketch")
      val filter = Document("_id" -> STATE_ID)
      val update = Document("$set" -> doc)
      Await.result(
        col.updateOne(filter, update, new org.mongodb.scala.model.UpdateOptions().upsert(true)).toFuture(),
        30.seconds
      )
    } catch {
      case NonFatal(e) => println(s"[TREND] storeSnapshotAlways failed: ${e.getMessage}")
    }
  }

  private def purgeOld(nowMillis: Long): Unit = {
    val cutoff = nowMillis - windowMillis
    val oldTermBuckets = bucketTerms.keys.takeWhile(_ < cutoff).toList
    oldTermBuckets.foreach(bucketTerms.remove)

    val oldUserBuckets = bucketUsers.keys.takeWhile(_ < cutoff).toList
    oldUserBuckets.foreach(bucketUsers.remove)
  }

  private def extractTerms(json: String): List[String] = {
    val text = extractField(json, List("title", "body", "selftext", "text", "content")).getOrElse("")
    tokenize(text)
      .filter(t => t.length >= 2 && !stopWords.contains(t))
      .take(50)
  }

  private def extractUser(json: String): Option[String] = {
    extractField(json, List("author", "user", "username"))
      .map(_.trim).filter(_.nonEmpty)
      .map(_.toLowerCase)
  }

  private def tokenize(s: String): List[String] =
    s.toLowerCase
      .replaceAll("""https?://\S+""", " ")
      .replaceAll("""[^a-z0-9\s]""", " ")
      .split("\\s+")
      .toList
      .map(_.trim)
      .filter(_.nonEmpty)

  private def extractTimestampMillis(json: String): Option[Long] = {
    extractField(json, List("createdAt", "timestamp", "ts")).flatMap(safeToLong) match {
      case Some(ms) if ms > 100000000000L => Some(ms)
      case Some(sec) if sec > 1000000000L => Some(sec * 1000L)
      case _ =>
        extractField(json, List("created_utc")).flatMap(safeToLong).map(_ * 1000L)
    }
  }

  private def safeToLong(s: String): Option[Long] =
    try Some(s.trim.replaceAll("\"", "").toLong) catch { case _: Throwable => None }

  private def extractField(json: String, fields: List[String]): Option[String] = {
    fields.view.flatMap { f =>
      val r1 = (""""""" + f + """"\s*:\s*"([^"]*)"""").r
      val r2 = (""""""" + f + """"\s*:\s*([0-9]+)""").r
      r1.findFirstMatchIn(json).map(_.group(1))
        .orElse(r2.findFirstMatchIn(json).map(_.group(1)))
    }.headOption
  }

  private def initFromMongo(): Unit = {
    try {
      val col = mongoConnection.getCollection("count_min_sketch")
      val existing = Await.result(col.find(Document("_id" -> STATE_ID)).first().toFutureOption(), 10.seconds)

      existing match {
        case Some(doc) =>
          val lastEnd = doc.get("windowEnd").map(_.asInt64().getValue).getOrElse(0L)
          if (lastEnd > 0L) lastEventTimeMillis = math.max(lastEventTimeMillis, lastEnd)
          println(s"[TREND] loaded existing state windowEnd=$lastEnd")
        case None =>
          println("[TREND] no previous state found (fresh start)")
      }
    } catch {
      case NonFatal(e) => println(s"[TREND] initFromMongo failed: ${e.getMessage}")
    }
  }
}
