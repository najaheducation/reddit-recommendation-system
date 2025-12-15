package com.reddit.recommender.api

import java.io.{BufferedReader, InputStreamReader, OutputStreamWriter}
import java.net.{HttpURLConnection, URL}
import org.json.{JSONArray, JSONObject}

class ApifyClient {
  private val config: ApifyConfig = new ApifyConfig()

  def this(apiToken: String, actorId: String) = this()

  def scrapeReddit(parameters: JSONObject): JSONArray = scrapeReddit(parameters, true)

  def scrapeReddit(parameters: JSONObject, waitForCompletion: Boolean): JSONArray = {
    var connection: HttpURLConnection = null
    try {
      println("[INFO] Starting Reddit scraper...")

      val urlString: String = s"https://api.apify.com/v2/acts/${config.getApiActorId}/runs?token=${config.getApiToken}"
      println("[INFO] Request URL: " + urlString)
      println("[INFO] Parameters: " + parameters.toString)

      val url = new URL(urlString)
      connection = url.openConnection().asInstanceOf[HttpURLConnection]
      connection.setRequestMethod("POST")
      connection.setRequestProperty("Content-Type", "application/json")
      connection.setRequestProperty("Authorization", s"Bearer ${config.getApiToken}")
      connection.setDoOutput(true)
      connection.setConnectTimeout(10000)
      connection.setReadTimeout(600000)

      val writer = new OutputStreamWriter(connection.getOutputStream)
      try writer.write(parameters.toString)
      finally writer.close()

      val status = connection.getResponseCode
      println("\n=== HTTP RESPONSE ===")
      println("Status Code: " + status + " " + getStatusMessage(status))

      val responseBody = if (status >= 200 && status < 300) {
        readStream(connection.getInputStream)
      } else {
        readStream(connection.getErrorStream)
      }

      if (status >= 200 && status < 300) {
        println("[SUCCESS] Actor run started!")

        val response = new JSONObject(responseBody)
        val data = response.getJSONObject("data")
        val runId = data.getString("id")
        val datasetId = data.getString("defaultDatasetId")

        println("[INFO] Run ID: " + runId)
        println("[INFO] Dataset ID: " + datasetId)

        if (!waitForCompletion) {
          val result = new JSONArray()
          val runInfo = new JSONObject()
          runInfo.put("runId", runId)
          runInfo.put("datasetId", datasetId)
          runInfo.put("statusUrl", s"https://api.apify.com/v2/actor-runs/$runId")
          runInfo.put("dataUrl", s"https://api.apify.com/v2/datasets/$datasetId/items")
          result.put(runInfo)
          return result
        }

        println("[INFO] Waiting for Actor to complete...")
        waitForRunCompletion(runId)

        fetchResults(datasetId)
      } else {
        System.err.println("[ERROR] API Request Failed!")
        val message: String = s"API request failed with status $status: $responseBody"
        throw new RuntimeException(message)
      }
    } finally {
      if (connection != null) {
        connection.disconnect()
        println("[INFO] Connection closed.")
      }
    }
  }

  private def waitForRunCompletion(runId: String): Unit = {
    var isCompleted = false
    val maxAttempts = 30
    var attempts = 0

    while (!isCompleted && attempts < maxAttempts) {
      Thread.sleep(10000)
      attempts += 1

      val statusUrl: String = s"https://api.apify.com/v2/actor-runs/$runId?token=${config.getApiToken}"
      val statusConnection = new URL(statusUrl).openConnection().asInstanceOf[HttpURLConnection]
      statusConnection.setRequestMethod("GET")

      val statusCode = statusConnection.getResponseCode
      if (statusCode >= 200 && statusCode < 300) {
        val statusResponse = readStream(statusConnection.getInputStream)
        val statusJson = new JSONObject(statusResponse)
        val statusData = statusJson.getJSONObject("data")
        val runStatus = statusData.getString("status")

        println(s"[POLL] Attempt $attempts: Status = $runStatus")

        if ("SUCCEEDED" == runStatus) {
          isCompleted = true
          println("[INFO] Actor run completed successfully!")
        } else if ("FAILED" == runStatus || "ABORTED" == runStatus) {
          val errorMessage = statusData.optString("errorMessage", "No error message")
          val message: String = s"Actor run failed with status $runStatus: $errorMessage"
          throw new RuntimeException(message)
        }
      }
      statusConnection.disconnect()
    }

    if (!isCompleted) {
      val message: String = s"Actor run timed out after $maxAttempts attempts."
      throw new RuntimeException(message)
    }
  }

  private def fetchResults(datasetId: String): JSONArray = {
    val dataUrl: String = s"https://api.apify.com/v2/datasets/$datasetId/items?token=${config.getApiToken}"
    println("[INFO] Fetching results from: " + dataUrl)

    val dataConnection = new URL(dataUrl).openConnection().asInstanceOf[HttpURLConnection]
    dataConnection.setRequestMethod("GET")
    dataConnection.setConnectTimeout(10000)
    dataConnection.setReadTimeout(600000)

    try {
      val dataStatus = dataConnection.getResponseCode
      if (dataStatus >= 200 && dataStatus < 300) {
        val results = readStream(dataConnection.getInputStream)
        val resultsArray = new JSONArray(results)
        println(s"[SUCCESS] Retrieved ${resultsArray.length} items.")
        resultsArray
      } else {
        val error = readStream(dataConnection.getErrorStream)
        throw new RuntimeException("Failed to fetch results: " + error)
      }
    } finally {
      dataConnection.disconnect()
    }
  }

  def getRunStatus(runId: String): JSONObject = {
    val statusUrl: String = s"https://api.apify.com/v2/actor-runs/$runId?token=${config.getApiToken}"
    val connection = new URL(statusUrl).openConnection().asInstanceOf[HttpURLConnection]
    connection.setRequestMethod("GET")

    try {
      val status = connection.getResponseCode
      if (status >= 200 && status < 300) {
        val response = readStream(connection.getInputStream)
        new JSONObject(response)
      } else {
        val error = readStream(connection.getErrorStream)
        throw new RuntimeException("Failed to get run status: " + error)
      }
    } finally {
      connection.disconnect()
    }
  }

  def getDatasetItems(datasetId: String): JSONArray = fetchResults(datasetId)

  private def readStream(inputStream: java.io.InputStream): String = {
    if (inputStream == null) ""
    else {
      val reader = new BufferedReader(new InputStreamReader(inputStream))
      try reader.lines().collect(java.util.stream.Collectors.joining("\n"))
      finally reader.close()
    }
  }

  private def getStatusMessage(status: Int): String = status match {
    case 200 => "OK"
    case 201 => "Created"
    case 400 => "Bad Request (check your parameters)"
    case 401 => "Unauthorized (check API token)"
    case 404 => "Not Found (check Actor ID)"
    case 415 => "Unsupported Media Type (wrong content type)"
    case 429 => "Too Many Requests"
    case 500 => "Internal Server Error (Apify side)"
    case _   => ""
  }
}