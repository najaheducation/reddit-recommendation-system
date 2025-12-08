package com.reddit.recommender.test;

import com.reddit.recommender.kafka.SimpleKafkaProducer;
import org.json.JSONObject;

public class KafkaConnectionTest {

    public static void main(String[] args) {
        System.out.println("=== Testing Kafka Connection ===");

        try (SimpleKafkaProducer producer = new SimpleKafkaProducer()) {

            // Test 1: Send a simple message
            JSONObject testMessage = new JSONObject();
            testMessage.put("test", true);
            testMessage.put("timestamp", System.currentTimeMillis());
            testMessage.put("message", "Hello Kafka!");

            producer.sendPost(testMessage);
            producer.flush();

            System.out.println("✓ Test message sent to Kafka");
            System.out.println("  Topic: reddit-posts");
            System.out.println("  Message: " + testMessage.toString());

            // Test 2: Send another to comments topic
            JSONObject testComment = new JSONObject();
            testComment.put("test", true);
            testComment.put("type", "comment");
            testComment.put("body", "Test comment");

            producer.sendComment(testComment);
            producer.flush();

            System.out.println("\n✓ Test comment sent to Kafka");
            System.out.println("  Topic: reddit-comments");

            System.out.println("\n=== Test Complete ===");
            System.out.println("Check if messages arrived:");
            System.out.println("  docker exec kafka kafka-console-consumer --topic reddit-posts --from-beginning --bootstrap-server localhost:9092");
            System.out.println("  docker exec kafka kafka-console-consumer --topic reddit-comments --from-beginning --bootstrap-server localhost:9092");

        } catch (Exception e) {
            System.err.println("✗ Kafka test failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
}