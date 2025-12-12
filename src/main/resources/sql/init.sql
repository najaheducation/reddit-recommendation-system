-- Initial user and preferences

INSERT INTO app_users (username)
VALUES ('default_user')
    ON CONFLICT (username) DO NOTHING;

INSERT INTO user_preferences (user_id, weights, topics)
SELECT id,
       '{"time": 5, "upvotes": 7, "comments": 4, "engagement": 10, "interest": 9, "trending": 5}'::jsonb,
        '{"programming": 10, "pc_building": 8, "cats": 3}'::jsonb
FROM app_users
WHERE username = 'default_user'
    ON CONFLICT (user_id) DO UPDATE
     SET weights = EXCLUDED.weights,
                                 topics = EXCLUDED.topics;

-- Dummy posts for frontend testing

INSERT INTO reddit_posts (
    id, kind, query, title, body, author,
    score, upvote_ratio, num_comments,
    subreddit, created_utc, url, final_score
)
VALUES
    ('post1', 't3', 'programming', 'Dummy post 1', 'Body 1', 'user1',
     120, 0.95, 15, 'r/programming', now() - interval '5 minutes',
     'https://reddit.com/p1', 0.0),
    ('post2', 't3', 'pc_building', 'Dummy post 2', 'Body 2', 'user2',
     80, 0.90, 8, 'r/pcmasterrace', now() - interval '40 minutes',
     'https://reddit.com/p2', 0.0),
    ('post3', 't3', 'cats', 'Cats are awesome', 'Body 3', 'user3',
     60, 0.93, 12, 'r/cats', now() - interval '2 hours',
     'https://reddit.com/p3', 0.0),
    ('post4', 't3', 'programming', 'Scala vs Java', 'Body 4', 'user4',
     40, 0.88, 5, 'r/scala', now() - interval '4 hours',
     'https://reddit.com/p4', 0.0),
    ('post5', 't3', 'pc_building', 'Best GPU 2025', 'Body 5', 'user5',
     30, 0.85, 3, 'r/buildapc', now() - interval '6 hours',
     'https://reddit.com/p5', 0.0)
    ON CONFLICT (id) DO NOTHING;
