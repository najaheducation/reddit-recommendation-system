package com.reddit.recommender.ingestion;

import com.reddit.recommender.api.ApifyClient;
import com.reddit.recommender.api.ScraperParameters;
import com.reddit.recommender.kafka.SimpleKafkaProducer;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;

public class ApifyToKafkaService {

    private final ApifyClient apifyClient;
    private SimpleKafkaProducer kafkaProducer;

    public ApifyToKafkaService() {
        this.apifyClient = new ApifyClient();
    }

    public ApifyToKafkaService(ApifyClient apifyClient) {
        this.apifyClient = apifyClient;
    }

    /**
     * Execute a scrape job with the given configuration
     */
    public ScrapeResult execute(ScrapeConfig config) {
        ScrapeResult result = new ScrapeResult();
        this.kafkaProducer = new SimpleKafkaProducer();

        try {
            // Process subreddits
            for (String subreddit : config.getSubreddits()) {
                processSource(result, "r/" + subreddit, createSubredditParams(subreddit, config));
                delay(config.getDelayBetweenSourcesMs());
            }

            // Process keywords
            for (String keyword : config.getKeywords()) {
                processSource(result, "keyword:" + keyword, createKeywordParams(keyword, config));
                delay(config.getDelayBetweenSourcesMs());
            }

            // Process URLs
            for (String url : config.getUrls()) {
                processSource(result, "url:" + url, createUrlParams(url, config));
                delay(config.getDelayBetweenSourcesMs());
            }

        } finally {
            if (kafkaProducer != null) {
                kafkaProducer.flush();
                kafkaProducer.close();
            }
            result.complete();
        }

        return result;
    }

    /**
     * Execute with automatic retry logic
     */
    public ScrapeResult executeWithRetry(ScrapeConfig config) {
        for (int attempt = 1; attempt <= config.getMaxRetries(); attempt++) {
            try {
                System.out.println("Attempt " + attempt + " of " + config.getMaxRetries());
                return execute(config);

            } catch (Exception e) {
                if (attempt == config.getMaxRetries()) {
                    throw new RuntimeException("Failed after " + config.getMaxRetries() + " attempts", e);
                }

                long backoffTime = 5000L * attempt; // Exponential backoff
                System.err.println("Attempt " + attempt + " failed: " + e.getMessage());
                System.err.println("Retrying in " + (backoffTime/1000) + " seconds...");
                delay(backoffTime);
            }
        }

        throw new IllegalStateException("Should not reach here");
    }

    /**
     * Process a single source (subreddit, keyword, or URL)
     */
    private void processSource(ScrapeResult result, String source, JSONObject params) {
        try {
            System.out.println("\nProcessing: " + source);

            // Scrape data from Apify
            JSONArray scrapedData = scrapeWithRetry(source, params, 3);

            // Send to Kafka
            int postsSent = 0;
            int commentsSent = 0;

            for (int i = 0; i < scrapedData.length(); i++) {
                JSONObject item = scrapedData.getJSONObject(i);

                if (isPost(item)) {
                    kafkaProducer.sendPost(item);
                    postsSent++;
                } else if (isComment(item)) {
                    kafkaProducer.sendComment(item);
                    commentsSent++;
                }

                // Small batch flush every 10 items
                if ((postsSent + commentsSent) % 10 == 0) {
                    kafkaProducer.flush();
                }
            }

            kafkaProducer.flush();
            result.addSuccess(source, postsSent, commentsSent);

            System.out.printf("✓ %s: %d posts, %d comments%n",
                    source, postsSent, commentsSent);

        } catch (Exception e) {
            result.addFailure(source, e.getMessage());
            System.err.println("✗ " + source + ": " + e.getMessage());
        }
    }

    /**
     * Scrape with retry logic
     */
    private JSONArray scrapeWithRetry(String source, JSONObject params, int maxRetries) throws Exception {
        Exception lastException = null;

        for (int i = 0; i < maxRetries; i++) {
            try {
                return apifyClient.scrapeReddit(params);
            } catch (Exception e) {
                lastException = e;
                if (i < maxRetries - 1) {
                    System.err.println("Retry " + (i + 1) + " for " + source);
                    delay(2000L * (i + 1));
                }
            }
        }

        throw new RuntimeException("Failed to scrape " + source + " after " + maxRetries + " attempts",
                lastException);
    }

    /**
     * Create parameters for subreddit scraping
     */
    private JSONObject createSubredditParams(String subreddit, ScrapeConfig config) {
        return new ScraperParameters()
                .addUrl("https://www.reddit.com/r/" + subreddit + "/")
                .setMaxPosts(config.getPostsPerSource())
                .setMaxComments(config.getMaxCommentsPerPost())
                .setScrapeComments(config.isScrapeComments())
                .setTimeframe(config.getTimeframe())
                .setSort(config.getSort())
                .setIncludeNsfw(config.isIncludeNsfw())
                .build();
    }

    /**
     * Create parameters for keyword search
     */
    private JSONObject createKeywordParams(String keyword, ScrapeConfig config) {
        return new ScraperParameters()
                .addQuery(keyword)
                .setMaxPosts(config.getPostsPerSource())
                .setMaxComments(config.getMaxCommentsPerPost())
                .setScrapeComments(config.isScrapeComments())
                .setTimeframe(config.getTimeframe())
                .setSort(config.getSort())
                .setIncludeNsfw(config.isIncludeNsfw())
                .build();
    }

    /**
     * Create parameters for specific URL
     */
    private JSONObject createUrlParams(String url, ScrapeConfig config) {
        return new ScraperParameters()
                .addUrl(url)
                .setMaxPosts(config.getPostsPerSource())
                .setMaxComments(config.getMaxCommentsPerPost())
                .setScrapeComments(config.isScrapeComments())
                .setTimeframe(config.getTimeframe())
                .setSort(config.getSort())
                .setIncludeNsfw(config.isIncludeNsfw())
                .build();
    }

    private boolean isPost(JSONObject item) {
        return item.has("title") && item.has("subreddit");
    }

    private boolean isComment(JSONObject item) {
        return item.has("body") && item.has("parentId");
    }

    private void delay(long milliseconds) {
        if (milliseconds <= 0) return;

        try {
            Thread.sleep(milliseconds);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}