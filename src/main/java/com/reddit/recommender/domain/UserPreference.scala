package com.reddit.recommender.domain

case class UserPreference(
                           userId: String,
                           preferredKeywords: Seq[String]
                         )
