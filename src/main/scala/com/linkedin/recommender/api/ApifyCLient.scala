package com.linkedin.recommender.api

import java.io.{BufferedReader, InputStreamReader, OutputStreamWriter}
import java.net.{HttpURLConnection, URL}
import org.json.{JSONArray, JSONObject}

class ApifyClient {
  private val config: ApifyConfig = new ApifyConfig()

  def scrapeLinkedInJobs(parameters: JSONObject): JSONArray =
    scrapeLinkedInJobs(parameters, waitForCompletion = true)

  def scrapeLinkedInJobs(parameters: JSONObject, waitForCompletion: Boolean): JSONArray = {
    var connection: HttpURLConnection = null
    try {
      println("[INFO] Starting LinkedIn Jobs scraper...")
      val actorIdFormatted = config.getApiActorId
      val urlString = s"https://api.apify.com/v2/acts/$actorIdFormatted/runs?token=${config.getApiToken}"
      println("[INFO] Request URL: " + urlString)
      println("[INFO] Parameters: " + parameters.toString)

      val url = new URL(urlString)
      connection = url.openConnection().asInstanceOf[HttpURLConnection]
      connection.setRequestMethod("POST")
      connection.setRequestProperty("Content-Type", "application/json")
      connection.setDoOutput(true)

      val writer = new OutputStreamWriter(connection.getOutputStream)
      try writer.write(parameters.toString)
      finally writer.close()

      val status = connection.getResponseCode
      println(s"\n=== HTTP RESPONSE ===\nStatus Code: $status ${getStatusMessage(status)}")

      val responseBody = readStream(
        if (status >= 200 && status < 300) connection.getInputStream
        else connection.getErrorStream
      )

      if (status >= 200 && status < 300) {
        println("[SUCCESS] Actor run started!")
        val response = new JSONObject(responseBody)
        val data = response.getJSONObject("data")
        val runId = data.getString("id")
        val datasetId = data.getString("defaultDatasetId")

        println(s"[INFO] Run ID: $runId")
        println(s"[INFO] Dataset ID: $datasetId")

        if (!waitForCompletion) {
          val result = new JSONArray()
          val runInfo = new JSONObject()
            .put("runId", runId)
            .put("datasetId", datasetId)
            .put("statusUrl", s"https://api.apify.com/v2/actor-runs/$runId")
            .put("dataUrl", s"https://api.apify.com/v2/datasets/$datasetId/items")
          result.put(runInfo)
          return result
        }

        println("[INFO] Waiting for Actor to complete...")
        waitForRunCompletion(runId)
        fetchResults(datasetId)
      } else {
        System.err.println("[ERROR] API Request Failed!")
        throw new RuntimeException(s"API request failed with status $status: $responseBody")
      }
    } finally {
      if (connection != null) {
        connection.disconnect()
        println("[INFO] Connection closed.")
      }
    }
  }

  private def waitForRunCompletion(runId: String): Unit = {
    var completed = false
    var attempts = 0
    val maxAttempts = 30

    while (!completed && attempts < maxAttempts) {
      Thread.sleep(10000)
      attempts += 1

      val statusConn = new URL(s"https://api.apify.com/v2/actor-runs/$runId?token=${config.getApiToken}")
        .openConnection().asInstanceOf[HttpURLConnection]
      statusConn.setRequestMethod("GET")

      val statusBody = readStream(statusConn.getInputStream)
      val statusJson = new JSONObject(statusBody)
      val status = statusJson.getJSONObject("data").getString("status")

      println(s"[POLL] Attempt $attempts: Status = $status")

      if (status == "SUCCEEDED") {
        completed = true
        println("[INFO] Actor run completed successfully!")
      } else if (status == "FAILED" || status == "ABORTED") {
        val msg = statusJson.getJSONObject("data").optString("errorMessage", "No error message")
        throw new RuntimeException(s"Actor run failed: $status - $msg")
      }

      statusConn.disconnect()
    }

    if (!completed) throw new RuntimeException(s"Timed out after $maxAttempts attempts")
  }

  private def fetchResults(datasetId: String): JSONArray = {
    val dataUrl = s"https://api.apify.com/v2/datasets/$datasetId/items?token=${config.getApiToken}"
    println("[INFO] Fetching results from: " + dataUrl)

    val conn = new URL(dataUrl).openConnection().asInstanceOf[HttpURLConnection]
    conn.setRequestMethod("GET")

    try {
      val body = readStream(conn.getInputStream)
      val items = new JSONArray(body)
      println(s"[SUCCESS] Retrieved ${items.length()} items.")
      items
    } finally {
      conn.disconnect()
    }
  }

  def getRunStatus(runId: String): JSONObject = {
    val conn = new URL(s"https://api.apify.com/v2/actor-runs/$runId?token=${config.getApiToken}")
      .openConnection().asInstanceOf[HttpURLConnection]
    conn.setRequestMethod("GET")
    try new JSONObject(readStream(conn.getInputStream))
    finally conn.disconnect()
  }

  private def readStream(stream: java.io.InputStream): String =
    if (stream == null) ""
    else {
      val reader = new BufferedReader(new InputStreamReader(stream))
      try reader.lines().collect(java.util.stream.Collectors.joining("\n"))
      finally reader.close()
    }

  private def getStatusMessage(status: Int): String = status match {
    case 200 => "OK"
    case 201 => "Created"
    case 400 => "Bad Request (check your parameters)"
    case 401 => "Unauthorized (check API token)"
    case 404 => "Not Found (check Actor ID)"
    case 429 => "Too Many Requests"
    case 500 => "Internal Server Error (Apify side)"
    case _   => ""
  }
}
