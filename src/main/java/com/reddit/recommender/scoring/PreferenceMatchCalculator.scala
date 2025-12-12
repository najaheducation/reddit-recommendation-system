package com.reddit.recommender.scoring

import com.reddit.recommender.domain.{RedditPost, UserPreference}

object PreferenceMatchCalculator {
  def compute(pref: UserPreference, post: RedditPost): Double = {
    if (pref == null || post == null) return 0.0
    val userTopics = pref.topicWeights
    val postTopics = post.topicWeights
    if (userTopics.isEmpty || postTopics.isEmpty) return 0.0

    val sum = postTopics.iterator.map { case (topic, postWeight) =>
      val userWeight = userTopics.getOrElse(topic, 0.0)
      (userWeight / 10.0) * postWeight
    }.sum

    math.min(1.0, sum)
  }
}
