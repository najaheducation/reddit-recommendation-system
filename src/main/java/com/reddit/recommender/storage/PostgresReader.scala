package com.reddit.recommender.storage


import org.apache.spark.sql.{Dataset, SparkSession}

case class UserInterest(
                         user_id: Int,
                         interest: String,
                         weight: Double
                       )

object PostgresReader {

  private val url = "jdbc:postgresql://localhost:5432/redditsrs"
  private val user = "postgres"
  private val password = "Osayd_2004"
  private val driver = "org.postgresql.Driver"

  def readUserInterests(spark: SparkSession): Dataset[UserInterest] = {
    import spark.implicits._
    spark.read
      .format("jdbc")
      .option("url", url)
      .option("dbtable", "user_interests")
      .option("user", user)
      .option("password", password)
      .option("driver", driver)
      .load()
      .as[UserInterest]
  }
}
