package com.linkedin.recommender.test

import com.linkedin.recommender.api.{ApifyClient, ScraperParameters}
import org.json.JSONArray
import scala.io.StdIn
import java.net.URLEncoder

object LinkedInJobScraperTest {

  def main(args: Array[String]): Unit = {
    println("==================================================")
    println("          LinkedIn Jobs Scraper Test              ")
    println("==================================================")

    // Prompt for Search URL or Keywords
    print("\nEnter LinkedIn Jobs Search URL or Keyword (e.g. 'Software Engineer' or full URL): ")
    val inputUrl = StdIn.readLine().trim

    val targetUrl = if (inputUrl.isEmpty) {
      "https://www.linkedin.com/jobs/search/?keywords=Software%20Engineer"
    } else if (inputUrl.startsWith("http://") || inputUrl.startsWith("https://")) {
      inputUrl
    } else {
      // Automatically wrap plain keywords into a valid LinkedIn search URL
      val encodedKeyword = URLEncoder.encode(inputUrl, "UTF-8")
      s"https://www.linkedin.com/jobs/search/?keywords=$encodedKeyword"
    }

    // Prompt for Max Jobs count
    print("Enter maximum number of jobs to scrape (default: 10): ")
    val countInput = StdIn.readLine().trim
    val maxJobs = if (countInput.nonEmpty && countInput.forall(_.isDigit)) countInput.toInt else 10

    println(s"\n[CONFIG] Target URL: $targetUrl")
    println(s"[CONFIG] Max Jobs:   $maxJobs")
    println("\nStarting scraper request to Apify...\n")

    try {
      val client = new ApifyClient()
      val params = ScraperParameters.createJobSearchParameters(targetUrl, maxJobs)

      val results: JSONArray = client.scrapeLinkedInJobs(params)

      println(s"\n==================================================")
      println(s"      Scrape Complete! (${results.length()} jobs found)   ")
      println("==================================================")

      for (i <- 0 until results.length()) {
        val item = results.getJSONObject(i)
        val title = item.optString("title", item.optString("positionName", "N/A"))
        val company = item.optString("company", item.optString("companyName", "N/A"))
        val location = item.optString("location", "N/A")
        val link = item.optString("link", item.optString("jobUrl", "N/A"))

        println(s"\n[$i] Title:    $title")
        println(s"    Company:  $company")
        println(s"    Location: $location")
        println(s"    URL:      $link")
      }

    } catch {
      case e: Exception =>
        println(s"\n[ERROR] Failed to run LinkedIn scraper: ${e.getMessage}")
        e.printStackTrace()
    }
  }
}
