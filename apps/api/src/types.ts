export type ScanRequest = {
  token: string;
  phone: string;
};

export type RewardResult = {
  label: string;
  code: string;
  value_kobo: number;
  expires_at: string; // ISO timestamp
} | null;

export type ScanResponse = {
  visit_count: number;
  points_balance: number;
  reward: RewardResult;
};
