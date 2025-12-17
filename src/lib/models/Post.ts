export type TextFeatures = {
  keywords: string[];
  topic_category?: string | null;
};

export type PostDocument = {
  _id: string;
  kind: "post";
  title: string;
  subreddit: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  is_video: boolean;
  thumbnail?: string | null;
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
};

export type RecommendationRequest = {
  weights: RecommendationWeights;
  topics: TopicConfig[];
  limit?: number;
};
