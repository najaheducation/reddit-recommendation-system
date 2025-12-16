export type UserInterest = {
  id?: string;
  interest: string;
  subInterest?: string;
  weight: number;
};

export type InterestsResponse = {
  interests: UserInterest[];
  userId?: string;
  error?: string;
};
