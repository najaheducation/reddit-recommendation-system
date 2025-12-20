package com.reddit.recommender.kafkaproducer

import java.util.Properties

object KafkaConfig {
  def getProducerProperties(): Properties = {
    val props = new Properties()
    props.put("bootstrap.servers", "localhost:9092")
    props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer")
    props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer")
    props.put("acks", "1")
    props.put("retries", 3)
    props.put("batch.size", 16384)
    props.put("linger.ms", 1)
    props
  }

  def getPostsTopic(): String = "reddit-posts"

  def getCommentsTopic(): String = "reddit-comments"
}