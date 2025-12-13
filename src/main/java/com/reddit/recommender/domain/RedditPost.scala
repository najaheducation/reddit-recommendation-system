package com.reddit.recommender.domain

import java.time.Instant

case class RedditPost(
                       id: String,
                       title: String,
                       body: String,
                       author: String,
                       score: Int,
                       numComments: Int,
                       createdUtc: Instant,
                       subreddit: String,
                       url: String,
                       query: String,
                       upvote_ratio: Double
                     )
