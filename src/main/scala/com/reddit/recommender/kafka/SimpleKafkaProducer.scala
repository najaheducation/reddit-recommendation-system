package com.reddit.recommender.kafka
import org.apache.kafka.clients.producer._
import org.json.JSONObject

class SimpleKafkaProducer extends AutoCloseable {
  private val producer: KafkaProducer[String, String] = new KafkaProducer[String, String](KafkaConfig.getProducerProperties())

  def sendMessage(topic: String, key: String, message: JSONObject): Unit = {
    val record = new ProducerRecord[String, String](topic, key, message.toString)

    producer.send(record, (_: RecordMetadata, e: Exception) =>
      Option(e).foreach(ex => System.err.println(s"Failed to send to $topic: ${ex.getMessage}"))
    )
  }

  def sendPost(post: JSONObject): Unit = {
    val key = Option(post.optString("id")).filter(_.nonEmpty).getOrElse("unknown")
    sendMessage(KafkaConfig.getPostsTopic(), key, post)
  }

  def sendComment(comment: JSONObject): Unit = {
    val key = Option(comment.optString("id")).filter(_.nonEmpty).getOrElse("unknown")
    sendMessage(KafkaConfig.getCommentsTopic(), key, comment)
  }

  def flush(): Unit = producer.flush()
  
  override def close(): Unit = producer.close()
}
