export type UserInterest = {
  id?: number;
  interest: string;
  weight: number;
};

export type InterestsResponse = {
  interests: UserInterest[];
  userId?: number;
  error?: string;
};
