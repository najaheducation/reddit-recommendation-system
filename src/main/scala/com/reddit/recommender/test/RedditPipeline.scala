//package com.reddit.recommender.test
//
//import com.reddit.recommender.storage._
//import org.apache.spark.sql.SparkSession
//
//import java.time.Instant
//import java.util.concurrent.atomic.AtomicBoolean
//
///**
// * Main Reddit Pipeline Controller with Builder Pattern
// * Orchestrates the entire data pipeline from Apify → Kafka → MongoDB
// */
//class RedditPipeline private[controller] (  // Changed from just "private" to "private[controller]"
//                                            // Components
//                                            private val ingestionController: Option[IngestionController],
//                                            private val storageController: Option[StorageController],
//                                            private val sparkSession: Option[SparkSession],
//
//                                            // Configuration
//                                            private val pipelineConfig: PipelineConfig,
//
//                                            // State
//                                            private var ingestionRunning: Boolean = false,
//                                            private var storageRunning: Boolean = false
//                                         ) {
//
//  private val isShuttingDown = new AtomicBoolean(false)
//  private val startTime = Instant.now()
//
//  /**
//   * Start the complete pipeline (ingestion + storage)
//   */
//  def start(): this.type = {
//    println("=" * 60)
//    println(" Starting Complete Reddit Pipeline")
//    println("=" * 60)
//
//    setupShutdownHook()
//
//    // Start ingestion first
//    ingestionController.foreach { controller =>
//      println("📥 Starting Ingestion Pipeline...")
//      controller.start()
//      ingestionRunning = true
//    }
//
//    // Wait a bit for data to arrive in Kafka
//    if (ingestionRunning && storageController.isDefined) {
//      println("⏳ Waiting for initial data in Kafka...")
//      Thread.sleep(5000)
//    }
//
//    // Start storage pipeline
//    storageController.foreach { controller =>
//      println("💾 Starting Storage Pipeline...")
//      controller.start()
//      storageRunning = true
//    }
//
//    println(" Pipeline started successfully")
//    printStatus()
//
//    this
//  }
//
//  /**
//   * Start only the ingestion pipeline
//   */
//  def startIngestion(): this.type = {
//    ingestionController match {
//      case Some(controller) =>
//        println("📥 Starting Ingestion Pipeline...")
//        controller.start()
//        ingestionRunning = true
//        println(" Ingestion started")
//      case None =>
//        println("️  Ingestion not configured")
//    }
//    this
//  }
//
//  /**
//   * Start only the storage pipeline
//   */
//  def startStorage(): this.type = {
//    storageController match {
//      case Some(controller) =>
//        println("💾 Starting Storage Pipeline...")
//        controller.start()
//        storageRunning = true
//        println(" Storage started")
//      case None =>
//        println("️  Storage not configured")
//    }
//    this
//  }
//
//  /**
//   * Stop the complete pipeline
//   */
//  def stop(): this.type = {
//    if (isShuttingDown.compareAndSet(false, true)) {
//      println("\n" + "=" * 60)
//      println("🛑 Stopping Complete Reddit Pipeline")
//      println("=" * 60)
//
//      stopStorage()
//      Thread.sleep(2000) // Wait for storage to flush
//      stopIngestion()
//      stopSpark()
//
//      println(" Pipeline stopped")
//    }
//    this
//  }
//
//  /**
//   * Stop only ingestion
//   */
//  def stopIngestion(): this.type = {
//    if (ingestionRunning) {
//      ingestionController.foreach(_.stop())
//      ingestionRunning = false
//      println(" Ingestion stopped")
//    }
//    this
//  }
//
//  /**
//   * Stop only storage
//   */
//  def stopStorage(): this.type = {
//    if (storageRunning) {
//      storageController.foreach(_.stop())
//      storageRunning = false
//      println(" Storage stopped")
//    }
//    this
//  }
//
//  /**
//   * Run a one-time ingestion job (uses pipeline's default config)
//   */
//  def runOneTimeIngestion(): ScrapeResult = {
//    println("⚡ Running one-time ingestion (default config)...")
//    ingestionController match {
//      case Some(controller) =>
//        val result = controller.runOnce()
//        result.printReport()
//        result
//      case None =>
//        throw new IllegalStateException("Ingestion controller not configured")
//    }
//  }
//
//  /**
//   * Run a one-time ingestion job with custom config
//   */
//  def runOneTimeIngestion(config: ScrapeConfig): ScrapeResult = {
//    println("⚡ Running one-time ingestion with custom config...")
//    ingestionController match {
//      case Some(controller) =>
//        val result = controller.runOnce(config)
//        result.printReport()
//        result
//      case None =>
//        throw new IllegalStateException("Ingestion controller not configured")
//    }
//  }
//
//  /**
//   * Get pipeline status
//   */
//  def getStatus: PipelineStatus = {
//    val now = Instant.now()
//    val uptime = java.time.Duration.between(startTime, now)
//
//    PipelineStatus(
//      ingestion = PipelineComponentStatus(
//        running = ingestionRunning,
//        startedAt = if (ingestionRunning) Some(startTime) else None
//      ),
//      storage = PipelineComponentStatus(
//        running = storageRunning,
//        startedAt = if (storageRunning) Some(startTime) else None
//      ),
//      spark = sparkSession.exists(!_.sparkContext.isStopped),
//      uptime = uptime,
//      config = pipelineConfig
//    )
//  }
//
//  /**
//   * Print current status
//   */
//  def printStatus(): Unit = {
//    val status = getStatus
//    println("\n" + "=" * 40)
//    println(" Pipeline Status")
//    println("=" * 40)
//    println(s"Ingestion: ${if (status.ingestion.running) " RUNNING" else "  STOPPED"}")
//    println(s"Storage:   ${if (status.storage.running) " RUNNING" else "  STOPPED"}")
//    println(s"Spark:     ${if (status.spark) " ACTIVE" else "  STOPPED"}")
//    println(s"Uptime:    ${formatDuration(status.uptime)}")
//    println("=" * 40)
//  }
//
//  /**
//   * Run a test pipeline (for development)
//   */
//  def runTest(): Unit = {
//    println("🧪 Running Test Pipeline...")
//
//    val testConfig = new ScrapeConfig.Builder()
//      .subreddits("test", "programming")
//      .postsPerSource(5)
//      .scrapeComments(false)
//      .build()
//
//    runOneTimeIngestion(testConfig)
//
//    startStorage()
//
//    println("⏳ Running for 30 seconds...")
//    Thread.sleep(30000)
//
//    stop()
//  }
//
//  private def setupShutdownHook(): Unit = {
//    Runtime.getRuntime.addShutdownHook(new Thread(() => {
//      if (!isShuttingDown.get()) {
//        println("\n️  Shutdown signal received!")
//        stop()
//      }
//    }))
//  }
//
//  private def stopSpark(): Unit = {
//    sparkSession.foreach { spark =>
//      if (!spark.sparkContext.isStopped) {
//        spark.stop()
//        println(" Spark stopped")
//      }
//    }
//  }
//
//  private def formatDuration(duration: java.time.Duration): String = {
//    val hours = duration.toHours
//    val minutes = duration.toMinutes % 60
//    val seconds = duration.getSeconds % 60
//    f"$hours%02d:$minutes%02d:$seconds%02d"
//  }
//}
//
///**
// * Builder for RedditPipeline with fluent API
// */
//class RedditPipelineBuilder {
//  private var ingestionConfig: Option[ScrapeConfig] = None
//  private var storageConfig: Option[AppConfig] = None
//  private var sparkSession: Option[SparkSession] = None
//  private var featureExtractorConfig: Option[FeatureExtractorConfig] = None
//  private var pipelineConfig: PipelineConfig = PipelineConfig.default
//
//  /**
//   * Set ingestion configuration
//   */
//  def withIngestion(config: ScrapeConfig): RedditPipelineBuilder = {
//    this.ingestionConfig = Some(config)
//    this
//  }
//
//  /**
//   * Set storage configuration
//   */
//  def withStorage(config: AppConfig): RedditPipelineBuilder = {
//    this.storageConfig = Some(config)
//    this
//  }
//
//  /**
//   * Set custom Spark session
//   */
//  def withSparkSession(spark: SparkSession): RedditPipelineBuilder = {
//    this.sparkSession = Some(spark)
//    this
//  }
//
//  /**
//   * Set feature extractor configuration
//   */
//  def withFeatureExtractor(config: FeatureExtractorConfig): RedditPipelineBuilder = {
//    this.featureExtractorConfig = Some(config)
//    this
//  }
//
//  /**
//   * Set pipeline configuration
//   */
//  def withPipelineConfig(config: PipelineConfig): RedditPipelineBuilder = {
//    this.pipelineConfig = config
//    this
//  }
//
//  /**
//   * Build the pipeline
//   */
//  def build(): RedditPipeline = {
//    // Create controllers based on configuration
//    val ingestionController = ingestionConfig.map { config =>
//      new IngestionController(config)
//    }
//
//    val storageController = (storageConfig, sparkSession) match {
//      case (Some(sConfig), Some(spark)) =>
//        // Apply feature extractor config if provided
//        val finalConfig = featureExtractorConfig match {
//          case Some(feConfig) => sConfig.copy(featureExtractor = Some(feConfig))
//          case None => sConfig
//        }
//        Some(new StorageController(spark, finalConfig))
//      case _ => None
//    }
//
//    new RedditPipeline(
//      ingestionController = ingestionController,
//      storageController = storageController,
//      sparkSession = sparkSession,
//      pipelineConfig = pipelineConfig
//    )
//  }
//}
//
//object RedditPipeline {
//
//  /**
//   * Create a default pipeline with environment configuration
//   */
//  def default(): RedditPipeline = {
//    val builder = new RedditPipelineBuilder()
//
//    // Default ingestion config
//    val ingestionConfig = ScrapeConfig.trendingTechConfig()
//
//    // Default storage config from environment
//    val storageConfig = ConfigLoader.loadFromEnv()
//
//    // Create Spark session
//    val spark = SparkSession.builder()
//      .appName("Reddit-Pipeline-Default")
//      .master("local[*]")
//      .config("spark.sql.streaming.checkpointLocation", "/tmp/spark-checkpoints")
//      .getOrCreate()
//
//    spark.sparkContext.setLogLevel("WARN")
//
//    builder
//      .withIngestion(ingestionConfig)
//      .withStorage(storageConfig)
//      .withSparkSession(spark)
//      .build()
//  }
//
//  /**
//   * Create a pipeline for testing
//   */
//  def forTesting(): RedditPipeline = {
//    val builder = new RedditPipelineBuilder()
//
//    // Minimal ingestion config
//    val ingestionConfig = new ScrapeConfig.Builder()
//      .subreddits("test")
//      .postsPerSource(2)
//      .scrapeComments(false)
//      .build()
//
//    // Minimal storage config
//    val storageConfig = AppConfig(
//      mongo = MongoConfig(sys.env.getOrElse("MONGO_URI", "mongodb://localhost:27017"), "reddit_test", None, None),
//      kafka = KafkaConfig("localhost:9092", "test-group"),
//      topics = List("reddit-posts", "reddit-comments")
//    )
//
//    val spark = SparkSession.builder()
//      .appName("Reddit-Pipeline-Test")
//      .master("local[1]")
//      .config("spark.sql.streaming.checkpointLocation", "/tmp/spark-checkpoints-test")
//      .config("spark.ui.enabled", "false")
//      .getOrCreate()
//
//    spark.sparkContext.setLogLevel("ERROR")
//
//    builder
//      .withIngestion(ingestionConfig)
//      .withStorage(storageConfig)
//      .withSparkSession(spark)
//      .build()
//  }
//
//  /**
//   * Quick start method
//   */
//  def runDefault(): Unit = {
//    val pipeline = default()
//
//    try {
//      pipeline.start()
//
//      // Keep running until shutdown
//      while (pipeline.getStatus.ingestion.running || pipeline.getStatus.storage.running) {
//        Thread.sleep(5000)
//        pipeline.printStatus()
//      }
//    } catch {
//      case e: Exception =>
//        println(s" Pipeline failed: ${e.getMessage}")
//        pipeline.stop()
//    }
//  }
//}
//
///**
// * Configuration for the entire pipeline
// */
//case class PipelineConfig(
//                           name: String = "reddit-pipeline",
//                           mode: String = "full", // "full", "ingestion-only", "storage-only"
//                           healthCheckInterval: Int = 30, // seconds
//                           metricsEnabled: Boolean = true
//                         )
//
//object PipelineConfig {
//  val default: PipelineConfig = PipelineConfig()
//}
//
///**
// * Status classes
// */
//case class PipelineComponentStatus(
//                                    running: Boolean,
//                                    startedAt: Option[Instant]
//                                  )
//
//case class PipelineStatus(
//                           ingestion: PipelineComponentStatus,
//                           storage: PipelineComponentStatus,
//                           spark: Boolean,
//                           uptime: java.time.Duration,
//                           config: PipelineConfig
//                         )