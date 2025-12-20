export type TextFeatures = {
  keywords: string[];
  topic_category?: string | null;
};

export type PostDocument = {
  _id: string;
  kind: "post";
  id?: string;
  query?: string | null;
  title: string;
  body?: string | null;
  selftext?: string | null;
  selftext_html?: string | null;
  author?: string | null;
  author_fullname?: string | null;
  subreddit: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  is_video: boolean;
  thumbnail?: string | null;
  url_overridden_by_dest?: string | null;
  preview?: any;
  content_type?: string | null;
  created_utc: string;
  url: string;
  text_features?: TextFeatures;
};

export type CommentDocument = {
  _id: string;
  kind: "comment";
  postId: string;
  score: number;
  created_utc: string;
  keywords?: string[];
  comment_depth?: number;
};

export type TopicConfig = {
  name: string;
  weight: number;
  subreddits: string[];
  keywords: string[];
};

export type RecommendationWeights = {
  upvotes: number;
  comments: number;
  ratio: number;
  image: number;
  video: number;
  freshness: number;
  trendiness: number;
};

export type RecommendationRequest = {
  weights: RecommendationWeights;
  topics: TopicConfig[];
  limit?: number;
  offset?: number;
};
