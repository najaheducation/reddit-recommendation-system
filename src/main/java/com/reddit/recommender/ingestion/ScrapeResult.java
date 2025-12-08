package com.reddit.recommender.ingestion;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ScrapeResult {
    private int totalPosts;
    private int totalComments;
    private long startTime;
    private long endTime;
    private List<String> successfulSources;
    private Map<String, String> failedSources; // source -> error message
    private Map<String, Integer> postsBySubreddit;
    private Map<String, Integer> commentsBySubreddit;

    public ScrapeResult() {
        this.successfulSources = new ArrayList<>();
        this.failedSources = new HashMap<>();
        this.postsBySubreddit = new HashMap<>();
        this.commentsBySubreddit = new HashMap<>();
        this.startTime = System.currentTimeMillis();
    }

    // Builder-style methods for fluent usage
    public ScrapeResult addSuccess(String source, int posts, int comments) {
        successfulSources.add(source);
        totalPosts += posts;
        totalComments += comments;

        // Track by subreddit (extract subreddit from source if possible)
        String subreddit = extractSubreddit(source);
        if (subreddit != null) {
            postsBySubreddit.merge(subreddit, posts, Integer::sum);
            if (comments > 0) {
                commentsBySubreddit.merge(subreddit, comments, Integer::sum);
            }
        }

        return this;
    }

    public ScrapeResult addFailure(String source, String error) {
        failedSources.put(source, error);
        return this;
    }

    public ScrapeResult complete() {
        this.endTime = System.currentTimeMillis();
        return this;
    }

    private String extractSubreddit(String source) {
        if (source.startsWith("r/")) {
            return source;
        } else if (source.contains("reddit.com/r/")) {
            // Extract from URL
            String[] parts = source.split("/r/");
            if (parts.length > 1) {
                String sub = parts[1].split("/")[0];
                return "r/" + sub;
            }
        } else if (source.startsWith("keyword:")) {
            return "keyword:" + source.substring(8);
        }
        return source;
    }

    // Getters
    public int getTotalPosts() { return totalPosts; }
    public int getTotalComments() { return totalComments; }
    public long getDurationMs() { return endTime - startTime; }
    public double getPostsPerSecond() {
        long duration = getDurationMs();
        return duration > 0 ? (totalPosts * 1000.0) / duration : 0;
    }
    public List<String> getSuccessfulSources() { return new ArrayList<>(successfulSources); }
    public Map<String, String> getFailedSources() { return new HashMap<>(failedSources); }
    public Map<String, Integer> getPostsBySubreddit() { return new HashMap<>(postsBySubreddit); }
    public Map<String, Integer> getCommentsBySubreddit() { return new HashMap<>(commentsBySubreddit); }

    public String getSummary() {
        return String.format(
                "Scrape completed in %.2f seconds. Posts: %d, Comments: %d, Success: %d, Failed: %d",
                getDurationMs() / 1000.0, totalPosts, totalComments,
                successfulSources.size(), failedSources.size()
        );
    }

    public void printReport() {
        System.out.println("\n" + "=".repeat(50));
        System.out.println("SCRAPE REPORT");
        System.out.println("=".repeat(50));
        System.out.println(getSummary());
        System.out.println("\nPosts per second: " + String.format("%.2f", getPostsPerSecond()));

        if (!postsBySubreddit.isEmpty()) {
            System.out.println("\nPosts by Subreddit:");
            postsBySubreddit.forEach((sub, count) ->
                    System.out.printf("  %-20s: %d posts%n", sub, count));
        }

        if (!failedSources.isEmpty()) {
            System.out.println("\nFailed Sources:");
            failedSources.forEach((source, error) ->
                    System.out.printf("  %-30s: %s%n", source, error));
        }
        System.out.println("=".repeat(50));
    }
}