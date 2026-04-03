export type ScanRequest = {
  token: string;
  phone?: string;
  name?: string;
  session_id?: string;
};

export type RewardResult = null;

export type ScanResponse = {
  visit_count: number;
  customer_name: string | null;
  credits_earned: number;
  credit_balance: number;
  tier_label: string;
  nudge_message: string;
  reward: RewardResult;
  session_id?: string;
};
