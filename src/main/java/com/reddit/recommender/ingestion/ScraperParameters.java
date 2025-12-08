package com.reddit.recommender.ingestion;

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.List;
import java.util.ArrayList;

public class ScraperParameters {
    private JSONObject parameters;

    public ScraperParameters() {
        this.parameters = new JSONObject();
        // Set defaults
        parameters.put("maxPosts", 10);
        parameters.put("scrapeComments", false);
        parameters.put("includeNsfw", false);
        parameters.put("sort", "relevance");
        parameters.put("timeframe", "month");
    }

    // Builder pattern methods

    public ScraperParameters addQuery(String query) {
        if (!parameters.has("queries")) {
            parameters.put("queries", new JSONArray());
        }
        parameters.getJSONArray("queries").put(query);
        return this;
    }

    public ScraperParameters addQueries(List<String> queries) {
        if (!parameters.has("queries")) {
            parameters.put("queries", new JSONArray());
        }
        for (String query : queries) {
            parameters.getJSONArray("queries").put(query);
        }
        return this;
    }

    public ScraperParameters addUrl(String url) {
        if (!parameters.has("urls")) {
            parameters.put("urls", new JSONArray());
        }
        parameters.getJSONArray("urls").put(url);
        return this;
    }

    public ScraperParameters addUrls(List<String> urls) {
        if (!parameters.has("urls")) {
            parameters.put("urls", new JSONArray());
        }
        for (String url : urls) {
            parameters.getJSONArray("urls").put(url);
        }
        return this;
    }

    public ScraperParameters setMaxPosts(int maxPosts) {
        parameters.put("maxPosts", maxPosts);
        return this;
    }

    public ScraperParameters setMaxComments(int maxComments) {
        parameters.put("maxComments", maxComments);
        return this;
    }

    public ScraperParameters setScrapeComments(boolean scrapeComments) {
        parameters.put("scrapeComments", scrapeComments);
        return this;
    }

    public ScraperParameters setIncludeNsfw(boolean includeNsfw) {
        parameters.put("includeNsfw", includeNsfw);
        return this;
    }

    public ScraperParameters setSort(String sort) {
        // Valid values: "relevance", "hot", "top", "new", "comments"
        parameters.put("sort", sort);
        return this;
    }

    public ScraperParameters setTimeframe(String timeframe) {
        // Valid values: "hour", "day", "week", "month", "year", "all"
        parameters.put("timeframe", timeframe);
        return this;
    }

    // Advanced parameters
    public ScraperParameters setProxyConfiguration(JSONObject proxyConfig) {
        parameters.put("proxyConfiguration", proxyConfig);
        return this;
    }

    public ScraperParameters setCustomData(JSONObject customData) {
        parameters.put("customData", customData);
        return this;
    }

    // Clear methods
    public ScraperParameters clearQueries() {
        if (parameters.has("queries")) {
            parameters.remove("queries");
        }
        return this;
    }

    public ScraperParameters clearUrls() {
        if (parameters.has("urls")) {
            parameters.remove("urls");
        }
        return this;
    }

    // Build method
    public JSONObject build() {
        return parameters;
    }

    // Static factory methods for common scenarios

    public static JSONObject createSearchParameters(String query, int maxPosts) {
        return new ScraperParameters()
                .addQuery(query)
                .setMaxPosts(maxPosts)
                .build();
    }

    public static JSONObject createSubredditParameters(String subreddit, int maxPosts) {
        String url = "https://www.reddit.com/r/" + subreddit + "/";
        return new ScraperParameters()
                .addUrl(url)
                .setMaxPosts(maxPosts)
                .build();
    }

    public static JSONObject createAdvancedParameters(List<String> queries, List<String> urls,
                                                      int maxPosts, boolean scrapeComments,
                                                      String sort, String timeframe) {
        ScraperParameters builder = new ScraperParameters()
                .setMaxPosts(maxPosts)
                .setScrapeComments(scrapeComments)
                .setSort(sort)
                .setTimeframe(timeframe);

        if (queries != null) {
            builder.addQueries(queries);
        }

        if (urls != null) {
            builder.addUrls(urls);
        }

        return builder.build();
    }
}