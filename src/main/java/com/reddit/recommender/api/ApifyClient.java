package com.reddit.recommender.api;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.stream.Collectors;

public class ApifyClient {
    private ApifyConfig config;

    public ApifyClient() {
        this.config = new ApifyConfig();
    }

    public ApifyClient(ApifyConfig config) {
        this.config = config;
    }

    public ApifyClient(String apiToken, String actorId) {
        this.config = new ApifyConfig(apiToken, actorId);
    }

    /**
     * Scrape Reddit data with the given parameters
     * @param parameters JSONObject with scraping parameters
     * @return JSONArray containing the scraped results
     * @throws Exception if scraping fails
     */
    public JSONArray scrapeReddit(JSONObject parameters) throws Exception {
        return scrapeReddit(parameters, true);
    }

    /**
     * Scrape Reddit data with the given parameters
     * @param parameters JSONObject with scraping parameters
     * @param waitForCompletion If true, wait for Actor to complete; if false, return immediately with run info
     * @return JSONArray containing the scraped results (if waitForCompletion=true) or run info JSON (if waitForCompletion=false)
     * @throws Exception if scraping fails
     */
    public JSONArray scrapeReddit(JSONObject parameters, boolean waitForCompletion) throws Exception {
        HttpURLConnection connection = null;

        try {
            System.out.println("[INFO] Starting Reddit scraper...");

            // Build the URL
            String urlString = "https://api.apify.com/v2/acts/" + config.getApiActorId() + "/runs?token=" + config.getApiToken();
            System.out.println("[INFO] Request URL: " + urlString);
            System.out.println("[INFO] Parameters: " + parameters.toString());

            // Send the request
            URL url = new URL(urlString);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + config.getApiToken());
            connection.setDoOutput(true);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(60000);

            // Write JSON to request body
            try (OutputStreamWriter writer = new OutputStreamWriter(connection.getOutputStream())) {
                writer.write(parameters.toString());
            }

            // Read response
            int status = connection.getResponseCode();
            System.out.println("\n=== HTTP RESPONSE ===");
            System.out.println("Status Code: " + status + " " + getStatusMessage(status));

            String responseBody;
            if (status >= 200 && status < 300) {
                responseBody = readStream(connection.getInputStream());
                System.out.println("[SUCCESS] Actor run started!");

                JSONObject response = new JSONObject(responseBody);
                JSONObject data = response.getJSONObject("data");
                String runId = data.getString("id");
                String datasetId = data.getString("defaultDatasetId");

                System.out.println("[INFO] Run ID: " + runId);
                System.out.println("[INFO] Dataset ID: " + datasetId);

                if (!waitForCompletion) {
                    // Return basic run info instead of waiting
                    JSONArray result = new JSONArray();
                    JSONObject runInfo = new JSONObject();
                    runInfo.put("runId", runId);
                    runInfo.put("datasetId", datasetId);
                    runInfo.put("statusUrl", "https://api.apify.com/v2/actor-runs/" + runId);
                    runInfo.put("dataUrl", "https://api.apify.com/v2/datasets/" + datasetId + "/items");
                    result.put(runInfo);
                    return result;
                }

                // Wait for completion
                System.out.println("[INFO] Waiting for Actor to complete...");
                waitForRunCompletion(runId);

                // Fetch results
                return fetchResults(datasetId);

            } else {
                responseBody = readStream(connection.getErrorStream());
                System.err.println("[ERROR] API Request Failed!");
                throw new RuntimeException("API request failed with status " + status + ": " + responseBody);
            }

        } finally {
            if (connection != null) {
                connection.disconnect();
                System.out.println("[INFO] Connection closed.");
            }
        }
    }

    /**
     * Wait for an Actor run to complete with polling
     * @param runId The ID of the Actor run to monitor
     * @throws Exception if the run fails or times out
     */
    private void waitForRunCompletion(String runId) throws Exception {
        boolean isCompleted = false;
        int maxAttempts = 30; // 30 attempts * 10 seconds = 5 minutes max
        int attempts = 0;

        while (!isCompleted && attempts < maxAttempts) {
            Thread.sleep(10000); // Wait 10 seconds between checks
            attempts++;

            String statusUrl = "https://api.apify.com/v2/actor-runs/" + runId + "?token=" + config.getApiToken();
            HttpURLConnection statusConnection = (HttpURLConnection) new URL(statusUrl).openConnection();
            statusConnection.setRequestMethod("GET");

            int statusCode = statusConnection.getResponseCode();
            if (statusCode >= 200 && statusCode < 300) {
                String statusResponse = readStream(statusConnection.getInputStream());
                JSONObject statusJson = new JSONObject(statusResponse);
                JSONObject statusData = statusJson.getJSONObject("data");
                String runStatus = statusData.getString("status");

                System.out.println("[POLL] Attempt " + attempts + ": Status = " + runStatus);

                if ("SUCCEEDED".equals(runStatus)) {
                    isCompleted = true;
                    System.out.println("[INFO] Actor run completed successfully!");
                } else if ("FAILED".equals(runStatus) || "ABORTED".equals(runStatus)) {
                    String errorMessage = statusData.optString("errorMessage", "No error message");
                    throw new RuntimeException("Actor run failed with status " + runStatus + ": " + errorMessage);
                }
                // Continue polling if status is "RUNNING", "READY", etc.
            }
            statusConnection.disconnect();
        }

        if (!isCompleted) {
            throw new RuntimeException("Actor run timed out after " + maxAttempts + " attempts.");
        }
    }

    /**
     * Fetch results from a dataset
     * @param datasetId The ID of the dataset to fetch
     * @return JSONArray containing the dataset items
     * @throws Exception if fetching fails
     */
    private JSONArray fetchResults(String datasetId) throws Exception {
        String dataUrl = "https://api.apify.com/v2/datasets/" + datasetId + "/items?token=" + config.getApiToken();
        System.out.println("[INFO] Fetching results from: " + dataUrl);

        HttpURLConnection dataConnection = (HttpURLConnection) new URL(dataUrl).openConnection();
        dataConnection.setRequestMethod("GET");
        dataConnection.setConnectTimeout(10000);
        dataConnection.setReadTimeout(60000);

        try {
            int dataStatus = dataConnection.getResponseCode();
            if (dataStatus >= 200 && dataStatus < 300) {
                String results = readStream(dataConnection.getInputStream());
                JSONArray resultsArray = new JSONArray(results);
                System.out.println("[SUCCESS] Retrieved " + resultsArray.length() + " items.");
                return resultsArray;
            } else {
                String error = readStream(dataConnection.getErrorStream());
                throw new RuntimeException("Failed to fetch results: " + error);
            }
        } finally {
            dataConnection.disconnect();
        }
    }

    /**
     * Get the status of a specific Actor run
     * @param runId The ID of the Actor run
     * @return JSONObject containing the run status
     * @throws Exception if the request fails
     */
    public JSONObject getRunStatus(String runId) throws Exception {
        String statusUrl = "https://api.apify.com/v2/actor-runs/" + runId + "?token=" + config.getApiToken();
        HttpURLConnection connection = (HttpURLConnection) new URL(statusUrl).openConnection();
        connection.setRequestMethod("GET");

        try {
            int status = connection.getResponseCode();
            if (status >= 200 && status < 300) {
                String response = readStream(connection.getInputStream());
                return new JSONObject(response);
            } else {
                String error = readStream(connection.getErrorStream());
                throw new RuntimeException("Failed to get run status: " + error);
            }
        } finally {
            connection.disconnect();
        }
    }

    /**
     * Fetch results from a specific dataset
     * @param datasetId The ID of the dataset
     * @return JSONArray containing the dataset items
     * @throws Exception if fetching fails
     */
    public JSONArray getDatasetItems(String datasetId) throws Exception {
        return fetchResults(datasetId);
    }

    // Helper method to read stream
    private String readStream(InputStream inputStream) throws IOException {
        if (inputStream == null) return "";
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
            return reader.lines().collect(Collectors.joining("\n"));
        }
    }

    // Helper method for status messages
    private String getStatusMessage(int status) {
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