package com.reddit.recommender.test.ingestion

//package com.reddit.recommender.test.ingestion
//
//object ApifyToKafka {
//  def main(args: Array[String]): Unit = {
//    if (args.isEmpty) {
//      runDefaultPipeline()
//    } else {
//      runWithArgs(args.toSeq)
//    }
//  }
//
//  private def runDefaultPipeline(): Unit = {
//    println("=== Starting Apify to Kafka Service ===")
//
//    val config = new ScrapeConfig.Builder()
//      .subreddits("programming", "technology", "gaming")
//      .postsPerSource(20)
//      .build()
//
//    val service = new ApifyToKafkaService()
//    val result = service.execute(config)
//    result.printReport()
//  }
//
//  private def runWithArgs(args: Seq[String]): Unit = {
//    val builder = new ScrapeConfig.Builder()
//
//    var i = 0
//    while (i < args.length) {
//      args(i) match {
//        case "--subreddits" =>
//          val (subreddits, newI) = collectUntilFlag(args, i + 1)
//          builder.subreddits(subreddits: _*)
//          i = newI
//
//        case "--keywords" =>
//          val (keywords, newI) = collectUntilFlag(args, i + 1)
//          builder.keywords(keywords: _*)
//          i = newI
//
//        case "--posts" if i + 1 < args.length =>
//          builder.postsPerSource(args(i + 1).toInt)
//          i += 2
//
//        case "--comments" =>
//          builder.scrapeComments(true)
//          i += 1
//
//        case "--timeframe" if i + 1 < args.length =>
//          builder.timeframe(args(i + 1))
//          i += 2
//
//        case _ =>
//          // skip unknown argument
//          i += 1
//      }
//    }
//
//    val service = new ApifyToKafkaService()
//    val result = service.execute(builder.build())
//    result.printReport()
//  }
//
//  // collect arguments until we hit another flag (starting with --) or end of list
//  private def collectUntilFlag(args: Seq[String], start: Int): (Array[String], Int) = {
//    var end = start
//    while (end < args.length && !args(end).startsWith("--")) {
//      end += 1
//    }
//    (args.slice(start, end).toArray, end)
//  }
//}
