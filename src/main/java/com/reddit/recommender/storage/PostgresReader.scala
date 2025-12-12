package com.reddit.recommender.storage

import com.reddit.recommender.domain.{RedditPost, UserPreference, UserWeights}
import java.sql.{Connection, DriverManager, ResultSet}
import java.time.Instant
import scala.util.{Try, Success, Failure}
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.scala.DefaultScalaModule

final class PostgresReader(jdbcUrl: String, dbUser: String, dbPassword: String) {

  private val mapper = new ObjectMapper()
  mapper.registerModule(DefaultScalaModule)

  Class.forName("org.postgresql.Driver")

  private def getConnection(): Connection = {
    DriverManager.getConnection(jdbcUrl, dbUser, dbPassword)
  }

  def loadUserPreference(userId: String): Option[UserPreference] = {
    val sql = """
            SELECT up.weights, up.topics, au.id
            FROM user_preferences up
            JOIN app_users au ON up.user_id = au.id
            WHERE au.username = ?
        """

    val conn = getConnection()
    try {
      val stmt = conn.prepareStatement(sql)
      stmt.setString(1, userId)
      val rs = stmt.executeQuery()

      if (rs.next()) {
        val weightsJson = rs.getString("weights")
        val topicsJson = rs.getString("topics")
        val dbUserId = rs.getString("id")

        val weights = parseWeights(weightsJson)
        val topics = parseTopicWeights(topicsJson)

        Some(UserPreference(dbUserId, weights, topics))
      } else {
        None
      }
    } finally {
      conn.close()
    }
  }

  private def parseWeights(jsonStr: String): UserWeights = {
    Try {
      val map = mapper.readValue(jsonStr, classOf[Map[String, Any]])
      UserWeights(
        time = getDouble(map, "time"),
        upvotes = getDouble(map, "upvotes"),
        comments = getDouble(map, "comments"),
        engagement = getDouble(map, "engagement"),
        interest = getDouble(map, "interest"),
        trending = getDouble(map, "trending")
      )
    } match {
      case Success(weights) => weights
      case Failure(_) => UserWeights(0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
    }
  }

  private def getDouble(map: Map[String, Any], key: String): Double = {
    map.get(key) match {
      case Some(value: Number) => value.doubleValue()
      case Some(value: String) => Try(value.toDouble).getOrElse(0.0)
      case _ => 0.0
    }
  }

  private def parseTopicWeights(jsonStr: String): Map[String, Double] = {
    Try {
      mapper.readValue(jsonStr, classOf[Map[String, Any]])
        .map { case (k, v) =>
          val value = v match {
            case n: Number => n.doubleValue()
            case s: String => Try(s.toDouble).getOrElse(0.0)
            case _ => 0.0
          }
          k -> value
        }
    } match {
      case Success(map) => map
      case Failure(_) => Map.empty[String, Double]
    }
  }

  def loadPostsForScoring(limit: Int = 100): List[RedditPost] = {
    val sql = """
            SELECT * FROM reddit_posts
            WHERE final_score IS NULL
            OR updated_at < NOW() - INTERVAL '1 hour'
            ORDER BY created_utc DESC
            LIMIT ?
        """

    val conn = getConnection()
    try {
      val stmt = conn.prepareStatement(sql)
      stmt.setInt(1, limit)
      val rs = stmt.executeQuery()

      val posts = scala.collection.mutable.ListBuffer.empty[RedditPost]
      while (rs.next()) {
        posts += extractRedditPost(rs)
      }
      posts.toList
    } finally {
      conn.close()
    }
  }

  def loadAllPosts(limit: Int = 50): List[RedditPost] = {
    val sql = """
            SELECT * FROM reddit_posts
            ORDER BY created_utc DESC
            LIMIT ?
        """

    val conn = getConnection()
    try {
      val stmt = conn.prepareStatement(sql)
      stmt.setInt(1, limit)
      val rs = stmt.executeQuery()

      val posts = scala.collection.mutable.ListBuffer.empty[RedditPost]
      while (rs.next()) {
        posts += extractRedditPost(rs)
      }
      posts.toList
    } finally {
      conn.close()
    }
  }

  private def extractRedditPost(rs: ResultSet): RedditPost = {
    RedditPost(
      id = rs.getString("id"),
      kind = rs.getString("kind"),
      query = rs.getString("query"),
      title = rs.getString("title"),
      body = rs.getString("body"),
      author = rs.getString("author"),
      score = rs.getInt("score"),
      upvoteRatio = rs.getDouble("upvote_ratio"),
      numComments = rs.getInt("num_comments"),
      subreddit = rs.getString("subreddit"),
      createdUtc = rs.getTimestamp("created_utc").toInstant,
      url = rs.getString("url"),
      flair = Option(rs.getString("flair")),
      over18 = rs.getBoolean("over_18"),
      isSelf = rs.getBoolean("is_self"),
      spoiler = rs.getBoolean("spoiler"),
      locked = rs.getBoolean("locked"),
      isVideo = rs.getBoolean("is_video"),
      domain = Option(rs.getString("domain")),
      thumbnail = Option(rs.getString("thumbnail")),
      urlOverriddenByDest = Option(rs.getString("url_overridden_by_dest")),
      likedByUser = rs.getBoolean("liked_by_user"),
      commentedByUser = rs.getBoolean("commented_by_user"),
      topicWeights = Map.empty
    )
  }

  def getTopicTrends(topic: String, hours: Int = 24): Long = {
    val sql = """
            SELECT approx_count
            FROM topic_trends
            WHERE topic = ?
            AND window_end >= NOW() - INTERVAL '? hours'
            ORDER BY window_end DESC
            LIMIT 1
        """

    val conn = getConnection()
    try {
      val stmt = conn.prepareStatement(sql)
      stmt.setString(1, topic)
      stmt.setInt(2, hours)
      val rs = stmt.executeQuery()

      if (rs.next()) rs.getLong("approx_count") else 0L
    } finally {
      conn.close()
    }
  }
}

object PostgresReader {
  def apply(): PostgresReader = {
    val url = sys.env.getOrElse("DB_URL", "jdbc:postgresql://localhost:5432/reddit")
    val user = sys.env.getOrElse("DB_USER", "postgres")
    val password = sys.env.getOrElse("DB_PASSWORD", "0569315404")
    new PostgresReader(url, user, password)
  }
}