package com.linkedin.recommender.kafkaProducer

import java.util.Properties
import com.linkedin.recommender.kafkaConsumer.ConfigLoader

object KafkaConfig {
  def getProducerProperties(bootstrapServers: String = null): Properties = {
    val servers = if (bootstrapServers != null && bootstrapServers.nonEmpty) {
      bootstrapServers
    } else {
      try {
        ConfigLoader.loadFromEnv().kafka.bootstrapServers
      } catch {
        case _: Throwable => "localhost:9092"
      }
    }

    val props = new Properties()
    props.put("bootstrap.servers", servers)
    props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer")
    props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer")
    props.put("acks", "1")
    props.put("retries", "3")
    props.put("batch.size", "16384")
    props.put("linger.ms", "1")
    props
  }

  def getJobsTopic(): String = "linkedin-jobs"
}
