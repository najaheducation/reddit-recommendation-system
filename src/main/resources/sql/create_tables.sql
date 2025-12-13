-- =========================
-- Schema for Reddit SRS (YOUR TABLES)
-- =========================
CREATE SCHEMA IF NOT EXISTS public;

-- 1) users
CREATE TABLE IF NOT EXISTS public.users (
                                            id        SERIAL PRIMARY KEY,
                                            username  VARCHAR(50) NOT NULL UNIQUE,
                                            email     VARCHAR(100) UNIQUE,
                                            password  VARCHAR(100)
);

-- 2) user_interests
CREATE TABLE IF NOT EXISTS public.user_interests (
                                                     id       SERIAL PRIMARY KEY,
                                                     user_id  INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                                                     interest VARCHAR(100) NOT NULL,
                                                     weight   DOUBLE PRECISION NOT NULL
);

-- 3) reddit_posts
CREATE TABLE IF NOT EXISTS public.reddit_posts (
                                                   id                      VARCHAR(50) PRIMARY KEY,
                                                   kind                    VARCHAR(20),
                                                   query                   VARCHAR(200),
                                                   title                   TEXT,
                                                   body                    TEXT,
                                                   author                  VARCHAR(100),
                                                   score                   INTEGER,
                                                   upvote_ratio            DOUBLE PRECISION,
                                                   num_comments            INTEGER,
                                                   subreddit               VARCHAR(100),
                                                   created_utc             TIMESTAMPTZ,
                                                   url                     TEXT,
                                                   flair                   VARCHAR(100),
                                                   over_18                 BOOLEAN,
                                                   is_self                 BOOLEAN,
                                                   spoiler                 BOOLEAN,
                                                   locked                  BOOLEAN,
                                                   is_video                BOOLEAN,
                                                   domain                  VARCHAR(200),
                                                   thumbnail               TEXT,
                                                   url_overridden_by_dest  TEXT,
                                                   media                   JSONB,
                                                   media_metadata          JSONB,
                                                   gallery_data            JSONB
);

-- 4) post_scores
CREATE TABLE IF NOT EXISTS  public.post_scores (
                             user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                             post_id VARCHAR(50) NOT NULL REFERENCES reddit_posts(id) ON DELETE CASCADE,
                             base_time_score DOUBLE PRECISION,
                             engagement_score DOUBLE PRECISION,
                             comment_activity_score DOUBLE PRECISION,
                             upvote_velocity_score DOUBLE PRECISION,
                             trending_score DOUBLE PRECISION,
                             preference_score DOUBLE PRECISION,
                             final_score DOUBLE PRECISION,
                             PRIMARY KEY (user_id, post_id)
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_posts_subreddit ON public.reddit_posts(subreddit);
CREATE INDEX IF NOT EXISTS idx_posts_created   ON public.reddit_posts(created_utc);
CREATE INDEX IF NOT EXISTS idx_posts_query     ON public.reddit_posts(query);