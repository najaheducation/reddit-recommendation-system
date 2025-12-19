package com.reddit.recommender.test;

import java.util.concurrent.TimeUnit;

public class UsageExamples {}
//
//    public static void main(String[] args) {
//        // Example 1: Simple one-off scrape
//        example1_simpleScrape();
//
//       // // Example 2: Complex configuration
////      example2_complexScrape();
// //      // Example 3: Scheduled job
//     //  example3_scheduledScrape();
////
////       // Example 4: Using factory methods
////      example4_factoryConfigs();
//
//    //    scheduleAt1148PM();
//    }
//
//    private static void example1_simpleScrape() {
//        System.out.println("\n=== Example 1: Simple Subreddit Scrape ===");
//
//        ScrapeConfig config = new ScrapeConfig.Builder()
//                .subreddits("programming", "technology")
//                .postsPerSource(10)
//                .build();
//
//        ApifyToKafkaService service = new ApifyToKafkaService();
//        ScrapeResult result = service.execute(config);
//
//        result.printReport();
//    }
//
//    private static void example2_complexScrape() {
//        System.out.println("\n=== Example 2: Complex Multi-Source Scrape ===");
//
//        ScrapeConfig config = new ScrapeConfig.Builder()
//                .subreddits("datascience", "MachineLearning", "artificial")
//                .keywords("deep learning", "neural network", "LLM")
//                .postsPerSource(10)
//                .scrapeComments(true)
//                .maxCommentsPerPost(3)
//                .timeframe("week")
//                .sort("top")
//                //.includeNsfw(false)
//                .maxRetries(3)
//                .delayBetweenSourcesMs(3000)
//                .build();
//
//        ApifyToKafkaService service = new ApifyToKafkaService();
//        ScrapeResult result = service.executeWithRetry(config);
//
//        result.printReport();
//    }
//    private static void scheduleAt1148PM() {
//        System.out.println("\n=== Scheduling Daily Job at 0:15 AM ===");
//
//        ScrapeConfig trendingConfig = ScrapeConfig.trendingTechConfig();
//        ScrapeJobScheduler scheduler = new ScrapeJobScheduler();
//
//        // Schedule daily at 11:48 PM (23:48)
//        scheduler.scheduleDailyAt(17, 32, trendingConfig);
//
//        System.out.println("Job scheduled to run daily at 0:15 AM");
//        System.out.println("The scheduler will keep running in the background.");
//
//        // Keep the program alive (or run as a service)
//        Runtime.getRuntime().addShutdownHook(new Thread(scheduler::shutdown));
//
//        // For testing, you can wait a bit to see it work
//        try {
//            Thread.sleep(60000); // Wait 1 minute to see output
//        } catch (InterruptedException e) {
//            Thread.currentThread().interrupt();
//        }
//    }
//    private static void example3_scheduledScrape() {
//        System.out.println("\n=== Example 3: Scheduled Trending Scraper ===");
//
//        ScrapeConfig trendingConfig = ScrapeConfig.trendingTechConfig();
//        ScrapeJobScheduler scheduler = new ScrapeJobScheduler();
//
//        // Run every 6 hours
//        scheduler.scheduleRecurringJob(trendingConfig, 0, 6, TimeUnit.HOURS);
//
//        // Or schedule daily at 2 AM
//        // scheduler.scheduleDailyAt(2, 0, trendingConfig);
//
//        // Keep running for demonstration
//        try {
//            Thread.sleep(30000); // Run for 30 seconds for demo
//        } catch (InterruptedException e) {
//            Thread.currentThread().interrupt();
//        }
//
//        scheduler.shutdown();
//    }
//
//    private static void example4_factoryConfigs() {
//        System.out.println("\n=== Example 4: Using Factory Configurations ===");
//
//        ApifyToKafkaService service = new ApifyToKafkaService();
//
//        // Use pre-defined configurations
//        ScrapeResult newsResult = service.execute(ScrapeConfig.newsMonitoringConfig());
//        newsResult.printReport();
//
//        // Custom competitor monitoring
//        ScrapeConfig competitorConfig = ScrapeConfig.competitorMonitoringConfig(
//                "OpenAI", "Google", "Microsoft", "Amazon"
//        );
//        ScrapeResult competitorResult = service.execute(competitorConfig);
//        competitorResult.printReport();
//    }
//}