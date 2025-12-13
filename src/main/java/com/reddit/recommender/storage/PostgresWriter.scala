package com.reddit.recommender.storage

import org.apache.spark.sql.DataFrame
import java.sql.{Connection, DriverManager}

object PostgresWriter {

  private val url = "jdbc:postgresql://localhost:5432/redditsrs"
  private val user = "postgres"
  private val password = "Osayd_2004"

  def write(df: DataFrame, tableName: String): Unit = {

    df.rdd.foreachPartition { partition =>
      Class.forName("org.postgresql.Driver")
      val conn: Connection = DriverManager.getConnection(url, user, password)

      val sql =
        s"""
           INSERT INTO $tableName
           (user_id, post_id, base_time_score, engagement_score, comment_activity_score,
            upvote_velocity_score, trending_score, preference_score, final_score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (user_id, post_id) DO UPDATE SET
             base_time_score = EXCLUDED.base_time_score,
             engagement_score = EXCLUDED.engagement_score,
             comment_activity_score = EXCLUDED.comment_activity_score,
             upvote_velocity_score = EXCLUDED.upvote_velocity_score,
             trending_score = EXCLUDED.trending_score,
             preference_score = EXCLUDED.preference_score,
             final_score = EXCLUDED.final_score;
         """

      val stmt = conn.prepareStatement(sql)

      partition.foreach { row =>

        stmt.setInt(1, row.getAs[Int]("userId"))
        stmt.setString(2, row.getAs[String]("id"))

        def d(name: String): Double =
          Option(row.getAs[Any](name)).map(_.toString.toDouble).getOrElse(0.0)

        stmt.setDouble(3, d("baseTimeScore"))
        stmt.setDouble(4, d("engagementScore"))
        stmt.setDouble(5, d("commentActivityScore"))
        stmt.setDouble(6, d("upvoteVelocityScore"))
        stmt.setDouble(7, d("trendingScore"))
        stmt.setDouble(8, d("preferenceScore"))
        stmt.setDouble(9, d("finalScore"))

        stmt.addBatch()
      }

      stmt.executeBatch()
      stmt.close()
      conn.close()
    }
  }
}
