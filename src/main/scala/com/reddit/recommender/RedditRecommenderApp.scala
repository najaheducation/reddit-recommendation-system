package com.reddit.recommender

import org.apache.spark.sql.SparkSession
import org.json.JSONObject
import com.reddit.recommender.api.{ApifyClient, ScraperParameters}
import com.reddit.recommender.kafkaproducer.SimpleKafkaProducer
import com.reddit.recommender.consumer.{AppConfig, ConfigLoader, KafkaToMongoProcessor}

import java.util.concurrent.{Executors, ScheduledFuture, TimeUnit}
import scala.io.StdIn
import scala.util.Try

object RedditRecommenderApp {
  private var recurringTask: Option[ScheduledFuture[_]] = None
  private val scheduler = Executors.newScheduledThreadPool(1)
  private var processor: Option[KafkaToMongoProcessor] = None
  private var spark: Option[SparkSession] = None
  @volatile private var sparkInitialized = false

  def main(args: Array[String]): Unit = {
    println("""
              |=====================================
              |   Reddit Recommender System
              |=====================================
              |""".stripMargin)

    val config = ConfigLoader.loadFromEnv()

    // clear any buffered input
    clearInputBuffer()

    // start Spark in background thread
    startSparkConsumerInBackground(config)

    // Wait for Spark to initialize (with timeout)
    waitForSparkInitialization()

    // show the menu
    showInteractiveMenu()
  }

  private def startSparkConsumerInBackground(config: AppConfig): Unit = {
    println("Starting Kafka → MongoDB consumer in background...")

    val sparkThread = new Thread(() => {
      try {
        // Disable idle progress reports completely
        System.setProperty("spark.sql.streaming.noDataProgressEventInterval", "-1")

        val sparkBuilder = SparkSession.builder()
          .appName("Reddit-Kafka-To-Mongo")
          .master("local[*]")
          .config("spark.sql.streaming.checkpointLocation", "/tmp/checkpoints/reddit-mongo")
          .config("spark.ui.showConsoleProgress", "false")  // disable progress bars

        spark = Some(sparkBuilder.getOrCreate())
        val s = spark.get

        s.sparkContext.setLogLevel("ERROR")  // reduce Spark logs to only errors

        processor = Some(new KafkaToMongoProcessor(s, config))
        processor.foreach(_.start())

        sparkInitialized = true
        println("\n✓ Spark consumer initialized successfully!")
      } catch {
        case e: Exception =>
          println(s"\n✗ Error starting Spark consumer: ${e.getMessage}")
          e.printStackTrace()
      }
    })

    sparkThread.setDaemon(true)  // Allow JVM to exit even if Spark is running
    sparkThread.setName("Spark-Consumer-Thread")
    sparkThread.start()
  }

  private def waitForSparkInitialization(): Unit = {
    print("Initializing...")

    // Wait up to 15 seconds for Spark to initialize
    var attempts = 0
    val maxAttempts = 30  // 30 * 500ms = 15 seconds

    while (!sparkInitialized && attempts < maxAttempts) {
      Thread.sleep(500)
      attempts += 1
      if (attempts % 4 == 0) print(".")  // Show progress every 2 seconds
    }

    if (sparkInitialized) {
      println("\n\n" + "=" * 50)
      println("System ready! Starting interactive mode...")
    } else {
      println("\n\n Warning: Spark initialization is taking longer than expected.")
      println("Continuing with interactive mode...")
    }
  }

  private def showInteractiveMenu(): Unit = {
    var running = true

    while (running) {
      clearScreen()
      println("\n\n\n\n")
      println("╔═══════════════════════════════════════════════════╗")
      println("║           REDDIT RECOMMENDER SYSTEM               ║")
      println("╚═══════════════════════════════════════════════════╝")
      println()
      println("Main Menu:")
      println("─".repeat(50))
      println("1) Run scrape once")
      println("2) Start recurring scrape (every X minutes)")
      println("3) Stop recurring scrape")
      println("4) Show system status")
      println("5) Exit")
      println("─".repeat(50))
      print("\nEnter your choice (1-5): ")
      Console.out.flush()

      val choice = StdIn.readLine().trim

      choice match {
        case "1" =>
          println("\n" + "═" * 50)
          println("ONE-TIME SCRAPE")
          println("═" * 50)
          runScrapeOnce()
          pressEnterToContinue()

        case "2" =>
          println("\n" + "═" * 50)
          println("RECURRING SCRAPE SETUP")
          println("═" * 50)
          startRecurring()
          pressEnterToContinue()

        case "3" =>
          stopRecurring()
          pressEnterToContinue()

        case "4" =>
          showStatus()
          pressEnterToContinue()

        case "5" =>
          println("\n" + "═" * 50)
          println("SHUTDOWN SEQUENCE")
          println("═" * 50)
          println("Shutting down...")
          stopRecurring()
          processor.foreach(_.stop())
          spark.foreach(_.stop())
          scheduler.shutdown()
          println("✓ All components stopped.")
          println(" Goodbye!")
          running = false

        case _ =>
          println("\n Invalid choice. Please enter a number between 1 and 5.")
          Thread.sleep(1500)
      }
    }
  }

  private def clearScreen(): Unit = {
    // Try to clear screen because spark logger keeps f***ing things up
    try {
      if (System.getProperty("os.name").contains("Windows")) {
        new ProcessBuilder("cmd", "/c", "cls").inheritIO().start().waitFor()
      } else {
        print("\033[H\033[2J")
        Console.out.flush()
      }
    } catch {
      case _: Exception =>
        // If clearing fails, just print some newlines
        println("\n" * 3)
    }
  }

  private def clearInputBuffer(): Unit = {
    try {
      while (System.in.available() > 0) {
        System.in.read()
      }
    } catch {
      case _: Exception => // Ignore errors
    }
  }

  private def pressEnterToContinue(): Unit = {
    println("\n" + "─".repeat(50))
    print("Press Enter to continue...")
    Console.out.flush()
    StdIn.readLine()
  }

  private def runScrapeOnce(): Unit = {
    try {
      val params = buildParameters()
      if (params != null) {
        println("\n Running one-time scrape...")

        val client = new ApifyClient()
        val results = client.scrapeReddit(params)

        if (results.length() == 0) {
          println(" No data found with the specified parameters.")
          return
        }

        val producer = new SimpleKafkaProducer()
        try {
          var posts = 0
          var comments = 0

          (0 until results.length()).foreach { i =>
            val item = results.getJSONObject(i)
            if (item.has("isComment") && item.getBoolean("isComment")) {
              producer.sendComment(item)
              comments += 1
            } else {
              producer.sendPost(item)
              posts += 1
            }
          }

          producer.flush()
          println(s"\n   Scrape complete!")
          println(s"    Posts sent: $posts")
          println(s"    Comments sent: $comments")
          println(s"    Total: ${posts + comments}")

        } finally {
          producer.close()
        }
      } else {
        println(" Scrape operation canceled.")
      }
    } catch {
      case e: Exception =>
        println(s" Scrape failed: ${e.getMessage}")
        println("   Please check your parameters and try again.")
    }
  }

  private def startRecurring(): Unit = {
    if (recurringTask.isDefined) {
      println(" Recurring scrape is already running.")
      return
    }

    val minutes = promptInt("Run every how many minutes? ", 30)
    if (minutes <= 0) {
      println(" Invalid number. Must be greater than 0.")
      return
    }

    val params = buildParameters()
    if (params == null) return

    println(s"\n Setting up recurring scrape every $minutes minute(s)...")
    println("   First run: IMMEDIATELY")
    println(s"   Subsequent runs: every $minutes minute(s) thereafter")

    // Run the first scrape immediately
    runScrapeWithParams(params)

    // Then schedule the recurring task with 0 initial delay
    def scheduledTask(): Unit = runScrapeWithParams(params)

    val task = scheduler.scheduleAtFixedRate(
      () => scheduledTask(),
      0L,               // Initial delay = 0 → starts on the next scheduler tick (almost immediate)
      minutes,
      TimeUnit.MINUTES
    )

    recurringTask = Some(task)
    println(s"✓ Recurring scrape started successfully!")
    println(s"  • Runs every $minutes minute(s)")
    println(s"  • Next run in approximately $minutes minute(s)")
  }
  private def runScrapeWithParams(params: JSONObject): Unit = {
    val timestamp = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss"))
    println(s"\n[$timestamp]  Running scheduled scrape...")

    try {
      val client = new ApifyClient()
      val results = client.scrapeReddit(params)

      val producer = new SimpleKafkaProducer()
      try {
        var posts = 0
        var comments = 0

        (0 until results.length()).foreach { i =>
          val item = results.getJSONObject(i)
          if (item.has("isComment") && item.getBoolean("isComment")) {
            producer.sendComment(item)
            comments += 1
          } else {
            producer.sendPost(item)
            posts += 1
          }
        }

        producer.flush()
        val timestamp2 = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss"))
        println(s"[$timestamp2]  Scheduled scrape complete: $posts posts, $comments comments")

      } finally {
        producer.close()
      }
    } catch {
      case e: Exception =>
        val timestamp2 = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss"))
        println(s"[$timestamp2]  Scheduled scrape failed: ${e.getMessage}")
    }
  }

  private def stopRecurring(): Unit = {
    recurringTask match {
      case Some(task) =>
        task.cancel(true)
        recurringTask = None
        println(" Recurring scrape stopped")
      case None =>
        println("ℹ No recurring scrape is currently running")
    }
  }

  private def showStatus(): Unit = {
    println("\n" + "═" * 50)
    println("SYSTEM STATUS")
    println("═" * 50)

    val sparkStatus = if (sparkInitialized) " RUNNING" else " NOT RUNNING"
    val recurringStatus = if (recurringTask.isDefined) " ACTIVE" else " INACTIVE"

    println(s"Spark Consumer     : $sparkStatus")
    println(s"Recurring Scrape   : $recurringStatus")

    recurringTask.foreach { task =>
      if (!task.isCancelled && !task.isDone) {
        val delay = task.getDelay(TimeUnit.SECONDS)
        if (delay > 0) {
          val mins = delay / 60
          val secs = delay % 60
          println(s"Next scheduled run in: $mins minute(s) $secs second(s)")
        } else {
          println(s"Next scheduled run in: less than 1 minute")
        }
      }
    }

    println(s"Current time       : ${java.time.LocalDateTime.now()}")
  }

  private def buildParameters(): JSONObject = {
    println("\n Build scrape parameters:")
    println("─".repeat(30))

    var builder = new ScraperParameters()
    var hasSources = false

    // Keywords
    print("Add keywords? (comma-separated, or press Enter to skip): ")
    Console.out.flush()
    val keywordsInput = StdIn.readLine().trim

    if (keywordsInput.nonEmpty) {
      val keywords = keywordsInput.split(",").map(_.trim).filter(_.nonEmpty)
      if (keywords.nonEmpty) {
        keywords.foreach(builder.addQuery)
        println(s"   ✓ Added keywords: ${keywords.mkString(", ")}")
        hasSources = true
      }
    } else {
      println("   Skipping keywords.")
    }

    // Subreddits/URLs
    print("\nAdd subreddits or URLs? (comma-separated, or press Enter to skip): ")
    Console.out.flush()
    val urlsInput = StdIn.readLine().trim

    if (urlsInput.nonEmpty) {
      val sources = urlsInput.split(",").map(_.trim).filter(_.nonEmpty)
      if (sources.nonEmpty) {
        sources.foreach { item =>
          if (item.startsWith("http")) {
            builder.addUrl(item)
            println(s"   ✓ Added URL: $item")
          } else {
            val url = s"https://www.reddit.com/r/$item/"
            builder.addUrl(url)
            println(s"   ✓ Added subreddit: r/$item")
          }
        }
        hasSources = true
      }
    } else {
      println("   Skipping subreddits/URLs.")
    }

    if (!hasSources) {
      println("\n No sources specified — operation canceled")
      return null
    }

    // Advanced parameters
    println("\n Advanced parameters (press Enter for defaults):")
    val maxPosts = promptInt("Max posts per source? (default 20): ", 20)
    val scrapeComments = promptYesNo("Scrape comments? (default n): ", false)

    val maxComments = if (scrapeComments) {
      promptInt("Max comments per post? (default 5, 0 = no limit): ", 5)
    } else {
      1 // mininum allowed value
    }

    val sort = prompt("Sort by? (new/top/hot/relevance/controversial, default new): ").trim match {
      case "" => "new"
      case s => s.toLowerCase
    }

    val timeframe = prompt("Timeframe? (hour/day/week/month/year/all, default week): ").trim match {
      case "" => "week"
      case t => t.toLowerCase
    }

    println("\n  Final parameters:")
    println(s"   Max posts: $maxPosts")
    println(s"   Scrape comments: $scrapeComments")
    println(s"   Sort by: $sort")
    println(s"   Timeframe: $timeframe")

    print("\nProceed with scrape? (y/n, default y): ")
    Console.out.flush()
    val proceed = StdIn.readLine().trim.toLowerCase
    if (proceed == "n" || proceed == "no") {
      println("Scrape canceled by user.")
      return null
    }

    builder
      .setMaxPosts(maxPosts)
      .setScrapeComments(scrapeComments)
      .setSort(sort)
      .setTimeframe(timeframe)


    if (scrapeComments) {
      val safeMaxComments = math.max(maxComments, 1)  // ensure at least 1 if comments are enabled, this is to prevent a code of 403
      builder = builder.setMaxComments(safeMaxComments)
    }
    builder.build()

  }

  private def prompt(question: String): String = {
    print(question)
    Console.out.flush()
    StdIn.readLine().trim
  }

  private def promptInt(question: String, default: Int): Int = {
    val input = prompt(question)
    if (input.isEmpty) default
    else Try(input.toInt).getOrElse {
      println(s" Invalid number, using default: $default")
      default
    }
  }

  private def promptYesNo(question: String, default: Boolean): Boolean = {
    val input = prompt(question).toLowerCase
    if (input.isEmpty) default
    else input.startsWith("y") || input == "1" || input == "yes"
  }
}