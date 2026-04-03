import type {
  CustomerRecord,
  CustomerSessionRecord,
  ScanRecord,
  TenantContext,
  WidgetRecord,
  OrderRecord,
  OrderStatus,
  PointsLedgerRecord,
  VoucherRecord,
  MenuItemRecord,
  AdminRecord,
} from "./types.js";

export interface TenantRepository {
  findTenantByToken(token: string): Promise<TenantContext | null>;
  getBusiness(id: string): Promise<any>;
}

export interface CustomerLedgerRepository {
  findByBusinessAndPhone(
    businessId: string,
    phone: string,
  ): Promise<CustomerRecord | null>;
  findCustomerById(
    businessId: string,
    customerId: string,
  ): Promise<CustomerRecord | null>;
  upsertVisit(
    businessId: string,
    phone: string,
    name?: string,
  ): Promise<CustomerRecord>;
  insertScan(record: Omit<ScanRecord, "id" | "scannedAt">): Promise<ScanRecord>;
  hasRecentScan(customerId: string, withinSeconds: number): Promise<boolean>;
  countScans(businessId: string, customerId: string): Promise<number>;
  listCustomers(businessId: string): Promise<CustomerRecord[]>;
}

export interface CustomerSessionRepository {
  findSessionById(sessionId: string): Promise<CustomerSessionRecord | null>;
  createSession(input: {
    businessId: string;
    customerId: string;
    phone: string;
  }): Promise<CustomerSessionRecord>;
}

export interface AdminRepository {
  listBusinesses(): Promise<{ id: string; name: string; slug: string }[]>;
  listAdmins(businessId: string): Promise<AdminRecord[]>;
  findAdminById(businessId: string, adminId: string): Promise<AdminRecord | null>;
  createAdmin(admin: Omit<AdminRecord, "id" | "createdAt">): Promise<AdminRecord>;
  deleteAdmin(id: string): Promise<void>;
}

export interface OrderRepository {
  createOrder(order: Omit<OrderRecord, "id" | "createdAt" | "updatedAt">): Promise<OrderRecord>;
  getOrderById(id: string): Promise<OrderRecord | null>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<OrderRecord>;
  listOrdersByBusiness(businessId: string, status?: OrderStatus): Promise<OrderRecord[]>;
}

export interface PointsLedgerRepository {
  addEntry(entry: Omit<PointsLedgerRecord, "id" | "createdAt">): Promise<PointsLedgerRecord>;
  getBalance(businessId: string, customerId: string): Promise<number>;
  listEntries(businessId: string, customerId: string): Promise<PointsLedgerRecord[]>;
}

export interface VoucherRepository {
  createVoucher(voucher: Omit<VoucherRecord, "id" | "issuedAt">): Promise<VoucherRecord>;
  getVoucherByCode(code: string): Promise<VoucherRecord | null>;
  listActiveVouchers(businessId: string, customerId: string): Promise<VoucherRecord[]>;
  markRedeemed(id: string): Promise<void>;
}

export interface MenuRepository {
  listItems(businessId: string): Promise<MenuItemRecord[]>;
  listAllMenuItems(businessId: string): Promise<MenuItemRecord[]>;
  createMenuItem(input: {
    businessId: string;
    name: string;
    description?: string | null;
    priceKobo: number;
    category?: string | null;
    available: boolean;
    sortOrder: number;
  }): Promise<MenuItemRecord>;
  getItemById(id: string): Promise<MenuItemRecord | null>;
}

export interface RewardRepository {
  findRewardByVisitCount(
    businessId: string,
    visitCount: number,
  ): Promise<{ label: string } | null>;
  listRewards(businessId: string): Promise<{ visitsRequired: number; label: string }[]>;
}

export interface AnalyticsRepository {
  getSummary(businessId: string): Promise<{
    totalScans: number;
    uniqueCustomers: number;
    rewardsTriggered: number;
  }>;
  getAnalyticsDashboard(businessId: string): Promise<{
    summary: {
      totalScans: number;
      uniqueCustomers: number;
      rewardsTriggered: number;
    };
    scansByDay: { date: string; count: number }[];
    ordersByStatus: { status: string; count: number }[];
    menuItemsCount: number;
    staffCount: number;
    creditsIssuedKobo: number;
    creditsRedeemedKobo: number;
    activeVouchers: number;
    customersNewLast30Days: number;
    repeatVisitRate: number;
    pendingOrders: number;
  }>;
}

export interface WidgetRepository {
  createWidget(widget: Omit<WidgetRecord, "id" | "createdAt">): Promise<WidgetRecord>;
  getWidgetById(id: string): Promise<WidgetRecord | null>;
  listWidgetsByBusiness(businessId: string): Promise<WidgetRecord[]>;
}
