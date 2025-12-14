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

public class testAPI{
    public static void main(String[] args) throws Exception {
        HttpURLConnection connection = null;

        try {
            // --- 1. LOAD YOUR CREDENTIALS ---
            String envContent = Files.lines(Paths.get(".env"))
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
            String urlString = "https://api.apify.com/v2/acts/" + apiActorId + "/runs?token=" + apiToken;
            System.out.println("[INFO] Request URL: " + urlString);

            // --- 3. CREATE INPUT PARAMETERS ---

            JSONObject input = new JSONObject();
            input.put("queries", new JSONArray().put("palestine"));
            input.put("urls", new JSONArray().put("https://www.reddit.com/r/Palestine/"));
            ///input.put("urls", new JSONArray()
            ///     .put("https://www.reddit.com/r/Palestine/")
            ///     .put("https://www.reddit.com/r/worldnews/"));


            input.put("maxPosts", 10);
            input.put("maxComments", 1);
            input.put("scrapeComments", true);
            input.put("includeNsfw", false);
            input.put("sort", "new");
            input.put("timeframe", "month");


            System.out.println("[INFO] Input parameters: " + input.toString());

            // --- 4. SEND THE REQUEST ---
            URL url = new URL(urlString);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + apiToken);
            connection.setDoOutput(true);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(60000);

            // Write JSON to request body
            try (OutputStreamWriter writer = new OutputStreamWriter(connection.getOutputStream())) {
                writer.write(input.toString());
            }

            // --- 5. READ RESPONSE & HANDLE ERRORS ---
            int status = connection.getResponseCode();
            System.out.println("\n=== HTTP RESPONSE ===");
            System.out.println("Status Code: " + status + " " + getStatusMessage(status));

            String responseBody;
            if (status >= 200 && status < 300) {
                responseBody = readStream(connection.getInputStream());
                System.out.println("[SUCCESS] Actor run started!");
                System.out.println("Response: " + responseBody);

                // --- 6. EXTRACT RUN AND DATASET IDs ---
                JSONObject response = new JSONObject(responseBody);
                JSONObject data = response.getJSONObject("data");
                String runId = data.getString("id");
                String datasetId = data.getString("defaultDatasetId");

                System.out.println("[INFO] Run ID: " + runId);
                System.out.println("[INFO] Dataset ID: " + datasetId);

                // --- 7. WAIT FOR COMPLETION ---
                System.out.println("[INFO] Waiting for Actor to complete (30 seconds)...");
                Thread.sleep(30000);

                // Optional: Poll for actual completion instead of fixed sleep
                // String statusUrl = "https://api.apify.com/v2/actor-runs/" + runId + "?token=" + apiToken;
                // You could add polling logic here to check status until "SUCCEEDED"

                // --- 8. FETCH RESULTS ---
                String dataUrl = "https://api.apify.com/v2/datasets/" + datasetId + "/items?token=" + apiToken;
                System.out.println("[INFO] Fetching results from: " + dataUrl);

                HttpURLConnection dataConnection = (HttpURLConnection) new URL(dataUrl).openConnection();
                dataConnection.setRequestMethod("GET");
                dataConnection.setConnectTimeout(10000);
                dataConnection.setReadTimeout(60000);

                int dataStatus = dataConnection.getResponseCode();
                if (dataStatus >= 200 && dataStatus < 300) {
                    String results = readStream(dataConnection.getInputStream());
                    JSONArray resultsArray = new JSONArray(results);
                    System.out.println("\n=== RESULTS ===");
                    System.out.println("Total posts scraped: " + resultsArray.length());

                    // Print first few results
                    for (int i = 0; i < Math.min(3, resultsArray.length()); i++) {
                        JSONObject post = resultsArray.getJSONObject(i);
                        System.out.println("\nPost " + (i + 1) + ":");
                        System.out.println("Title: " + post.optString("title", "N/A"));
                        System.out.println("Author: " + post.optString("author", "N/A"));
                        System.out.println("Upvotes: " + post.optInt("upvotes", 0));
                        System.out.println("URL: " + post.optString("url", "N/A"));
                    }
                } else {
                    String error = readStream(dataConnection.getErrorStream());
                    System.err.println("[ERROR] Failed to fetch results: " + error);
                }

                dataConnection.disconnect();

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

    // Helper method to read stream
    private static String readStream(InputStream inputStream) throws IOException {
        if (inputStream == null) return "";
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
            return reader.lines().collect(Collectors.joining("\n"));
        }
    }

    // Helper method to extract values from .env file
    private static String extractValue(String envContent, String key) {
        for (String line : envContent.split("\n")) {
            if (line.startsWith(key + "=")) {
                return line.substring(key.length() + 1).trim();
            }
        }
        return null;
    }

    // Helper method for status messages
    private static String getStatusMessage(int status) {
        switch (status) {
            case 200: return "OK";
            case 201: return "Created";
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

