//package com.reddit.recommender.ingestion;
//
//import java.util.ArrayList;
//import java.util.Arrays;
//import java.util.List;
//
//public class ScrapeConfig {
//    private List<String> subreddits;
//    private List<String> keywords;
//    private List<String> urls;
//    private int postsPerSource;
//    private int maxCommentsPerPost;
//    private boolean scrapeComments;
//    private String timeframe;
//    private String sort;
//    private boolean includeNsfw;
//    private int maxRetries;
//    private long delayBetweenSourcesMs;
//
//    private ScrapeConfig(Builder builder) {
//        this.subreddits = builder.subreddits;
//        this.keywords = builder.keywords;
//        this.urls = builder.urls;
//        this.postsPerSource = builder.postsPerSource;
//        this.maxCommentsPerPost = builder.maxCommentsPerPost;
//        this.scrapeComments = builder.scrapeComments;
//        this.timeframe = builder.timeframe;
//        this.sort = builder.sort;
//        this.includeNsfw = builder.includeNsfw;
//        this.maxRetries = builder.maxRetries;
//        this.delayBetweenSourcesMs = builder.delayBetweenSourcesMs;
//    }
//
//    // Builder class
//    public static class Builder {
//        private List<String> subreddits = new ArrayList<>();
//        private List<String> keywords = new ArrayList<>();
//        private List<String> urls = new ArrayList<>();
//        private int postsPerSource = 10;
//        private int maxCommentsPerPost = 5;
//        private boolean scrapeComments = false;
//        private String timeframe = "day";
//        private String sort = "relevance";
//        private boolean includeNsfw = false;
//        private int maxRetries = 3;
//        private long delayBetweenSourcesMs = 2000;
//
//        public Builder subreddits(String... subreddits) {
//            this.subreddits = Arrays.asList(subreddits);
//            return this;
//        }
//
//        public Builder subreddits(List<String> subreddits) {
//            this.subreddits = subreddits;
//            return this;
//        }
//
//        public Builder keywords(String... keywords) {
//            this.keywords = Arrays.asList(keywords);
//            return this;
//        }
//
//        public Builder urls(String... urls) {
//            this.urls = Arrays.asList(urls);
//            return this;
//        }
//
//        public Builder postsPerSource(int postsPerSource) {
//            if (postsPerSource < 10 || postsPerSource > 30) {
//                throw new IllegalArgumentException("postsPerSource must be between 10 and 30");
//            }
//            this.postsPerSource = postsPerSource;
//            return this;
//        }
//
//        public Builder maxCommentsPerPost(int maxCommentsPerPost) {
//            this.maxCommentsPerPost = maxCommentsPerPost;
//            return this;
//        }
//
//        public Builder scrapeComments(boolean scrapeComments) {
//            this.scrapeComments = scrapeComments;
//            return this;
//        }
//
//        public Builder timeframe(String timeframe) {
//            this.timeframe = timeframe;
//            return this;
//        }
//
//        public Builder sort(String sort) {
//            this.sort = sort;
//            return this;
//        }
//
//        public Builder includeNsfw(boolean includeNsfw) {
//            this.includeNsfw = includeNsfw;
//            return this;
//        }
//
//        public Builder maxRetries(int maxRetries) {
//            this.maxRetries = maxRetries;
//            return this;
//        }
//
//        public Builder delayBetweenSourcesMs(long delay) {
//            this.delayBetweenSourcesMs = delay;
//            return this;
//        }
//
//        public ScrapeConfig build() {
//            validate();
//            return new ScrapeConfig(this);
//        }
//
//        private void validate() {
//            if (subreddits.isEmpty() && keywords.isEmpty() && urls.isEmpty()) {
//                throw new IllegalStateException("At least one source (subreddits, keywords, or urls) must be specified");
//            }
//        }
//    }
//
//    // Getters
//    public List<String> getSubreddits() { return new ArrayList<>(subreddits); }
//    public List<String> getKeywords() { return new ArrayList<>(keywords); }
//    public List<String> getUrls() { return new ArrayList<>(urls); }
//    public int getPostsPerSource() { return postsPerSource; }
//    public int getMaxCommentsPerPost() { return maxCommentsPerPost; }
//    public boolean isScrapeComments() { return scrapeComments; }
//    public String getTimeframe() { return timeframe; }
//    public String getSort() { return sort; }
//    public boolean isIncludeNsfw() { return includeNsfw; }
//    public int getMaxRetries() { return maxRetries; }
//    public long getDelayBetweenSourcesMs() { return delayBetweenSourcesMs; }
//
//    // Factory methods for common configurations
//    // In ScrapeConfig.java, update trendingTechConfig():
//    public static ScrapeConfig trendingTechConfig() {
//        return new Builder()
//                .subreddits("programming", "technology", "gaming", "MachineLearning", "datascience")
//                .postsPerSource(10)     // Changed from 50 to 10
//                .timeframe("month")     // Changed from "day" to "month"
//                .sort("new")            // Changed from "hot" to "new"
//                .scrapeComments(true)   // Changed from false to true
//                .maxCommentsPerPost(1)  // Added this!
//                .build();
//    }
//
//    public static ScrapeConfig newsMonitoringConfig() {
//        return new Builder()
//                .keywords("news", "breaking", "update")
//                .subreddits("worldnews", "news", "politics")
//                .postsPerSource(100)
//                .timeframe("hour")
//                .sort("new")
//                .scrapeComments(true)
//                .maxCommentsPerPost(3)
//                .build();
//    }
//
//    public static ScrapeConfig competitorMonitoringConfig(String... competitorNames) {
//        return new Builder()
//                .keywords(competitorNames)
//                .postsPerSource(20)
//                .timeframe("week")
//                .sort("relevance")
//                .scrapeComments(true)
//                .maxCommentsPerPost(5)
//                .build();
//    }
//}