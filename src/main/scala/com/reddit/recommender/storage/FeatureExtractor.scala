package com.reddit.recommender.storage

import java.time.Instant
import com.reddit.recommender.models.{TextFeatures, ProcessedComment, ProcessedPost, RawRedditPost, RawRedditComment}
import scala.util.{Try, Success, Failure}

case class TopicConfig(
                        name: String,
                        keywords: List[String],
                        weight: Double = 1.0
                      )

case class FeatureExtractorConfig(
                                   topics: List[TopicConfig],
                                   stopWords: List[String] = List.empty,
                                   nGramSize: Int = 2,
                                   maxKeywords: Int = 10,
                                   minWordLength: Int = 3
                                 )

class FeatureExtractor(val config: FeatureExtractorConfig) {

  private val stopWordsSet = config.stopWords.toSet

  def extractFromRawPost(raw: RawRedditPost): ProcessedPost = {
    val fullText = s"${raw.title} ${raw.body}"
    val textFeatures = Try(extractTextFeatures(fullText)).getOrElse(
      TextFeatures(
        text_length = fullText.length,
        word_count = 0,
        topic_category = None,
        keywords = List.empty,
        has_links = fullText.contains("http://") || fullText.contains("https://"),
        has_mentions = fullText.contains("/u/") || fullText.contains("u/")
      )
    )

    ProcessedPost(
      _id = raw.id,
      kind = raw.kind,
      query = if (raw.query.nonEmpty) Some(raw.query) else None,
      title = raw.title,
      body = if (raw.body.nonEmpty) Some(raw.body) else None,
      author = raw.author,
      score = raw.score,
      upvote_ratio = raw.upvote_ratio,
      num_comments = raw.num_comments,
      subreddit = raw.subreddit,
      created_utc = Instant.parse(raw.created_utc),
      url = raw.url,
      flair = raw.flair,
      over_18 = raw.over_18,
      is_self = raw.is_self,
      spoiler = raw.spoiler,
      locked = raw.locked,
      is_video = raw.is_video,
      domain = Some(raw.domain),
      thumbnail = raw.thumbnail,
      url_overridden_by_dest = raw.url_overridden_by_dest,
      media = raw.media.map(_.noSpaces),
      media_metadata = raw.media_metadata.map(_.noSpaces),
      gallery_data = raw.gallery_data.map(_.noSpaces),
      text_features = textFeatures,
      content_type = detectContentType(raw)
    )
  }

  def extractFromRawComment(raw: RawRedditComment): ProcessedComment = {
    val textFeatures = Try(extractTextFeatures(raw.body)).getOrElse(
      TextFeatures(
        text_length = raw.body.length,
        word_count = 0,
        topic_category = None,
        keywords = List.empty,
        has_links = raw.body.contains("http://") || raw.body.contains("https://"),
        has_mentions = raw.body.contains("/u/") || raw.body.contains("u/")
      )
    )

    ProcessedComment(
      _id = raw.id,
      kind = raw.kind,
      query = if (raw.query.nonEmpty) Some(raw.query) else None,
      postId = raw.postId,
      postUrl = raw.postUrl,
      parentId = raw.parentId,
      body = raw.body,
      author = raw.author,
      score = raw.score,
      created_utc = Instant.parse(raw.created_utc),
      url = raw.url,
      text_features = textFeatures,
      comment_depth = calculateDepth(raw.parentId)
    )
  }

  private def extractTextFeatures(text: String): TextFeatures = {
    val lowerText = text.toLowerCase()
    val words = tokenizeText(lowerText)

    val (keywords, topicCategory) = extractKeywordsAndTopic(words)
    val nGrams = extractNGrams(words)

    TextFeatures(
      text_length = text.length,
      word_count = words.length,
      topic_category = topicCategory,
      keywords = (keywords ++ nGrams).take(config.maxKeywords),
      has_links = text.contains("http://") || text.contains("https://"),
      has_mentions = text.contains("/u/") || text.contains("u/")
    )
  }

  private def tokenizeText(text: String): List[String] = {
    text.split("\\W+")
      .filter(_.length >= config.minWordLength)
      .filterNot(stopWordsSet.contains)
      .toList
  }

  private def extractKeywordsAndTopic(words: List[String]): (List[String], Option[String]) = {
    val wordSet = words.toSet

    val topicScores = config.topics.map { topic =>
      val score = topic.keywords.count(wordSet.contains) * topic.weight
      (topic.name, score)
    }

    val topicCategory = if (topicScores.isEmpty) {
      None
    } else {
      val (name, score) = topicScores.maxBy(_._2)
      if (score > 0) Some(name) else None
    }

    val keywords = words.filter { word =>
      config.topics.exists(_.keywords.contains(word))
    }.distinct

    (keywords, topicCategory)
  }

  private def extractNGrams(words: List[String]): List[String] = {
    if (config.nGramSize <= 1) return List.empty

    words.sliding(config.nGramSize)
      .map(_.mkString(" "))
      .filter(_.split(" ").forall(w => !stopWordsSet.contains(w)))
      .toList
  }

  private def calculateDepth(parentId: String): Int = {
    if (parentId.startsWith("t3_")) 1
    else if (parentId.startsWith("t1_")) 2
    else 1
  }

  private def detectContentType(raw: RawRedditPost): String = {
    if (raw.is_self) "text"
    else if (raw.domain.contains("youtube.com") || raw.domain.contains("youtu.be")) "video"
    else if (raw.domain.contains("i.redd.it") || raw.domain.contains("imgur.com")) "image"
    else if (raw.gallery_data.nonEmpty) "gallery"
    else if (raw.media.nonEmpty) "media"
    else "link"
  }
}

object FeatureExtractor {
  def defaultConfig: FeatureExtractorConfig = FeatureExtractorConfig(
    topics = List(
      TopicConfig("politics", List(
        "palestine", "israel", "genocide", "imperialism", "socialist",
        "capitalism", "propaganda", "fascist", "nazi", "gaza", "resistance",
        "communist", "leftist", "revolution", "war", "china", "government",
        "democracy", "election", "policy", "protest", "rights", "freedom"
      )),
      TopicConfig("technology", List(
        "ai", "machine", "learning", "programming", "technology",
        "video", "youtube", "media", "content", "computer", "software",
        "algorithm", "data", "internet", "digital", "code", "developer",
        "app", "phone", "device", "hardware", "software", "network"
      )),
      TopicConfig("entertainment", List(
        "movie", "trailer", "film", "video", "youtube", "media",
        "documentary", "series", "show", "music", "game", "gaming",
        "stream", "tv", "netflix", "hbo", "disney", "marvel", "starwars"
      )),
      TopicConfig("social", List(
        "discussion", "question", "ask", "opinion", "view", "think",
        "community", "society", "culture", "people", "human", "social",
        "relationship", "family", "friend", "life", "experience", "story"
      ))
    ),
    stopWords = List(
      "the", "a", "an", "in", "on", "at", "and", "or", "but", "is", "are",
      "was", "were", "be", "been", "being", "to", "of", "for", "with", "by",
      "that", "this", "these", "those", "it", "as", "from", "up", "out", "so"
    ),
    nGramSize = 2,
    maxKeywords = 10,
    minWordLength = 3
  )

  def apply(): FeatureExtractor = new FeatureExtractor(defaultConfig)
  def apply(config: FeatureExtractorConfig): FeatureExtractor = new FeatureExtractor(config)
}


//package com.reddit.recommender.storage



//import java.time.Instant
//import com.reddit.recommender.models.{TextFeatures,ProcessedComment,ProcessedPost,RawRedditPost,RawRedditComment}
//
//case class TopicConfig(
//                        name: String,
//                        keywords: List[String],
//                        weight: Double = 1.0
//                      )
//
//case class FeatureExtractorConfig(
//                                   topics: List[TopicConfig],
//                                   stopWords: List[String] = List.empty,
//
//
//
//
//                                   nGramSize: Int = 2,
//                                   maxKeywords: Int = 10,
//                                   minWordLength: Int = 3
//                                 )
//
//class FeatureExtractor(val config: FeatureExtractorConfig) {
//
//  private val stopWordsSet = config.stopWords.toSet
//
//  def extractFromRawPost(raw: RawRedditPost): ProcessedPost = {
//    val fullText = s"${raw.title} ${raw.body}"
//    val textFeatures = extractTextFeatures(fullText)
//
//    ProcessedPost(
//      _id = raw.id,
//      kind = raw.kind,
//      query = if (raw.query.nonEmpty) Some(raw.query) else None,
//      title = raw.title,
//      body = if (raw.body.nonEmpty) Some(raw.body) else None,
//      author = raw.author,
//      score = raw.score,
//      upvote_ratio = raw.upvote_ratio,
//      num_comments = raw.num_comments,
//      subreddit = raw.subreddit,
//      created_utc = Instant.parse(raw.created_utc),
//      url = raw.url,
//      flair = raw.flair,
//      over_18 = raw.over_18,
//      is_self = raw.is_self,
//      spoiler = raw.spoiler,
//      locked = raw.locked,
//      is_video = raw.is_video,
//      domain = Some(raw.domain),
//      thumbnail = raw.thumbnail,
//      url_overridden_by_dest = raw.url_overridden_by_dest,
//      media = raw.media.map(_.noSpaces),
//      media_metadata = raw.media_metadata.map(_.noSpaces),
//      gallery_data = raw.gallery_data.map(_.noSpaces),
//      text_features = textFeatures,
//      content_type = detectContentType(raw)
//    )
//  }
//
//  def extractFromRawComment(raw: RawRedditComment): ProcessedComment = {
//    val textFeatures = extractTextFeatures(raw.body)
//
//    ProcessedComment(
//      _id = raw.id,
//      kind = raw.kind,
//      query = if (raw.query.nonEmpty) Some(raw.query) else None,
//      postId = raw.postId,
//      postUrl = raw.postUrl,
//      parentId = raw.parentId,
//      body = raw.body,
//      author = raw.author,
//      score = raw.score,
//      created_utc = Instant.parse(raw.created_utc),
//      url = raw.url,
//      text_features = textFeatures,
//      comment_depth = calculateDepth(raw.parentId)
//    )
//  }
//
//  private def extractTextFeatures(text: String): TextFeatures = {
//    val lowerText = text.toLowerCase()
//    val words = tokenizeText(lowerText)
//
//    // Extract keywords based on topic configs
//    val (keywords, topicCategory) = extractKeywordsAndTopic(words)
//
//    // Generate n-grams
//    val nGrams = extractNGrams(words)
//
//    TextFeatures(
//      text_length = text.length,
//      word_count = words.length,
//      topic_category = topicCategory,
//      keywords = (keywords ++ nGrams).take(config.maxKeywords),
//      has_links = text.contains("http://") || text.contains("https://"),
//      has_mentions = text.contains("/u/") || text.contains("u/")
//    )
//  }
//
//  private def tokenizeText(text: String): List[String] = {
//    text.split("\\W+")
//      .filter(_.length >= config.minWordLength)
//      .filterNot(stopWordsSet.contains)
//      .toList
//  }
//
//  private def extractKeywordsAndTopic(words: List[String]): (List[String], Option[String]) = {
//    val wordSet = words.toSet
//    var bestTopic: Option[String] = None
//
//
//    // Calculate scores for each topic
//    val topicScores = config.topics.map { topic =>
//      val score = topic.keywords.count(wordSet.contains) * topic.weight
//      (topic.name, score)
//    }
//
//    // Find the best topic
//    bestTopic = if (topicScores.isEmpty) {
//      None
//    } else {
//      val maxEntry = topicScores.maxBy(_._2)
//      if (maxEntry._2 > 0) Some(maxEntry._1) else None
//    }
//
//
//    // Extract keywords from the text that match any topic keywords
//    val keywords = words.filter { word =>
//      config.topics.exists(_.keywords.contains(word))
//    }.distinct
//
//    (keywords, bestTopic)
//  }
//
//  private def extractNGrams(words: List[String]): List[String] = {
//    if (config.nGramSize <= 1) return List.empty
//
//    words.sliding(config.nGramSize)
//      .map(_.mkString(" "))
//      .filter(_.split(" ").forall(w => !stopWordsSet.contains(w)))
//      .toList
//  }
//
//  private def calculateDepth(parentId: String): Int = {
//    if (parentId.startsWith("t3_")) 1
//    else if (parentId.startsWith("t1_")) 2
//    else 1
//  }
//
//  private def detectContentType(raw: RawRedditPost): String = {
//    if (raw.is_self) "text"
//    else if (raw.domain.contains("youtube.com") || raw.domain.contains("youtu.be")) "video"
//    else if (raw.domain.contains("i.redd.it") || raw.domain.contains("imgur.com")) "image"
//    else if (raw.gallery_data.nonEmpty) "gallery"
//    else if (raw.media.nonEmpty) "media"
//    else "link"
//  }
//}
//
//object FeatureExtractor {
//
//  def defaultConfig: FeatureExtractorConfig = FeatureExtractorConfig(
//    topics = List(
//      TopicConfig("politics", List(
//        "palestine", "israel", "genocide", "imperialism", "socialist",
//        "capitalism", "propaganda", "fascist", "nazi", "gaza", "resistance",
//        "communist", "leftist", "revolution", "war", "china", "government",
//        "democracy", "election", "policy", "protest", "rights", "freedom"
//      )),
//      TopicConfig("technology", List(
//        "ai", "machine", "learning", "programming", "technology",
//        "video", "youtube", "media", "content", "computer", "software",
//        "algorithm", "data", "internet", "digital", "code", "developer",
//        "app", "phone", "device", "hardware", "software", "network"
//      )),
//      TopicConfig("entertainment", List(
//        "movie", "trailer", "film", "video", "youtube", "media",
//        "documentary", "series", "show", "music", "game", "gaming",
//        "stream", "tv", "netflix", "hbo", "disney", "marvel", "starwars"
//      )),
//      TopicConfig("social", List(
//        "discussion", "question", "ask", "opinion", "view", "think",
//        "community", "society", "culture", "people", "human", "social",
//        "relationship", "family", "friend", "life", "experience", "story"
//      ))
//    ),
//    stopWords = List(
//      "the", "a", "an", "in", "on", "at", "and", "or", "but", "is", "are",
//      "was", "were", "be", "been", "being", "to", "of", "for", "with", "by",
//      "that", "this", "these", "those", "it", "as", "from", "up", "out", "so"
//    ),
//    nGramSize = 2,
//    maxKeywords = 10,
//    minWordLength = 3
//  )
//
//  // Factory method for testing with default config
//  def apply(): FeatureExtractor = new FeatureExtractor(defaultConfig)
//
//  // Factory method with custom config
//  def apply(config: FeatureExtractorConfig): FeatureExtractor = new FeatureExtractor(config)
//}