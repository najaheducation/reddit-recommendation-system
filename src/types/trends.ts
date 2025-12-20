export type TrendItem = {
  key: string;
  count: number;
};

export type TrendMetricsResponse = {
  trends: TrendItem[];
  topTerms?: TrendItem[];
  topUsers?: TrendItem[];
  updatedAt?: number;
  windowStart?: number;
  windowEnd?: number;
  windowBuckets?: number;
  bucketSizeMillis?: number;
  threshold?: number;
  trendiness: number;
  error?: string;
};
