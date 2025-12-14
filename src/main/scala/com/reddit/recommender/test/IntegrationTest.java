package com.reddit.recommender.test;

import com.reddit.recommender.kafka.SimpleKafkaProducer;
import org.json.JSONObject;

public class IntegrationTest {

    public static void main(String[] args) throws Exception {
        System.out.println("=== Integration Test: Apify + Kafka ===");

        // Step 1: Test Kafka connectivity
        testKafkaConnectivity();

        // Step 2: Test with mock Apify data
        testWithMockData();

        System.out.println("\n=== Integration Test Complete ===");
        System.out.println("Next steps:");
        System.out.println("  1. Run: docker exec kafka kafka-topics --list --bootstrap-server localhost:9092");
        System.out.println("  2. Should see: reddit-posts and reddit-comments");
        System.out.println("  3. Run: mvn compile exec:java -Dexec.mainClass='com.reddit.recommender.ingestion.ApifyToKafka'");
    }

    private static void testKafkaConnectivity() throws Exception {
        System.out.println("\n[Step 1] Testing Kafka connectivity...");

        try (SimpleKafkaProducer producer = new SimpleKafkaProducer()) {
            JSONObject test = new JSONObject();
            test.put("test", "integration");
            test.put("step", 1);

            producer.sendPost(test);
            producer.flush();

            System.out.println("✓ Kafka producer working");
        } catch (Exception e) {
            System.err.println("✗ Kafka connection failed: " + e.getMessage());
            System.err.println("Make sure:");
            System.err.println("  1. Docker is running (docker-compose up)");
            System.err.println("  2. Kafka is accessible at localhost:9092");
            throw e;
        }
    }

    private static void testWithMockData() throws Exception {
        System.out.println("\n[Step 2] Testing with mock Apify data...");

        ApifyMockTest.main(new String[]{});

        System.out.println("✓ Mock data pipeline working");
    }
}