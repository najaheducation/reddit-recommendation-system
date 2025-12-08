package com.reddit.recommender.kafka;

import java.util.Properties;

public class KafkaConfig {

    public static Properties getProducerProperties() {
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("acks", "1");
        props.put("retries", 3);
        props.put("batch.size", 16384);
        props.put("linger.ms", 1);
        return props;
    }

    public static String getPostsTopic() {
        return "reddit-posts";
    }

    public static String getCommentsTopic() {
        return "reddit-comments";
    }
}