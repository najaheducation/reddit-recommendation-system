package com.reddit.recommender.storage

import com.reddit.recommender.domain.{PostScore, RedditPost}
import java.sql.{Connection, DriverManager, PreparedStatement}
import java.time.Instant

final class PostgresWriter(jdbcUrl: String, dbUser: String, dbPassword: String) {

  Class.forName("org.postgresql.Driver")

  private def getConnection(): Connection = {
    DriverManager.getConnection(jdbcUrl, dbUser, dbPassword)
  }

  def savePostWithScore(post: RedditPost, score: PostScore): Boolean = {
    val sql = """
            INSERT INTO reddit_posts (
                id, kind, query, title, body, author, score, upvote_ratio,
                num_comments, subreddit, created_utc, url, flair, over_18,
                is_self, spoiler, locked, is_video, domain, thumbnail,
                url_overridden_by_dest, liked_by_user, commented_by_user,
                time_score, upvote_velocity_score, comment_activity_score,
                engagement_score, interest_match_score, trending_boost_score,
                final_score, inserted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON CONFLICT (id) DO UPDATE SET
                score = EXCLUDED.score,
                upvote_ratio = EXCLUDED.upvote_ratio,
                num_comments = EXCLUDED.num_comments,
                liked_by_user = EXCLUDED.liked_by_user,
                commented_by_user = EXCLUDED.commented_by_user,
                time_score = EXCLUDED.time_score,
                upvote_velocity_score = EXCLUDED.upvote_velocity_score,
                comment_activity_score = EXCLUDED.comment_activity_score,
                engagement_score = EXCLUDED.engagement_score,
                interest_match_score = EXCLUDED.interest_match_score,
                trending_boost_score = EXCLUDED.trending_boost_score,
                final_score = EXCLUDED.final_score,
                updated_at = NOW()
        """

    val conn = getConnection()
    try {
      val stmt = conn.prepareStatement(sql)

      stmt.setString(1, post.id)
      stmt.setString(2, post.kind)
      stmt.setString(3, post.query)
      stmt.setString(4, post.title)
      stmt.setString(5, post.body)
      stmt.setString(6, post.author)
      stmt.setInt(7, post.score)
      stmt.setDouble(8, post.upvoteRatio)
      stmt.setInt(9, post.numComments)
      stmt.setString(10, post.subreddit)
      stmt.setTimestamp(11, java.sql.Timestamp.from(post.createdUtc))
      stmt.setString(12, post.url)
      stmt.setString(13, post.flair.orNull)
      stmt.setBoolean(14, post.over18)
      stmt.setBoolean(15, post.isSelf)
      stmt.setBoolean(16, post.spoiler)
      stmt.setBoolean(17, post.locked)
      stmt.setBoolean(18, post.isVideo)
      stmt.setString(19, post.domain.orNull)
      stmt.setString(20, post.thumbnail.orNull)
      stmt.setString(21, post.urlOverriddenByDest.orNull)
      stmt.setBoolean(22, post.likedByUser)
      stmt.setBoolean(23, post.commentedByUser)
      stmt.setDouble(24, score.timeScore)
      stmt.setDouble(25, score.upvoteVelocityScore)
      stmt.setDouble(26, score.commentActivityScore)
      stmt.setDouble(27, score.engagementScore)
      stmt.setDouble(28, score.interestMatchScore)
      stmt.setDouble(29, score.trendingBoostScore)
      stmt.setDouble(30, score.finalScore)

      val rowsAffected = stmt.executeUpdate()
      rowsAffected > 0
    } catch {
      case e: Exception =>
        println(s"Error saving post ${post.id}: ${e.getMessage}")
        false
    } finally {
      conn.close()
    }
  }

  def saveTopicTrend(topic: String, count: Long): Unit = {
    val sql = """
            INSERT INTO topic_trends (topic, window_start, window_end, approx_count)
            VALUES (?, NOW() - INTERVAL '1 hour', NOW(), ?)
            ON CONFLICT (topic, window_start) DO UPDATE SET
                approx_count = EXCLUDED.approx_count,
                window_end = EXCLUDED.window_end
        """

    val conn = getConnection()
    try {
      val stmt = conn.prepareStatement(sql)
      stmt.setString(1, topic)
      stmt.setLong(2, count)
      stmt.executeUpdate()
    } finally {
      conn.close()
    }
  }
}

object PostgresWriter {
  def apply(): PostgresWriter = {
    val url = sys.env.getOrElse("DB_URL", "jdbc:postgresql://localhost:5432/reddit")
    val user = sys.env.getOrElse("DB_USER", "postgres")
    val password = sys.env.getOrElse("DB_PASSWORD", "0569315404")
    new PostgresWriter(url, user, password)
  }
}