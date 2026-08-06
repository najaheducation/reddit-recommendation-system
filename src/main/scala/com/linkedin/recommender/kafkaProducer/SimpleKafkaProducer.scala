package com.linkedin.recommender.kafkaProducer

import org.apache.kafka.clients.producer._
import org.json.JSONObject
import com.linkedin.recommender.kafkaFilter.JobBloomFilter

class SimpleKafkaProducer(bloomFilter: JobBloomFilter = null) extends AutoCloseable {
  private val producer: KafkaProducer[String, String] = new KafkaProducer[String, String](KafkaConfig.getProducerProperties())

  def sendMessage(topic: String, key: String, message: JSONObject): Unit = {
    val record = new ProducerRecord[String, String](topic, key, message.toString)

    producer.send(record, (metadata: RecordMetadata, e: Exception) => {
      if (e != null) {
        System.err.println(s"✗ [KAFKA PRODUCER ERROR] Failed to send message to $topic: ${e.getMessage}")
        e.printStackTrace()
      } else {
        println(s"✓ [KAFKA PRODUCER] Published job '$key' to topic '$topic' [partition ${metadata.partition()} @ offset ${metadata.offset()}]")
      }
    })
  }

  def sendJob(job: JSONObject): Boolean = {
    val key = Option(job.optString("id")).filter(_.nonEmpty)
      .orElse(Option(job.optString("link"))).getOrElse(java.util.UUID.randomUUID().toString)

    if (bloomFilter != null) {
      if (bloomFilter.mightContain(key)) {
        println(s"[PRODUCER BLOOM FILTER] Duplicate job skipped before sending to Kafka: $key")
        return false
      }
      bloomFilter.add(key)
    }

    sendMessage(KafkaConfig.getJobsTopic(), key, job)
    true
  }



  def flush(): Unit = producer.flush()
  
  override def close(): Unit = producer.close()
}
