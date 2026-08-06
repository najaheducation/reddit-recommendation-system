package com.linkedin.recommender

import org.apache.spark.sql.SparkSession
import org.json.JSONObject
import com.linkedin.recommender.api.{ApifyClient, ScraperParameters}
import com.linkedin.recommender.kafkaProducer.SimpleKafkaProducer
import com.linkedin.recommender.kafkaConsumer.{AppConfig, ConfigLoader, KafkaToMongoProcessor}

import java.util.concurrent.{Executors, ScheduledFuture, TimeUnit}
import scala.io.StdIn
import scala.util.Try

object LinkedInRecommenderApp {
  private val producerBloomFilter = new com.linkedin.recommender.kafkaFilter.JobBloomFilter(100000, 0.01)
  private var recurringTask: Option[ScheduledFuture[_]] = None
  private val scheduler = Executors.newScheduledThreadPool(1)
  private var processor: Option[KafkaToMongoProcessor] = None
  private var spark: Option[SparkSession] = None
  @volatile private var sparkInitialized = false

  def main(args: Array[String]): Unit = {
    // Suppress JVM illegal reflective access warnings emitted by Spark on Java 11
    val originalErr = System.err
    val dummyErr = new java.io.PrintStream(new java.io.OutputStream {
      override def write(b: Int): Unit = {}
    })
    System.setErr(dummyErr)

    println("""
              |=====================================
              |   LinkedIn Jobs Recommender System
              |=====================================
              |""".stripMargin)

    val config = ConfigLoader.loadFromEnv()

    // Clear any buffered input
    clearInputBuffer()

    // Start Spark in background thread
    startSparkConsumerInBackground(config)

    // Wait for Spark to initialize
    waitForSparkInitialization()

    // Restore standard error stream for application runtime
    System.setErr(originalErr)

    // Show the interactive menu
    showInteractiveMenu()
  }

  private def startSparkConsumerInBackground(config: AppConfig): Unit = {
    println("Starting Kafka → MongoDB consumer in background...")

    val sparkThread = new Thread(() => {
      try {
        System.setProperty("spark.sql.streaming.noDataProgressEventInterval", "-1")

        val sparkBuilder = SparkSession.builder()
          .appName("LinkedIn-Kafka-To-Mongo")
          .master("local[*]")
          .config("spark.sql.streaming.checkpointLocation", "/tmp/checkpoints/linkedin-mongo")
          .config("spark.ui.showConsoleProgress", "false")

        spark = Some(sparkBuilder.getOrCreate())
        val s = spark.get

        s.sparkContext.setLogLevel("ERROR")

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

    sparkThread.setDaemon(true)
    sparkThread.setName("Spark-Consumer-Thread")
    sparkThread.start()
  }

  private def waitForSparkInitialization(): Unit = {
    print("Initializing...")

    var attempts = 0
    val maxAttempts = 30

    while (!sparkInitialized && attempts < maxAttempts) {
      Thread.sleep(500)
      attempts += 1
      if (attempts % 4 == 0) print(".")
    }

    if (sparkInitialized) {
      println("\n\n" + "=" * 50)
      println("System ready! Starting interactive mode...")
    } else {
      println("\n\n Warning: Spark initialization taking longer than expected.")
      println("Continuing with interactive mode...")
    }
  }

  private def showInteractiveMenu(): Unit = {
    var running = true

    while (running) {
      clearScreen()
      println("\n\n\n\n")
      println("╔═══════════════════════════════════════════════════╗")
      println("║         LINKEDIN JOBS RECOMMENDER SYSTEM          ║")
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
    try {
      if (System.getProperty("os.name").contains("Windows")) {
        new ProcessBuilder("cmd", "/c", "cls").inheritIO().start().waitFor()
      } else {
        print("\033[H\033[2J")
        Console.out.flush()
      }
    } catch {
      case _: Exception =>
        println("\n" * 3)
    }
  }

  private def clearInputBuffer(): Unit = {
    try {
      while (System.in.available() > 0) {
        System.in.read()
      }
    } catch {
      case _: Exception =>
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
        val results = client.scrapeLinkedInJobs(params)

        if (results.length() == 0) {
          println(" No jobs found with the specified parameters.")
          return
        }

        val producer = new SimpleKafkaProducer(producerBloomFilter)
        try {
          var jobsCount = 0

          (0 until results.length()).foreach { i =>
            val item = results.getJSONObject(i)
            producer.sendJob(item)
            jobsCount += 1
          }

          producer.flush()
          println(s"\n   Scrape complete!")
          println(s"    Jobs sent to Kafka & MongoDB: $jobsCount")

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

    runScrapeWithParams(params)

    val task = scheduler.scheduleAtFixedRate(
      () => runScrapeWithParams(params),
      0L,
      minutes,
      TimeUnit.MINUTES
    )

    recurringTask = Some(task)
    println(s"✓ Recurring scrape started successfully!")
  }

  private def runScrapeWithParams(params: JSONObject): Unit = {
    val timestamp = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss"))
    println(s"\n[$timestamp]  Running scheduled LinkedIn scrape...")

    try {
      val client = new ApifyClient()
      val results = client.scrapeLinkedInJobs(params)

      val producer = new SimpleKafkaProducer(producerBloomFilter)
      try {
        var jobsCount = 0

        (0 until results.length()).foreach { i =>
          val item = results.getJSONObject(i)
          producer.sendJob(item)
          jobsCount += 1
        }

        producer.flush()
        val timestamp2 = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss"))
        println(s"[$timestamp2]  Scheduled scrape complete: $jobsCount jobs published!")

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
    println(s"Current time       : ${java.time.LocalDateTime.now()}")
  }

  private def buildParameters(): JSONObject = {
    println("\n Build scrape parameters:")
    println("─".repeat(30))

    val builder = new ScraperParameters()

    print("Enter LinkedIn Search URL or Keyword (e.g. 'Software Engineer' or full URL): ")
    Console.out.flush()
    val input = StdIn.readLine().trim

    val targetUrl = if (input.isEmpty) {
      "https://www.linkedin.com/jobs/search/?keywords=Software%20Engineer"
    } else if (input.startsWith("http://") || input.startsWith("https://")) {
      input
    } else {
      val encoded = java.net.URLEncoder.encode(input, "UTF-8")
      s"https://www.linkedin.com/jobs/search/?keywords=$encoded"
    }

    builder.addUrl(targetUrl)

    val maxJobs = promptInt("Max jobs to scrape? (default 10): ", 10)
    builder.setCount(maxJobs)

    println("\n  Final parameters:")
    println(s"   Target URL: $targetUrl")
    println(s"   Max jobs: $maxJobs")

    print("\nProceed with scrape? (y/n, default y): ")
    Console.out.flush()
    val proceed = StdIn.readLine().trim.toLowerCase
    if (proceed == "n" || proceed == "no") {
      println("Scrape canceled by user.")
      return null
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
}
