-- Core tables for Reddit SRS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users and preferences

CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
    );


CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    weights JSONB NOT NULL,
    topics JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
    );

-- Posts

CREATE TABLE IF NOT EXISTS reddit_posts (
    id VARCHAR(50) PRIMARY KEY,
    kind VARCHAR(20),
    query VARCHAR(100),
    title TEXT,
    body TEXT,
    author VARCHAR(100),
    score INTEGER,
    upvote_ratio NUMERIC(4,2),
    num_comments INTEGER,
    subreddit VARCHAR(100),
    created_utc TIMESTAMPTZ,
    url TEXT,
    flair VARCHAR(100),
    over_18 BOOLEAN,
    is_self BOOLEAN,
    spoiler BOOLEAN,
    locked BOOLEAN,
    is_video BOOLEAN,
    domain VARCHAR(200),
    thumbnail TEXT,
    url_overridden_by_dest TEXT,
    media JSONB,
    media_metadata JSONB,
    gallery_data JSONB,
    liked_by_user BOOLEAN DEFAULT FALSE,
    commented_by_user BOOLEAN DEFAULT FALSE,

    -- scoring components
    time_score DOUBLE PRECISION,
    upvote_velocity_score DOUBLE PRECISION,
    comment_activity_score DOUBLE PRECISION,
    engagement_score DOUBLE PRECISION,
    interest_match_score DOUBLE PRECISION,
    trending_boost_score DOUBLE PRECISION,
    final_score DOUBLE PRECISION,

    features JSONB,
    inserted_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_reddit_posts_subreddit ON reddit_posts(subreddit);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_created ON reddit_posts(created_utc);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_final_score ON reddit_posts(final_score DESC);

-- Comments

CREATE TABLE IF NOT EXISTS reddit_comments (
    id TEXT PRIMARY KEY,
    kind TEXT,
    query TEXT,
    post_id TEXT REFERENCES reddit_posts(id) ON DELETE CASCADE,
    post_url TEXT,
    parent_id TEXT,
    body TEXT,
    author TEXT,
    score INT,
    created_utc TIMESTAMPTZ,
    url TEXT
    );

CREATE INDEX IF NOT EXISTS idx_reddit_comments_post ON reddit_comments(post_id);

-- Post topics

CREATE TABLE IF NOT EXISTS post_topics (
    post_id TEXT REFERENCES reddit_posts(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    weight DOUBLE PRECISION DEFAULT 1.0,
    PRIMARY KEY (post_id, topic)
    );

-- Trending state snapshot (from Count-Min)

CREATE TABLE IF NOT EXISTS topic_trends (
    topic TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    approx_count BIGINT NOT NULL,
    PRIMARY KEY (topic, window_start)
    );

-- Optional: score history for analytics

CREATE TABLE IF NOT EXISTS post_score_history (
    post_id TEXT REFERENCES reddit_posts(id) ON DELETE CASCADE,
    calculated_at TIMESTAMPTZ DEFAULT now(),
    time_score DOUBLE PRECISION,
    upvote_velocity_score DOUBLE PRECISION,
    comment_activity_score DOUBLE PRECISION,
    engagement_score DOUBLE PRECISION,
    interest_match_score DOUBLE PRECISION,
    trending_boost_score DOUBLE PRECISION,
    final_score DOUBLE PRECISION
    );
