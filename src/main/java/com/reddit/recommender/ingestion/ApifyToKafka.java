package com.reddit.recommender.ingestion;

import java.util.Arrays;

public class ApifyToKafka {
    public static void main(String[] args) {
        if (args.length == 0) {
            runDefaultPipeline();
        } else {
            runWithArgs(args);
        }
    }

    private static void runDefaultPipeline() {
        System.out.println("=== Starting Apify to Kafka Service ===");

        ScrapeConfig config = new ScrapeConfig.Builder()
                .subreddits("programming", "technology", "gaming")
                .postsPerSource(20)
                .build();

        ApifyToKafkaService service = new ApifyToKafkaService();
        ScrapeResult result = service.execute(config);

        result.printReport();
    }

    private static void runWithArgs(String[] args) {
        ScrapeConfig.Builder builder = new ScrapeConfig.Builder();

        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--subreddits":
                    builder.subreddits(Arrays.copyOfRange(args, i + 1, args.length));
                    break;
                case "--keywords":
                    builder.keywords(Arrays.copyOfRange(args, i + 1, args.length));
                    break;
                case "--posts":
                    builder.postsPerSource(Integer.parseInt(args[++i]));
                    break;
                case "--comments":
                    builder.scrapeComments(true);
                    break;
                case "--timeframe":
                    builder.timeframe(args[++i]);
                    break;
            }
        }

        ApifyToKafkaService service = new ApifyToKafkaService();
        service.execute(builder.build()).printReport();
    }
}