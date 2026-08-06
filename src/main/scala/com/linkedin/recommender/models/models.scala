package com.linkedin.recommender.models

import io.circe._
import java.time.Instant

case class RawLinkedInJob(
                           id: Option[String],
                           title: Option[String],
                           company: Option[String],
                           location: Option[String],
                           link: Option[String],
                           postedAt: Option[String],
                           description: Option[String],
                           salary: Option[String],
                           jobType: Option[String],
                           experienceLevel: Option[String],
                           companyUrl: Option[String]
                         )

case class ProcessedLinkedInJob(
                                _id: String, // Job ID or hashed URL
                                title: String,
                                company: String,
                                location: String,
                                link: String,
                                postedAt: Option[Instant],
                                description: String,
                                salary: Option[String],
                                jobType: Option[String],
                                experienceLevel: Option[String],
                                text_features: JobTextFeatures,
                                match_score: Option[Double] = None,
                                indexed_at: Instant = Instant.now()
                              )

case class JobTextFeatures(
                            text_length: Int,
                            word_count: Int,
                            required_skills: List[String] = List.empty,
                            is_remote: Boolean = false
                          )


