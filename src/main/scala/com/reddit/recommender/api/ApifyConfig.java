//package com.reddit.recommender.api;
//
//import java.nio.file.Files;
//import java.nio.file.Paths;
//import java.util.stream.Collectors;
//
//public class ApifyConfig {
//    private String apiToken;
//    private String actorId;
//
//    public ApifyConfig() {
//        loadFromEnv();
//    }
//
//    public ApifyConfig(String apiToken, String actorId) {
//        this.apiToken = apiToken;
//        this.actorId = actorId;
//    }
//
//    private void loadFromEnv() {
//        try {
//            String envContent = Files.lines(Paths.get(".env"))
//                    .collect(Collectors.joining("\n"));
//
//            this.apiToken = extractValue(envContent, "APIFY_API_TOKEN");
//            this.actorId = extractValue(envContent, "APIFY_REDDIT_ACTOR_ID");
//
//            if (apiToken == null || actorId == null) {
//                throw new RuntimeException("Missing APIFY_API_TOKEN or APIFY_REDDIT_ACTOR_ID in .env");
//            }
//
//        } catch (Exception e) {
//            throw new RuntimeException("Failed to load configuration: " + e.getMessage(), e);
//        }
//    }
//
//    private String extractValue(String envContent, String key) {
//        if (envContent == null) return null;
//        for (String line : envContent.split("\n")) {
//            if (line.startsWith(key + "=")) {
//                return line.substring(key.length() + 1).trim();
//            }
//        }
//        return null;
//    }
//
//    // Getters
//    public String getApiToken() { return apiToken; }
//    public String getActorId() { return actorId; }
//    public String getApiActorId() { return actorId.replace("/", "~"); }
//
//
//    // no setters
//
//}