package com.reddit.recommender.ingestion

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.concurrent.{Executors, ScheduledExecutorService, TimeUnit}

class ScrapeJobScheduler {
  private val scheduler: ScheduledExecutorService = Executors.newScheduledThreadPool(2)
  private val scrapeService = new ApifyToKafkaService()

   //recurring job
  def scheduleRecurringJob(config: ScrapeConfig, initialDelay: Long, period: Long, unit: TimeUnit): Unit = {
    scheduler.scheduleAtFixedRate(() => runJob(config), initialDelay, period, unit)
  }

  // schedule a daily job at specific hour and minute, merely testing I wont use this though
  def scheduleDailyAt(hour: Int, minute: Int, config: ScrapeConfig): Unit = {
    val now = System.currentTimeMillis()
    val calendar = java.util.Calendar.getInstance()
    calendar.set(java.util.Calendar.HOUR_OF_DAY, hour)
    calendar.set(java.util.Calendar.MINUTE, minute)
    calendar.set(java.util.Calendar.SECOND, 0)
    calendar.set(java.util.Calendar.MILLISECOND, 0)

    if (calendar.getTimeInMillis <= now) {
      calendar.add(java.util.Calendar.DAY_OF_MONTH, 1)
    }

    val initialDelay = calendar.getTimeInMillis - now
    val period = 24 * 60 * 60 * 1000L // 24 hours in milliseconds

    scheduleRecurringJob(config, initialDelay, period, TimeUnit.MILLISECONDS)
  }

  private def runJob(config: ScrapeConfig): Unit = {
    try {
      println("\n" + "=" * 50)
      println("Scheduled job started at: " +
        LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_TIME))

      val result = scrapeService.execute(config)
      result.printReport()

    } catch {
      case e: Exception =>
        System.err.println("Scheduled job failed: " + e.getMessage())
        e.printStackTrace()
    }
  }

  def shutdown(): Unit = {
    scheduler.shutdown()
    try {
      if (!scheduler.awaitTermination(60, TimeUnit.SECONDS)) {
        scheduler.shutdownNow()
      }
    } catch {
      case _: InterruptedException =>
        scheduler.shutdownNow()
        Thread.currentThread().interrupt()
    }
  }
}