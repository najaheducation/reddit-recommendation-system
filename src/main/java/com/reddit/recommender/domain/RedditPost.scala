package com.reddit.recommender.domain

import java.time.Instant

case class RedditPost(
                       id: String,
                       title: String,
                       body: String,
                       author: String,
                       score: Option[Int],
                       numComments: Option[Int],
                       createdUtc: Instant,
                       subreddit: String,
                       url: String,
                       query: String,
                       upvote_ratio: Option[Double]
                     )
