package com.reddit.recommender.models

import io.circe._
import io.circe.generic.semiauto._
import io.circe.parser._
import io.circe.syntax._
import java.time.Instant
import cats.implicits._

object Models {

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
                            created_utc: Instant,
                            url: String,
                            flair: String,
                            over_18: Boolean,
                            is_self: Boolean,
                            spoiler: Boolean,
                            locked: Boolean,
                            is_video: Boolean,
                            domain: String,
                            thumbnail: String,
                            url_overridden_by_dest: Option[String],
                            media: Option[Json],
                            media_metadata: Option[Json],
                            gallery_data: Option[Json],
                            liked_by_user:   Boolean,
                            commented_by_user: Boolean,
                            user_score:     Double
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
                               created_utc: Instant,
                               url: String
                             )

  // Handle Unix timestamp
  implicit val instantDecoder: Decoder[Instant] = Decoder.decodeLong.map(Instant.ofEpochSecond)

  // Auto derive everything
  implicit val rawRedditPostDecoder: Decoder[RawRedditPost] = deriveDecoder
  implicit val rawRedditPostEncoder: Encoder[RawRedditPost] = deriveEncoder

  implicit val rawRedditCommentDecoder: Decoder[RawRedditComment] = deriveDecoder
  implicit val rawRedditCommentEncoder: Encoder[RawRedditComment] = deriveEncoder

  // Try post first, fallback to comment
  implicit val decodeItem: Decoder[Either[RawRedditPost, RawRedditComment]] =
    Decoder[RawRedditPost].map(Left(_)).or(Decoder[RawRedditComment].map(Right(_)))

  def parseApifyResponse(jsonString: String): Either[DecodingFailure, List[Either[RawRedditPost, RawRedditComment]]] =
    for {
      json  <- parser.parse(jsonString).left.map(err => DecodingFailure.fromThrowable(err, Nil))
      array <- json.asArray match {
        case Some(arr) => Right(arr.toList)
        case None      => Left(DecodingFailure("Expected JSON array from Apify", Nil))
      }
      items <- array.traverse(_.as[Either[RawRedditPost, RawRedditComment]])
    } yield items
}