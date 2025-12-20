export type DashboardCountItem = {
  label: string;
  count: number;
};

export type PostsByDay = {
  date: string;
  count: number;
};

export type DashboardTotals = {
  totalPosts: number;
  totalComments: number;
  avgScore: number;
  avgComments: number;
  avgUpvoteRatio: number;
  imagePosts: number;
  videoPosts: number;
  distinctSubreddits: number;
  distinctQueries: number;
  trendiness: number;
};

export type DashboardResponse = {
  totals: DashboardTotals;
  topQueries: DashboardCountItem[];
  topSubreddits: DashboardCountItem[];
  topAuthors: DashboardCountItem[];
  topDomains: DashboardCountItem[];
  postsByDay: PostsByDay[];
  trends: { key: string; count: number }[];
  trendsUpdatedAt?: number;
  trendsWindowStart?: number;
  trendsWindowEnd?: number;
  error?: string;
};
