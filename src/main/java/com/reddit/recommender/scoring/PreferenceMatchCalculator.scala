package com.reddit.recommender.scoring

object PreferenceMatchCalculator {

  def compute(title: String, body: String, prefs: Map[String, Double]): Double = {

    val text = (title + " " + body).toLowerCase()

    prefs.map { case (interest, weight) =>

      var score = 0.0

      // Expanded dictionary of related keywords
      val expanded: Seq[String] = interest.toLowerCase() match {

        /* ===========================
           VR / Meta Quest / AR / MR
           =========================== */
        case "vr" | "meta" | "meta quest" | "quest" =>
          Seq(
            "vr", "virtual reality", "meta", "meta quest", "quest 3",
            "oculus", "oculus quest", "mixed reality", "steamvr",
            "pcvr", "vr headset", "virtual desktop", "airlink"
          )

        /* ===========================
           GAMING / PC Gaming / Consoles
           =========================== */
        case "gaming" | "game" | "gamer" =>
          Seq(
            "gaming", "game", "gamer", "video game", "games",
            "pc gaming", "gaming pc", "steam", "epic games", "xbox",
            "xbox one", "xbox series", "ps4", "ps5", "playstation",
            "nintendo", "nintendo switch", "fps", "moba", "rpg",
            "open world", "battle royale", "fortnite", "valorant",
            "apex", "csgo"
          )

        /* ===========================
           PC Hardware / Components
           =========================== */
        case "pc" | "computer" | "hardware" =>
          Seq(
            "pc", "computer", "desktop", "windows", "monitor",
            "144hz", "240hz", "ultrawide", "2k", "4k",
            "intel", "amd", "ryzen", "cpu", "gpu", "rtx",
            "nvidia", "amd gpu", "motherboard", "ram", "ddr4",
            "ddr5", "ssd", "nvme", "cooler", "aio", "rgb",
            "msi", "gigabyte", "asus", "corsair"
          )

        /* ===========================
           Smartphones / Laptops
           =========================== */
        case "phone" | "smartphone" | "mobile" =>
          Seq(
            "phone", "smartphone", "mobile", "android", "iphone",
            "ios", "samsung", "galaxy", "xiaomi", "pixel",
            "charging", "battery life", "camera", "screen refresh"
          )

        case "laptop" | "notebook" =>
          Seq(
            "laptop", "notebook", "macbook", "ultrabook",
            "gaming laptop", "rtx laptop", "intel i7", "ryzen laptop"
          )

        /* ===========================
           AI / Programming / Tech
           =========================== */
        case "ai" | "ml" | "tech" =>
          Seq(
            "ai", "artificial intelligence", "machine learning", "deep learning",
            "neural network", "llm", "gpt", "openai", "chatgpt",
            "python", "java", "scala", "javascript", "typescript",
            "react", "nextjs", "nodejs", "api", "docker",
            "kubernetes", "spark", "kafka", "hadoop", "data engineering"
          )

        /* ===========================
           Spark Keywords
           =========================== */
        case "spark" =>
          Seq(
            "spark", "apache spark", "spark streaming",
            "spark job", "spark cluster", "pyspark"
          )

        /* ===========================
           Kafka Keywords
           =========================== */
        case "kafka" =>
          Seq(
            "kafka", "apache kafka", "kafka streams",
            "kafka topics", "producers", "brokers",
            "event streaming"
          )

        /* ===========================
           Trading / E-Commerce
           =========================== */
        case "trading" | "crypto" =>
          Seq(
            "trading", "forex", "crypto", "bitcoin", "btc",
            "eth", "binance", "nft", "market", "analysis"
          )

        case "ecommerce" | "store" =>
          Seq(
            "ecommerce", "online store", "dropshipping",
            "shopify", "ads", "google ads", "facebook ads",
            "sales", "checkout", "customers", "roi"
          )

        /* ===========================
           Default: exact match only
           =========================== */
        case _ =>
          Seq(interest.toLowerCase())
      }

      // TEXT MATCHING (boost score if found)
      if (expanded.exists(keyword => text.contains(keyword)))
        score += weight * 1.2

      score
    }.sum
  }
}
