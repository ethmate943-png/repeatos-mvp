export type TenantContext = {
  businessId: string;
  allowedOrigins: string[];
  token: string;
};

export type Reward = {
  label: string;
  code: string;
  valueKobo: number;
  expiresAt: Date;
} | null;

/** Tiered credit result from LoyaltyEngine.resolveReward (check-in). */
export type CreditResult = {
  creditsEarned: number;
  creditBalance: number;
  nudgeMessage: string;
  tierLabel: string;
};

export type CheckinRequestContext = {
  token: string;
  phone?: string;
  name?: string;
  sessionId?: string;
  origin?: string;
  ip?: string;
  userAgent?: string;
};

export type CheckinResult = {
  visitCount: number;
  customerName: string | null;
  credits: CreditResult;
  reward: null;
  sessionId?: string;
};

export type ScanRecord = {
  id: string;
  businessId: string;
  customerId: string;
  phone: string;
  token: string;
  visitCount: number;
  scannedAt: Date;
  ip?: string;
  userAgent?: string;
};

export type CustomerRecord = {
  id: string;
  businessId: string;
  phone: string;
  name?: string;
  firstSeen: Date;
  lastSeen: Date;
};

export type CustomerSessionRecord = {
  id: string;
  businessId: string;
  customerId: string;
  phone: string;
  createdAt: Date;
  lastSeen: Date;
};

export type WidgetRecord = {
  id: string;
  businessId: string;
  name: string;
  config: Record<string, any>;
  createdAt: Date;
};

/** Per-business tiered credits (stored in `businesses.loyalty_config`, kobo). */
export type LoyaltyTier = {
  from: number;
  to: number | null;
  credits_kobo: number;
};

export type TieredLoyaltyConfig = {
  tiers: LoyaltyTier[];
  min_redemption_kobo: number;
  max_discount_pct: number;
  expiry_days: number;
};

export enum OrderStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  PREPARING = "preparing",
  READY = "ready",
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  priceKobo: number;
}

export interface OrderRecord {
  id: string;
  businessId: string;
  customerId: string;
  items: OrderItem[];
  totalKobo: number;
  status: OrderStatus;
  tableRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PointsLedgerType = "award" | "redeem" | "expire";

export type PointsLedgerRecord = {
  id: string;
  businessId: string;
  customerId: string;
  orderId?: string;
  type: PointsLedgerType;
  amount: number;
  note?: string;
  createdAt: Date;
  expiresAt?: Date;
};

export type VoucherStatus = "active" | "redeemed" | "expired";

export type VoucherRecord = {
  id: string;
  businessId: string;
  customerId: string;
  code: string;
  valueKobo: number;
  minOrderKobo: number;
  maxDiscountPct: number;
  status: VoucherStatus;
  issuedAt: Date;
  expiresAt: Date;
  redeemedAt?: Date;
};

export type MenuItemRecord = {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  priceKobo: number;
  category?: string;
  available: boolean;
  sortOrder: number;
  createdAt: Date;
};

export type AdminRecord = {
  id: string;
  businessId: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export class DomainError extends Error {
  constructor(
    public readonly code:
      | "INVALID_TOKEN"
      | "TOKEN_INACTIVE"
      | "ORIGIN_NOT_ALLOWED"
      | "COOLDOWN_ACTIVE",
    message: string,
  ) {
    super(message);
  }
}
