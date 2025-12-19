package com.reddit.recommender.models

import io.circe._
import java.time.Instant

case class RawRedditPost(
                          kind: String,
                          query: String,
                          id: String,
                          title: String,
                          body: String,
                          author: String,
                          score: Int,
                          upvote_ratio: Double,
                          num_comments: Int,
                          subreddit: String,
                          created_utc: String, // ISO string format
                          url: String,
                          flair: Option[String],
                          over_18: Boolean,
                          is_self: Boolean,
                          spoiler: Boolean,
                          locked: Boolean,
                          is_video: Boolean,
                          domain: String,
                          thumbnail: Option[String],
                          url_overridden_by_dest: Option[String],
                          media: Option[Json],
                          media_metadata: Option[Json],
                          gallery_data: Option[Json]
                        )

case class RawRedditComment(
                             kind: String,
                             query: String,
                             id: String,
                             postId: String,
                             postUrl: String,
                             parentId: String,
                             body: String,
                             author: String,
                             score: Int,
                             created_utc: String,
                             url: String
                           )

case class ProcessedPost(
                          _id: String, // Using Reddit ID as _id for easier lookup
                          kind: String,
                          query: Option[String],
                          title: String,
                          body: Option[String],
                          author: String,
                          score: Int,
                          upvote_ratio: Double,
                          num_comments: Int,
                          subreddit: String,
                          created_utc: Instant,
                          url: String,
                          flair: Option[String],
                          over_18: Boolean,
                          is_self: Boolean,
                          spoiler: Boolean,
                          locked: Boolean,
                          is_video: Boolean,
                          domain: Option[String],
                          thumbnail: Option[String],
                          url_overridden_by_dest: Option[String],
                          media: Option[String], // Store as JSON string
                          media_metadata: Option[String],
                          gallery_data: Option[String],
                          text_features: TextFeatures,
                          content_type: String,
                          indexed_at: Instant = Instant.now()
                        )

case class ProcessedComment(
                             _id: String, // Using Reddit ID as _id
                             kind: String,
                             query: Option[String],
                             postId: String,
                             postUrl: String,
                             parentId: String,
                             body: String,
                             author: String,
                             score: Int,
                             created_utc: Instant,
                             url: String,
                             text_features: TextFeatures,
                             comment_depth: Int,
                             indexed_at: Instant = Instant.now()
                           )

case class TextFeatures(
                         text_length: Int,
                         word_count: Int,
                         sentiment_score: Option[Double] = None,
                         topic_category: Option[String] = None,
                         keywords: List[String] = List.empty,
                         has_links: Boolean = false,
                         has_mentions: Boolean = false
                       )

