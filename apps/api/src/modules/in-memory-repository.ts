import {
  type AnalyticsRepository,
  type CustomerLedgerRepository,
  type AdminRepository,
  type RewardRepository,
  type TenantRepository,
  type WidgetRepository,
  type OrderRepository,
  type PointsLedgerRepository,
  type VoucherRepository,
  type MenuRepository,
} from "./repository.js";
import { randomUUID } from "node:crypto";
import type {
  CustomerRecord,
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

const now = () => new Date();

export class InMemoryRepository
  implements
    TenantRepository,
    CustomerLedgerRepository,
    AdminRepository,
    RewardRepository,
    AnalyticsRepository,
    WidgetRepository,
    OrderRepository,
    PointsLedgerRepository,
    VoucherRepository,
    MenuRepository
{
  private widgets = new Map<string, WidgetRecord>();
  private admins: AdminRecord[] = [];
  private businesses = new Map<string, any>([
    [
      "biz-bliss",
      {
        id: "biz-bliss",
        allowedOrigins: ["http://localhost:3000", "https://blisscafe.com"],
        loyalty_config: {
          thresholds: [{ visits: 5, reward: 5000 }],
          expiry_days: 30,
          min_order: 1000,
          max_discount_percent: 20
        }
      },
    ],
  ]);

  private qrCodes = new Map<string, any>([
    ["demo-token-1234", { token: "demo-token-1234", businessId: "biz-bliss", active: true }],
  ]);

  private customers = new Map<string, CustomerRecord>();
  private scans: ScanRecord[] = [];
  private orders = new Map<string, OrderRecord>();
  private pointsLedger: PointsLedgerRecord[] = [];
  private vouchers = new Map<string, VoucherRecord>();
  private menuItems = new Map<string, MenuItemRecord>();

  constructor() {
    // Seed a demo business for development
    const demoBusinessId = "demo-business-id";
    const demoToken = "demo-token-1234";
    
    this.businesses.set(demoBusinessId, {
      id: demoBusinessId,
      name: "Bliss Cafe",
      slug: "blisscafe",
      allowedOrigins: ["*", "http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
      loyaltyConfig: {
        thresholds: [
          { visits: "1-5", reward: 1000 },
          { visits: 6, reward: 5000 }
        ],
        reward_threshold: 1000, // Issue voucher at 1000 points
        expiry_days: 30,
        min_order: 10000, // 100 Naira
        max_discount_percent: 20
      }
    });

    this.qrCodes.set(demoToken, {
      id: "demo-qr-id",
      businessId: demoBusinessId,
      token: demoToken,
      active: true,
      allowedOrigins: ["*"]
    });

    // Seed a demo admin
    this.admins.push({
      id: "demo-admin-id",
      businessId: demoBusinessId,
      email: "owner@blisscafe.com",
      passwordHash: "hashed_password", // In a real app, this would be bcrypt
      createdAt: now()
    });

    // Seed some menu items for demo-business-id
    const coffeeId = randomUUID();
    this.menuItems.set(coffeeId, {
      id: coffeeId,
      businessId: demoBusinessId,
      name: "Espresso",
      priceKobo: 120000,
      available: true,
      sortOrder: 1,
      createdAt: now()
    });
 
    this.widgets.set("demo-widget-id", {
      id: "demo-widget-id",
      businessId: demoBusinessId,
      name: "Bliss Rewards",
      config: { theme: { primaryColor: "#000000" } },
      createdAt: now()
    });
  }

  async getBusiness(id: string): Promise<any> {
    return this.businesses.get(id) ?? null;
  }

  async findTenantByToken(token: string): Promise<TenantContext | null> {
    const qr = this.qrCodes.get(token);
    if (!qr || !qr.active) return null;
    const business = this.businesses.get(qr.businessId);
    if (!business) return null;
    return {
      businessId: business.id,
      allowedOrigins: business.allowedOrigins,
      token: qr.token,
    };
  }

  async findByBusinessAndPhone(businessId: string, phone: string): Promise<CustomerRecord | null> {
    return this.customers.get(`${businessId}:${phone}`) ?? null;
  }

  async upsertVisit(businessId: string, phone: string): Promise<CustomerRecord> {
    const key = `${businessId}:${phone}`;
    const existing = this.customers.get(key);
    const timestamp = now();

    if (!existing) {
      const created: CustomerRecord = {
        id: `cus_${randomUUID()}`,
        businessId,
        phone,
        firstSeen: timestamp,
        lastSeen: timestamp,
      };
      this.customers.set(key, created);
      return created;
    }

    const updated: CustomerRecord = {
      ...existing,
      lastSeen: timestamp,
    };
    this.customers.set(key, updated);
    return updated;
  }

  async insertScan(record: Omit<ScanRecord, "id" | "scannedAt">): Promise<ScanRecord> {
    const inserted: ScanRecord = { ...record, id: `scan_${randomUUID()}`, scannedAt: now() };
    this.scans.push(inserted);
    return inserted;
  }

  async hasRecentScan(customerId: string, withinSeconds: number): Promise<boolean> {
    const threshold = Date.now() - withinSeconds * 1000;
    return this.scans.some(s => s.customerId === customerId && s.scannedAt.getTime() >= threshold);
  }

  async countScans(businessId: string, customerId: string): Promise<number> {
    return this.scans.filter(s => s.businessId === businessId && s.customerId === customerId).length;
  }

  async listCustomers(businessId: string): Promise<CustomerRecord[]> {
    return Array.from(this.customers.values()).filter(c => c.businessId === businessId);
  }

  // --- AdminRepository ---
  async listAdmins(businessId: string): Promise<AdminRecord[]> {
    return this.admins.filter(a => a.businessId === businessId);
  }

  async createAdmin(admin: Omit<AdminRecord, "id" | "createdAt">): Promise<AdminRecord> {
    const created: AdminRecord = {
      ...admin,
      id: `adm_${randomUUID()}`,
      createdAt: now()
    };
    this.admins.push(created);
    return created;
  }

  async deleteAdmin(id: string): Promise<void> {
    this.admins = this.admins.filter(a => a.id !== id);
  }

  // --- OrderRepository ---
  async createOrder(order: Omit<OrderRecord, "id" | "createdAt" | "updatedAt">): Promise<OrderRecord> {
    const id = `ord_${randomUUID()}`;
    const created: OrderRecord = { ...order, id, createdAt: now(), updatedAt: now() };
    this.orders.set(id, created);
    return created;
  }
  async getOrderById(id: string): Promise<OrderRecord | null> { return this.orders.get(id) ?? null; }
  async updateOrderStatus(id: string, status: OrderStatus): Promise<OrderRecord> {
    const order = this.orders.get(id);
    if (!order) throw new Error("Order not found");
    const updated = { ...order, status, updatedAt: now() };
    this.orders.set(id, updated);
    return updated;
  }
  async listOrdersByBusiness(businessId: string, status?: OrderStatus): Promise<OrderRecord[]> {
    return Array.from(this.orders.values()).filter(o => o.businessId === businessId && (!status || o.status === status));
  }

  // --- PointsLedgerRepository ---
  async addEntry(entry: Omit<PointsLedgerRecord, "id" | "createdAt">): Promise<PointsLedgerRecord> {
    const inserted = { ...entry, id: `pts_${randomUUID()}`, createdAt: now() };
    this.pointsLedger.push(inserted);
    return inserted;
  }
  async getBalance(businessId: string, customerId: string): Promise<number> {
    return this.pointsLedger
      .filter(e => e.businessId === businessId && e.customerId === customerId)
      .reduce((sum, e) => sum + e.amount, 0);
  }
  async listEntries(businessId: string, customerId: string): Promise<PointsLedgerRecord[]> {
    return this.pointsLedger.filter(e => e.businessId === businessId && e.customerId === customerId);
  }

  // --- VoucherRepository ---
  async createVoucher(voucher: Omit<VoucherRecord, "id" | "issuedAt">): Promise<VoucherRecord> {
    const id = `vouc_${randomUUID()}`;
    const created: VoucherRecord = { ...voucher, id, issuedAt: now() };
    this.vouchers.set(id, created);
    return created;
  }
  async getVoucherByCode(code: string): Promise<VoucherRecord | null> {
    return Array.from(this.vouchers.values()).find(v => v.code === code) ?? null;
  }
  async listActiveVouchers(businessId: string, customerId: string): Promise<VoucherRecord[]> {
    return Array.from(this.vouchers.values()).filter(v => v.businessId === businessId && v.customerId === customerId && v.status === "active");
  }
  async markRedeemed(id: string): Promise<void> {
    const v = this.vouchers.get(id);
    if (v) this.vouchers.set(id, { ...v, status: "redeemed", redeemedAt: now() });
  }

  // --- MenuRepository ---
  async listItems(businessId: string): Promise<MenuItemRecord[]> {
    return Array.from(this.menuItems.values()).filter(i => i.businessId === businessId);
  }
  async getItemById(id: string): Promise<MenuItemRecord | null> { return this.menuItems.get(id) ?? null; }

  // --- RewardRepository ---
  async findRewardByVisitCount(businessId: string, visitCount: number): Promise<{ label: string } | null> {
    return null; // Legacy method, rewards will be points/vouchers now
  }
  async listRewards(businessId: string): Promise<{ visitsRequired: number; label: string }[]> {
    const biz = this.businesses.get(businessId);
    return biz?.loyalty_config?.thresholds?.map((t: any) => ({ visitsRequired: t.visits, label: `${t.reward/1000} Point Reward` })) || [];
  }

  // --- AnalyticsRepository ---
  async getSummary(businessId: string): Promise<any> {
    return { totalScans: this.scans.length, uniqueCustomers: this.customers.size, rewardsTriggered: 0 };
  }

  // --- WidgetRepository ---
  async createWidget(widget: Omit<WidgetRecord, "id" | "createdAt">): Promise<WidgetRecord> {
    const id = `wid_${randomUUID()}`;
    const created: WidgetRecord = { ...widget, id, createdAt: now() };
    this.widgets.set(id, created);
    return created;
  }
  async getWidgetById(id: string): Promise<WidgetRecord | null> { return this.widgets.get(id) ?? null; }
  async listWidgetsByBusiness(businessId: string): Promise<WidgetRecord[]> {
    return Array.from(this.widgets.values()).filter(w => w.businessId === businessId);
  }
}
