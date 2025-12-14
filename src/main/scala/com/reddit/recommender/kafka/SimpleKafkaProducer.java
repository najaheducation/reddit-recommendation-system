//package com.reddit.recommender.kafka;
//
//import org.apache.kafka.clients.producer.*;
//import org.json.JSONObject;
//import java.util.Properties;
//
//public class SimpleKafkaProducer implements AutoCloseable {
//    private final KafkaProducer<String, String> producer;
//
//    public SimpleKafkaProducer() {
//        Properties props = KafkaConfig.getProducerProperties();
//        this.producer = new KafkaProducer<>(props);
//    }
//
//    public void sendMessage(String topic, String key, JSONObject message) {
//        ProducerRecord<String, String> record =
//                new ProducerRecord<>(topic, key, message.toString());
//
//        producer.send(record, (metadata, exception) -> {
//            if (exception != null) {
//                System.err.println("Failed to send to " + topic + ": " + exception.getMessage());
//            }
//        });
//    }
//
//    public void sendPost(JSONObject post) {
//        String key = post.optString("id", "unknown");
//        sendMessage(KafkaConfig.getPostsTopic(), key, post);
//    }
//
//    public void sendComment(JSONObject comment) {
//        String key = comment.optString("id", "unknown");
//        sendMessage(KafkaConfig.getCommentsTopic(), key, comment);
//    }
//
//    public void flush() {
//        producer.flush();
//    }
//
//    @Override
//    public void close() {
//        producer.close();
//    }
//}