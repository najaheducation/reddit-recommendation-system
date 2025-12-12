package com.reddit.recommender.domain

final case class UserWeights(
       time: Double,
       upvotes: Double,
       comments: Double,
       engagement: Double,
       interest: Double,
       trending: Double
                            )