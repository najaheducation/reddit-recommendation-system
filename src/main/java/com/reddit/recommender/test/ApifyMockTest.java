package com.reddit.recommender.test;

import com.reddit.recommender.kafka.SimpleKafkaProducer;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Random;

public class ApifyMockTest {

    public static void main(String[] args) {
        System.out.println("=== Testing Apify Mock Data ===");

        try (SimpleKafkaProducer producer = new SimpleKafkaProducer()) {

            // Generate mock data
            JSONArray mockPosts = generateMockPosts(5, "programming");
            JSONArray mockComments = generateMockComments(3, "programming");

            System.out.println("Generated " + mockPosts.length() + " mock posts");
            System.out.println("Generated " + mockComments.length() + " mock comments");

            // Send posts
            for (int i = 0; i < mockPosts.length(); i++) {
                JSONObject post = mockPosts.getJSONObject(i);
                producer.sendPost(post);
                System.out.println("  Sent post: " + post.getString("title"));
            }

            // Send comments
            for (int i = 0; i < mockComments.length(); i++) {
                JSONObject comment = mockComments.getJSONObject(i);
                producer.sendComment(comment);
                System.out.println("  Sent comment: " + comment.getString("id"));
            }

            producer.flush();

            System.out.println("\n✓ Mock data sent to Kafka");
            System.out.println("Check topics:");
            System.out.println("  reddit-posts: " + mockPosts.length() + " posts");
            System.out.println("  reddit-comments: " + mockComments.length() + " comments");

        } catch (Exception e) {
            System.err.println("Test failed: " + e.getMessage());
        }
    }

    private static JSONArray generateMockPosts(int count, String subreddit) {
        JSONArray posts = new JSONArray();
        Random random = new Random();

        for (int i = 1; i <= count; i++) {
            JSONObject post = new JSONObject();
            post.put("id", "t3_" + System.currentTimeMillis() + "_" + i);
            post.put("title", "Mock Post " + i + " about " + subreddit);
            post.put("text", "This is mock content for post " + i);
            post.put("author", "user" + i);
            post.put("score", random.nextInt(1000));
            post.put("upvoteRatio", random.nextDouble());
            post.put("numComments", random.nextInt(100));
            post.put("subreddit", subreddit);
            post.put("created_utc", System.currentTimeMillis() / 1000);
            post.put("url", "https://reddit.com/r/" + subreddit + "/mock" + i);
            post.put("flair", "Discussion");
            post.put("over_18", false);
            post.put("is_self", true);
            post.put("spoiler", false);
            post.put("locked", false);
            post.put("is_video", false);
            post.put("domain", "self." + subreddit);

            posts.put(post);
        }

        return posts;
    }

    private static JSONArray generateMockComments(int count, String subreddit) {
        JSONArray comments = new JSONArray();
        Random random = new Random();

        for (int i = 1; i <= count; i++) {
            JSONObject comment = new JSONObject();
            comment.put("id", "t1_" + System.currentTimeMillis() + "_" + i);
            comment.put("body", "Mock comment " + i + " in r/" + subreddit);
            comment.put("author", "commenter" + i);
            comment.put("score", random.nextInt(100));
            comment.put("created_utc", System.currentTimeMillis() / 1000);
            comment.put("postId", "t3_mockpost");
            comment.put("parentId", "t3_mockpost");
            comment.put("url", "https://reddit.com/r/" + subreddit + "/comments/mockpost/comment" + i);

            comments.put(comment);
        }

        return comments;
    }
}