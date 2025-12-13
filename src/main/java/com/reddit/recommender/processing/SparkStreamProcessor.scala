package com.reddit.recommender.processing

import org.apache.spark.sql.{SparkSession, Dataset, DataFrame, Encoders}
import org.apache.spark.sql.functions._
import org.apache.spark.sql.streaming.Trigger
import org.apache.spark.sql.types._

import com.reddit.recommender.domain.RedditPost
import com.reddit.recommender.scoring._
import com.reddit.recommender.storage.{PostgresPostWriter, PostgresReader, PostgresWriter}

import java.sql.Timestamp
import java.time.Instant

object SparkStreamProcessor {

  def main(args: Array[String]): Unit = {

    val spark = SparkSession.builder()
      .appName("RedditStreamProcessor")
      .master("local[*]")
      .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")
    import spark.implicits._

    // Kafka read
    val kafkaDF = spark.readStream
      .format("kafka")
      .option("kafka.bootstrap.servers", "localhost:9092")
      .option("subscribe", "reddit-posts")
      .option("startingOffsets", "latest")
      .option("failOnDataLoss", "false")
      .load()

    // RAW JSON schema
    val rawSchema = new StructType()
      .add("kind", StringType)
      .add("query", StringType)
      .add("id", StringType)
      .add("title", StringType)
      .add("body", StringType)
      .add("author", StringType)
      .add("score", IntegerType)
      .add("upvote_ratio", DoubleType)
      .add("num_comments", IntegerType)
      .add("subreddit", StringType)
      .add("created_utc", StringType)
      .add("url", StringType)
      .add("flair", StringType)
      .add("over_18", BooleanType)
      .add("is_self", BooleanType)
      .add("spoiler", BooleanType)
      .add("locked", BooleanType)
      .add("is_video", BooleanType)
      .add("domain", StringType)
      .add("thumbnail", StringType)
      .add("url_overridden_by_dest", StringType)
      .add("media", StringType)
      .add("media_metadata", StringType)
      .add("gallery_data", StringType)

    // Parse JSON → DataFrame
    val parsedDF = kafkaDF
      .selectExpr("CAST(value AS STRING) AS json")
      .select(from_json(col("json"), rawSchema).as("p"))
      .select("p.*")

    val postsDF = parsedDF
      .withColumn("numComments", coalesce(col("num_comments"), lit(0)))
      .withColumn("createdUtc", to_timestamp(col("created_utc")))
      .withColumn("upvoteRatio", coalesce(col("upvote_ratio"), lit(0.0)))
      .withColumn("urlOverriddenByDest", col("url_overridden_by_dest"))
      .withColumn("over18", col("over_18"))
      .withColumn("isSelf", col("is_self"))
      .withColumn("isVideo", col("is_video"))
      .withColumn("mediaMetadata", col("media_metadata"))
      .withColumn("galleryData", col("gallery_data"))
      .withColumn("score", coalesce(col("score"), lit(0)))
      .withColumn("title", coalesce(col("title"), lit("")))
      .withColumn("body", coalesce(col("body"), lit("")))
      .withColumn("author", coalesce(col("author"), lit("")))
      .withColumn("subreddit", coalesce(col("subreddit"), lit("")))
      .withColumn("url", coalesce(col("url"), lit("")))

    println("=== RedditPost expected schema ===")
    Encoders.product[RedditPost].schema.printTreeString()

    val posts: Dataset[RedditPost] = postsDF.as[RedditPost]

    // Broadcast user interests
    val userInterests = PostgresReader.readUserInterests(spark).collect()
    val prefsMap = userInterests.map(ui => ui.interest.toLowerCase -> ui.weight).toMap
    val prefsBC = spark.sparkContext.broadcast(prefsMap)

    // UDFs
    val timeUdf = udf((ts: Timestamp) => {
      val inst = if (ts == null) Instant.now() else ts.toInstant
      TimeScoreCalculator.compute(inst)
    })

    val engagementUdf = udf((score: java.lang.Integer, comments: java.lang.Integer) => {
      val s = Option(score).map(_.toInt).getOrElse(0)
      val c = Option(comments).map(_.toInt).getOrElse(0)
      UserEngagementCalculator.compute(s, c)
    })

    val commentUdf = udf((comments: java.lang.Integer) => {
      val c = Option(comments).map(_.toInt).getOrElse(0)
      CommentActivityCalculator.compute(c)
    })

    val upvoteVelocityUdf = udf((score: java.lang.Integer, created: Timestamp) => {
      val s = Option(score).map(_.toInt).getOrElse(0)
      val createdInst = if (created == null) Instant.now() else created.toInstant
      val hoursSince = (Instant.now().toEpochMilli - createdInst.toEpochMilli) / 3600000.0
      UpvoteVelocityCalculator.compute(s, hoursSince)
    })

    val preferenceUdf = udf((title: String, body: String) => {
      val t = Option(title).getOrElse("")
      val b = Option(body).getOrElse("")
      PreferenceMatchCalculator.compute(t, b, prefsBC.value)
    })

    val finalUdf = udf(
      (baseTime: Double, engagement: Double, commentAct: Double,
       upvoteVel: Double, trending: Double, pref: Double) =>
        ScoreAggregator.aggregate(baseTime, engagement, commentAct, upvoteVel, trending, pref)
    )

    // Debug console output
    posts.writeStream
      .format("console")
      .outputMode("append")
      .option("truncate", "false")
      .option("checkpointLocation", "checkpoint/debug")
      .trigger(Trigger.ProcessingTime("5 seconds"))
      .start()

    // Main stream processing
    posts.writeStream
      .outputMode("append")
      .option("checkpointLocation", "checkpoint/all")
      .trigger(Trigger.ProcessingTime("5 seconds"))
      .foreachBatch { (batch: Dataset[RedditPost], batchId: Long) =>

        val count = batch.count()
        println(s"[BATCH] batchId=$batchId count=$count")

        if (count > 0) {

          val df = batch.toDF()

          df.select("id", "numComments", "upvoteRatio", "createdUtc")
            .show(5, truncate = false)

          // 1) write posts
          PostgresPostWriter.writePosts(df)

          // 2) trending scoring
          val postsWithKey = df.withColumn(
            "title_norm",
            lower(trim(coalesce(col("title"), lit(""))))
          )

          val freqDF = postsWithKey
            .groupBy("title_norm")
            .count()
            .withColumn("trendingScore", log(col("count") + lit(1.0)))
            .select("title_norm", "trendingScore")

          val enriched = postsWithKey
            .join(freqDF, Seq("title_norm"), "left")
            .drop("title_norm")
            .na.fill(0.0, Seq("trendingScore"))

          val scoredDF =
            enriched
              .withColumn("baseTimeScore", timeUdf(col("createdUtc")))
              .withColumn("engagementScore", engagementUdf(col("score"), col("numComments")))
              .withColumn("commentActivityScore", commentUdf(col("numComments")))
              .withColumn("upvoteVelocityScore", upvoteVelocityUdf(col("score"), col("createdUtc")))
              .withColumn("preferenceScore", preferenceUdf(col("title"), col("body")))
              .withColumn("finalScore",
                finalUdf(
                  col("baseTimeScore"),
                  col("engagementScore"),
                  col("commentActivityScore"),
                  col("upvoteVelocityScore"),
                  col("trendingScore"),
                  col("preferenceScore")
                )
              )
              .select(
                col("id").cast("string"),
                col("baseTimeScore").cast("double"),
                col("engagementScore").cast("double"),
                col("commentActivityScore").cast("double"),
                col("upvoteVelocityScore").cast("double"),
                col("trendingScore").cast("double"),
                col("preferenceScore").cast("double"),
                col("finalScore").cast("double")
              )

          // 4) write scores
          PostgresWriter.write(scoredDF, "post_scores")
        }
      }
      .start()

    spark.streams.awaitAnyTermination()
  }
}
