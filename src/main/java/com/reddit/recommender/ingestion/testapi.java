package com.reddit.recommender.ingestion;
import com.reddit.recommender.ingestion.ScraperParameters;
import com.reddit.recommender.ingestion.ApifyClient;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Arrays;

public class testapi {
    public static void main(String[] args) {
        try {
            // Create client
            ApifyClient client = new ApifyClient();

            // Example 1: Using JSON parameters directly
            System.out.println("\n=== Example 1: Direct JSON ===");
            JSONObject params1 = new JSONObject();
            params1.put("includeNsfw", false);
            params1.put("maxComments", 1);
            params1.put("maxPosts", 10);

            JSONArray queries = new JSONArray();
            queries.put("palestine");
            params1.put("queries", queries);

            params1.put("scrapeComments", true);
            params1.put("sort", "new");
            params1.put("timeframe", "month");

            JSONArray urls = new JSONArray();
            urls.put("https://www.reddit.com/r/badempanadas/");
            params1.put("urls", urls);

            JSONArray results1 = client.scrapeReddit(params1);
            System.out.println("Scraped " + results1.length() + " items.");

            // Example 2: Using the ScraperParameters builder
            System.out.println("\n=== Example 2: Using Builder ===");
            JSONObject params2 = new ScraperParameters()
                    .addQuery("palestine")
                    .addQuery("gaza")
                    .addUrl("https://www.reddit.com/r/Palestine/")
                    .addUrl("https://www.reddit.com/r/worldnews/")
                    .setMaxPosts(20)
                    .setMaxComments(5)
                    .setScrapeComments(true)
                    .setIncludeNsfw(false)
                    .setSort("new")
                    .setTimeframe("week")
                    .build();

            JSONArray results2 = client.scrapeReddit(params2);
            System.out.println("Scraped " + results2.length() + " items.");

            // Example 3: Async scraping (don't wait)
            System.out.println("\n=== Example 3: Async Scraping ===");
            JSONObject params3 = ScraperParameters.createSearchParameters("bigdata", 15);
            JSONArray runInfo = client.scrapeReddit(params3, false);

            String runId = runInfo.getJSONObject(0).getString("runId");
            System.out.println("Run started with ID: " + runId);

            // You can check status later
            Thread.sleep(30000);
            JSONObject status = client.getRunStatus(runId);
            System.out.println("Current status: " + status.getJSONObject("data").getString("status"));

            // Example 4: Process results
            System.out.println("\n=== Example 4: Processing Results ===");
            for (int i = 0; i < Math.min(5, results2.length()); i++) {
                JSONObject post = results2.getJSONObject(i);
                System.out.println("\nPost " + (i + 1) + ":");
                System.out.println("Title: " + post.optString("title", "N/A"));
                System.out.println("Subreddit: " + post.optString("subreddit", "N/A"));
                System.out.println("Upvotes: " + post.optInt("upvotes", 0));
                System.out.println("URL: https://reddit.com" + post.optString("url", ""));

                // Check if there are comments
                if (post.has("comments") && post.getJSONArray("comments").length() > 0) {
                    JSONObject comment = post.getJSONArray("comments").getJSONObject(0);
                    System.out.println("Top comment: " + comment.optString("text", "").substring(0, Math.min(100, comment.optString("text", "").length())) + "...");
                }
            }

        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}