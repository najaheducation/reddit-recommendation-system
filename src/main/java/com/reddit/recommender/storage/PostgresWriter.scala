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
           (id, base_time_score, engagement_score, comment_activity_score,
            upvote_velocity_score, trending_score, preference_score, final_score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET
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

        def has(name: String): Boolean = row.schema.fieldNames.contains(name)
        def anyDouble(names: String*): Double =
          names.collectFirst { case n if has(n) => Option(row.getAs[Any](n)).map(_.toString.toDouble) }
            .flatten.getOrElse(0.0)

        stmt.setString(1, row.getAs[String]("id"))
        stmt.setDouble(2, anyDouble("baseTimeScore", "base_time_score"))
        stmt.setDouble(3, anyDouble("engagementScore", "engagement_score"))
        stmt.setDouble(4, anyDouble("commentActivityScore", "comment_activity_score"))
        stmt.setDouble(5, anyDouble("upvoteVelocityScore", "upvote_velocity_score"))
        stmt.setDouble(6, anyDouble("trendingScore", "trending_score"))
        stmt.setDouble(7, anyDouble("preferenceScore", "preference_score"))
        stmt.setDouble(8, anyDouble("finalScore", "final_score"))

        stmt.addBatch()
      }

      stmt.executeBatch()
      stmt.close()
      conn.close()
    }
  }
}
