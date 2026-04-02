export type ScanRequest = {
  token: string;
  phone?: string;
  name?: string;
  session_id?: string;
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
  session_id?: string;
};
