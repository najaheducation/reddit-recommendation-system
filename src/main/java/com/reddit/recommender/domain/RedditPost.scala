package com.reddit.recommender.domain

import java.time.Instant

final case class RedditPost(


       id: String,
       kind: String,
       query: String,
       title: String,
       body: String,
       author: String,
       score: Int,
       upvoteRatio: Double,
       numComments: Int,
       subreddit: String,
       createdUtc: Instant,
       url: String,
       flair: Option[String],
       over18: Boolean,
       isSelf: Boolean,
       spoiler: Boolean,
       locked: Boolean,
       isVideo: Boolean,
       domain: Option[String],
       thumbnail: Option[String],
       urlOverriddenByDest: Option[String],
       likedByUser: Boolean,
       commentedByUser: Boolean,
       topicWeights: Map[String, Double] = Map.empty


   )
