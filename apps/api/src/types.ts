export type ScanRequest = {
  token: string;
  phone: string;
};

export type RewardResult = {
  label: string;
} | null;

export type ScanResponse = {
  visit_count: number;
  reward: RewardResult;
};
