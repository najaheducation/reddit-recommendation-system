package com.reddit.recommender;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.stream.Collectors;
import org.json.JSONArray;
import org.json.JSONObject;

public class TestApifyConnection {
    public static void main(String[] args) throws Exception {
        HttpURLConnection connection = null;
        try {
            // --- 1. LOAD YOUR CREDENTIALS ---
            String envContent = Files.lines(Paths.get(".env"), StandardCharsets.UTF_16)
                    .collect(Collectors.joining("\n"));


            String apiToken = extractValue(envContent, "APIFY_API_TOKEN");
            String actorId = extractValue(envContent, "APIFY_REDDIT_ACTOR_ID");

            if (apiToken == null || actorId == null) {
                System.err.println("ERROR: Missing APIFY_API_TOKEN or APIFY_REDDIT_ACTOR_ID in .env");
                return;
            }
            System.out.println("[INFO] Loaded Actor ID: " + actorId);
            String apiActorId = actorId.replace("/", "~");
            // --- 2. BUILD THE CORRECT URL ---
            String urlString = "https://api.apify.com/v2/acts/" + apiActorId + "/runs";


            System.out.println("[INFO] Request URL: " + urlString);
            URL url = new URL(urlString);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + apiToken);
            connection.setDoOutput(true);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(60000);

            // Create JSON input
            JSONObject input = new JSONObject();
            input.put("queries", new JSONArray().put("bigdata"));
            input.put("scrapeComments", false);
            input.put("maxPosts", 10);

            // Write JSON to request body
            try (OutputStreamWriter writer = new OutputStreamWriter(connection.getOutputStream())) {
                writer.write(input.toString());
            }

            // --- 3. SEND THE REQUEST ---
            System.out.println("[INFO] Sending POST request to Apify API...");

            // --- 4. READ RESPONSE & HANDLE ERRORS ---
            int status = connection.getResponseCode();
            System.out.println("\n=== HTTP RESPONSE ===");
            System.out.println("Status Code: " + status + " " + getStatusMessage(status));

            String responseBody;
            if (status >= 200 && status < 300) {
                responseBody = readStream(connection.getInputStream());
                System.out.println("[SUCCESS] Actor run started!");
                System.out.println("Response: " + responseBody);
            } else {
                responseBody = readStream(connection.getErrorStream());
                System.err.println("[ERROR] API Request Failed!");
                System.err.println("Raw error response: " + responseBody);
            }

        } catch (Exception e) {
            System.err.println("[FATAL] Unexpected error: " + e.getMessage());
            e.printStackTrace();
        } finally {
            if (connection != null) {
                connection.disconnect();
                System.out.println("[INFO] Connection closed.");
            }
        }
    }

    // Helper methods remain the same
    private static String readStream(InputStream inputStream) throws IOException {
        if (inputStream == null) return "";
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
            return reader.lines().collect(Collectors.joining("\n"));
        }
    }

    private static String extractValue(String envContent, String key) {
        for (String line : envContent.split("\n")) {
            if (line.startsWith(key + "=")) {
                return line.substring(key.length() + 1).trim();
            }
        }
        return null;
    }

    private static String getStatusMessage(int status) {
        switch (status) {
            case 200: return "OK";
            case 400: return "Bad Request (check your parameters)";
            case 401: return "Unauthorized (check API token)";
            case 404: return "Not Found (check Actor ID)";
            case 415: return "Unsupported Media Type (wrong content type)";
            case 429: return "Too Many Requests";
            case 500: return "Internal Server Error (Apify side)";
            default: return "";
        }
    }
}