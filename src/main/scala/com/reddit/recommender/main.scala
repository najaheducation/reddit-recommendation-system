// File: Main.scala
package com.reddit.recommender

import com.reddit.recommender.controller.RedditPipeline
import com.reddit.recommender.test.RedditPipelineTest

object Main {

  def main(args: Array[String]): Unit = {
    println("🔴 Reddit Recommendation System")
    println("=" * 50)

    if (args.isEmpty) {
      // No arguments - run default pipeline
      println("No arguments provided. Starting default pipeline...")
      println("Usage: --test | --demo | --run")
      RedditPipeline.runDefault()

    } else {
      args(0) match {
        case "--test" =>
          // Run test suite
          RedditPipelineTest.main(Array())

        case "--demo" =>
          // Run demo
          RedditPipelineTest.demo()

        case "--run" =>
          // Run default pipeline
          RedditPipeline.runDefault()

        case "--integration" =>
          // Run integration test
          RedditPipelineTest.integrationTest()

        case "--help" =>
          printHelp()

        case _ =>
          println(s"Unknown argument: ${args(0)}")
          printHelp()
      }
    }
  }

  private def printHelp(): Unit = {
    println("""
Usage: reddit-pipeline [OPTION]

Options:
  --test        Run test suite
  --demo        Run demo
  --run         Run default pipeline (Apify → Kafka → MongoDB)
  --integration Run integration test (requires Kafka & MongoDB)
  --help        Show this help message

Environment Variables:
  APIFY_API_TOKEN          Apify API token
  APIFY_REDDIT_ACTOR_ID    Apify actor ID
  MONGO_URI                MongoDB connection URI
  MONGO_DB                 MongoDB database name
  KAFKA_BOOTSTRAP_SERVERS  Kafka bootstrap servers

Example:
  APIFY_API_TOKEN=your_token \
  MONGO_URI=mongodb://localhost:27017 \
  KAFKA_BOOTSTRAP_SERVERS=localhost:9092 \
  ./reddit-pipeline --run
""")
  }
}