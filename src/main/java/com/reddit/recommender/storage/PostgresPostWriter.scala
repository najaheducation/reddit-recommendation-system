package com.reddit.recommender.storage

import org.apache.spark.sql.{DataFrame}
import java.sql.{Connection, DriverManager, Timestamp}
import java.time.Instant

object PostgresPostWriter {

  private val url = "jdbc:postgresql://localhost:5432/redditsrs"
  private val user = "postgres"
  private val password = "Osayd_2004"

  def writePosts(df: DataFrame): Unit = {

    df.rdd.foreachPartition { partition =>
      Class.forName("org.postgresql.Driver")
      val conn: Connection = DriverManager.getConnection(url, user, password)

      val sql =
        """
          INSERT INTO reddit_posts (
            id, kind, query, title, body, author, score,
            upvote_ratio, num_comments, subreddit,
            created_utc, url, flair, over_18,
            is_self, spoiler, locked, is_video, domain, thumbnail,
            url_overridden_by_dest, media, media_metadata, gallery_data
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?::jsonb)
          ON CONFLICT (id) DO NOTHING;
        """

      val stmt = conn.prepareStatement(sql)

      partition.foreach { row =>

        def has(name: String): Boolean = row.schema.fieldNames.contains(name)

        def anyStr(names: String*): String =
          names.collectFirst { case n if has(n) => Option(row.getAs[Any](n)).map(_.toString).orNull }
            .orNull

        def anyInt(names: String*): Int =
          names.collectFirst { case n if has(n) => Option(row.getAs[Any](n)).map(_.toString.toInt) }
            .flatten.getOrElse(0)

        def anyBool(names: String*): Boolean =
          names.collectFirst { case n if has(n) => Option(row.getAs[Any](n)).map(_.toString.toBoolean) }
            .flatten.getOrElse(false)

        def anyJson(names: String*): String =
          names.collectFirst { case n if has(n) => Option(row.getAs[Any](n)).map(_.toString).orNull }
            .orNull

        def anyTimestamp(names: String*): Timestamp = {
          val vOpt = names.collectFirst { case n if has(n) => row.getAs[Any](n) }
          vOpt match {
            case Some(ts: Timestamp) => ts
            case Some(i: Instant)    => Timestamp.from(i)
            case Some(s: String) =>
              try Timestamp.from(Instant.parse(s))
              catch { case _: Throwable => null }
            case Some(other) =>
              try Timestamp.valueOf(other.toString)
              catch { case _: Throwable => null }
            case None => null
          }
        }

        val ratio =
          Seq("upvoteRatio", "upvote_ratio").collectFirst {
            case n if has(n) =>
              Option(row.getAs[Any](n)).map(v => new java.math.BigDecimal(v.toString)).orNull
          }.orNull

        stmt.setString(1, anyStr("id"))
        stmt.setString(2, anyStr("kind"))
        stmt.setString(3, anyStr("query"))
        stmt.setString(4, anyStr("title"))
        stmt.setString(5, anyStr("body"))
        stmt.setString(6, anyStr("author"))
        stmt.setInt(7, anyInt("score"))

        stmt.setBigDecimal(8, ratio)

        // numComments camelCase or num_comments snake_case
        stmt.setInt(9, anyInt("numComments", "num_comments"))

        stmt.setString(10, anyStr("subreddit"))

        // createdUtc camelCase or created_utc snake_case
        stmt.setTimestamp(11, anyTimestamp("createdUtc", "created_utc"))

        stmt.setString(12, anyStr("url"))
        stmt.setString(13, anyStr("flair"))

        stmt.setBoolean(14, anyBool("over18", "over_18"))
        stmt.setBoolean(15, anyBool("isSelf", "is_self"))
        stmt.setBoolean(16, anyBool("spoiler"))
        stmt.setBoolean(17, anyBool("locked"))
        stmt.setBoolean(18, anyBool("isVideo", "is_video"))

        stmt.setString(19, anyStr("domain"))
        stmt.setString(20, anyStr("thumbnail"))
        stmt.setString(21, anyStr("urlOverriddenByDest", "url_overridden_by_dest"))

        stmt.setString(22, anyJson("media"))
        stmt.setString(23, anyJson("mediaMetadata", "media_metadata"))
        stmt.setString(24, anyJson("galleryData", "gallery_data"))

        stmt.addBatch()
      }

      stmt.executeBatch()
      stmt.close()
      conn.close()
    }
  }
}
