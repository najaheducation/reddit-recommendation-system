package com.reddit.recommender.domain

final case class UserPreference(
       userId: String,
       weights: UserWeights,
       topicWeights: Map[String, Double]
                               )