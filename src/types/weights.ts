export type UserWeight = {
  label: string;
  value: number;
  hint?: string;
};

export type WeightsResponse = {
  weights: UserWeight[];
  userId?: string;
  topics?: string[];
  error?: string;
};
