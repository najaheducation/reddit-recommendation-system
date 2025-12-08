package com.reddit.recommender.ingestion;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class ScrapeJobScheduler {

    private final ScheduledExecutorService scheduler;
    private final ApifyToKafkaService scrapeService;

    public ScrapeJobScheduler() {
        this.scheduler = Executors.newScheduledThreadPool(2);
        this.scrapeService = new ApifyToKafkaService();
    }

    /**
     * Schedule a recurring job
     */
    public void scheduleRecurringJob(ScrapeConfig config, long initialDelay,
                                     long period, TimeUnit unit) {
        scheduler.scheduleAtFixedRate(() -> {
            try {
                System.out.println("\n" + "=".repeat(50));
                System.out.println("Scheduled job started at: " +
                        LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_TIME));

                ScrapeResult result = scrapeService.execute(config);
                result.printReport();

            } catch (Exception e) {
                System.err.println("Scheduled job failed: " + e.getMessage());
            }
        }, initialDelay, period, unit);
    }

    /**
     * Schedule a daily job at specific hour
     */
    public void scheduleDailyAt(int hour, int minute, ScrapeConfig config) {
        long now = System.currentTimeMillis();
        java.util.Calendar calendar = java.util.Calendar.getInstance();
        calendar.set(java.util.Calendar.HOUR_OF_DAY, hour);
        calendar.set(java.util.Calendar.MINUTE, minute);
        calendar.set(java.util.Calendar.SECOND, 0);

        if (calendar.getTimeInMillis() <= now) {
            calendar.add(java.util.Calendar.DAY_OF_MONTH, 1);
        }

        long initialDelay = calendar.getTimeInMillis() - now;
        long period = 24 * 60 * 60 * 1000; // 24 hours

        scheduleRecurringJob(config, initialDelay, period, TimeUnit.MILLISECONDS);
    }

    public void shutdown() {
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(60, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
        }
    }
}
