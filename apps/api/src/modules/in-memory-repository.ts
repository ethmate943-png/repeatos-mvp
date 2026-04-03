import {
  type AnalyticsRepository,
  type CustomerLedgerRepository,
  type CustomerSessionRepository,
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

const now = () => new Date();

export class InMemoryRepository
  implements
    TenantRepository,
    CustomerLedgerRepository,
    CustomerSessionRepository,
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
        name: "Bliss (legacy seed)",
        slug: "bliss-legacy",
        integrationMode: "external",
        menuUrl: "https://example.com/menu",
        allowedOrigins: ["http://localhost:3000", "https://blisscafe.com"],
        createdAt: now(),
        loyalty_config: {
          tiers: [
            { from: 1, to: 3, credits_kobo: 5000 },
            { from: 4, to: 10, credits_kobo: 10000 },
            { from: 11, to: null, credits_kobo: 15000 },
          ],
          min_redemption_kobo: 50000,
          max_discount_pct: 20,
          expiry_days: 30,
        },
      },
    ],
  ]);

  private qrCodes = new Map<string, any>([
    ["demo-token-1234", { token: "demo-token-1234", businessId: "biz-bliss", active: true }],
  ]);

  private customers = new Map<string, CustomerRecord>();
  private customerSessions = new Map<string, CustomerSessionRecord>();
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
      integrationMode: "hosted",
      menuUrl: null,
      allowedOrigins: ["*", "http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
      loyaltyConfig: {
        tiers: [
          { from: 1, to: 3, credits_kobo: 5000 },
          { from: 4, to: 10, credits_kobo: 10000 },
          { from: 11, to: null, credits_kobo: 15000 },
        ],
        min_redemption_kobo: 50000,
        max_discount_pct: 20,
        expiry_days: 30,
      },
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
    const b = this.businesses.get(id);
    if (!b) return null;
    return {
      ...b,
      createdAt: b.createdAt ?? now(),
    };
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

  async findCustomerById(
    businessId: string,
    customerId: string,
  ): Promise<CustomerRecord | null> {
    return (
      Array.from(this.customers.values()).find(
        (c) => c.businessId === businessId && c.id === customerId,
      ) ?? null
    );
  }

  async upsertVisit(
    businessId: string,
    phone: string,
    name?: string,
  ): Promise<CustomerRecord> {
    const key = `${businessId}:${phone}`;
    const existing = this.customers.get(key);
    const timestamp = now();

    if (!existing) {
      const created: CustomerRecord = {
        id: `cus_${randomUUID()}`,
        businessId,
        phone,
        name,
        firstSeen: timestamp,
        lastSeen: timestamp,
      };
      this.customers.set(key, created);
      return created;
    }

    const nextName =
      name != null && String(name).trim() !== ""
        ? String(name).trim()
        : existing.name;

    const updated: CustomerRecord = {
      ...existing,
      lastSeen: timestamp,
      name: nextName,
    };
    this.customers.set(key, updated);
    return updated;
  }

  async findSessionById(
    sessionId: string,
  ): Promise<CustomerSessionRecord | null> {
    const existing = this.customerSessions.get(sessionId);
    if (!existing) return null;
    const updated: CustomerSessionRecord = {
      ...existing,
      lastSeen: now(),
    };
    this.customerSessions.set(sessionId, updated);
    return updated;
  }

  async createSession(input: {
    businessId: string;
    customerId: string;
    phone: string;
  }): Promise<CustomerSessionRecord> {
    const id = randomUUID();
    const created: CustomerSessionRecord = {
      id,
      businessId: input.businessId,
      customerId: input.customerId,
      phone: input.phone,
      createdAt: now(),
      lastSeen: now(),
    };
    this.customerSessions.set(id, created);
    return created;
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
  async listBusinesses(): Promise<{ id: string; name: string; slug: string }[]> {
    return Array.from(this.businesses.values()).map((b: any) => ({
      id: b.id,
      name: b.name ?? "Business",
      slug: b.slug ?? b.id,
    }));
  }

  async listAdmins(businessId: string): Promise<AdminRecord[]> {
    return this.admins.filter(a => a.businessId === businessId);
  }

  async findAdminById(businessId: string, adminId: string): Promise<AdminRecord | null> {
    return this.admins.find((a) => a.businessId === businessId && a.id === adminId) ?? null;
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
    const nowMs = Date.now();
    return this.pointsLedger
      .filter(
        (e) =>
          e.businessId === businessId &&
          e.customerId === customerId &&
          (!e.expiresAt || e.expiresAt.getTime() > nowMs),
      )
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
    return Array.from(this.menuItems.values()).filter(
      (i) => i.businessId === businessId && i.available,
    );
  }

  async listAllMenuItems(businessId: string): Promise<MenuItemRecord[]> {
    return Array.from(this.menuItems.values())
      .filter((i) => i.businessId === businessId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  async createMenuItem(input: {
    businessId: string;
    name: string;
    description?: string | null;
    priceKobo: number;
    category?: string | null;
    available: boolean;
    sortOrder: number;
  }): Promise<MenuItemRecord> {
    const id = randomUUID();
    const created: MenuItemRecord = {
      id,
      businessId: input.businessId,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      priceKobo: input.priceKobo,
      category: input.category?.trim() || undefined,
      available: input.available,
      sortOrder: input.sortOrder,
      createdAt: now(),
    };
    this.menuItems.set(id, created);
    return created;
  }

  async getItemById(id: string): Promise<MenuItemRecord | null> {
    return this.menuItems.get(id) ?? null;
  }

  // --- RewardRepository ---
  async findRewardByVisitCount(businessId: string, visitCount: number): Promise<{ label: string } | null> {
    return null; // Legacy method, rewards will be points/vouchers now
  }
  async listRewards(businessId: string): Promise<{ visitsRequired: number; label: string }[]> {
    const biz = this.businesses.get(businessId);
    const tiers = biz?.loyaltyConfig?.tiers ?? biz?.loyalty_config?.tiers;
    if (!Array.isArray(tiers)) return [];
    return tiers.map((t: { from: number; credits_kobo: number }) => ({
      visitsRequired: t.from,
      label: `₦${t.credits_kobo / 100} per visit`,
    }));
  }

  // --- AnalyticsRepository ---
  async getSummary(businessId: string): Promise<any> {
    const scansBiz = this.scans.filter((s) => s.businessId === businessId);
    const custBiz = Array.from(this.customers.values()).filter((c) => c.businessId === businessId);
    const fromScans = new Set(scansBiz.map((s) => s.customerId)).size;
    return {
      totalScans: scansBiz.length,
      uniqueCustomers: fromScans > 0 ? fromScans : custBiz.length,
      rewardsTriggered: 0,
    };
  }

  async getAnalyticsDashboard(businessId: string) {
    const summary = await this.getSummary(businessId);
    const scansBiz = this.scans.filter((s) => s.businessId === businessId);
    const byDay = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const s of scansBiz) {
      const key = s.scannedAt.toISOString().slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const scansByDay = Array.from(byDay.entries()).map(([date, count]) => ({ date, count }));

    const statusMap = new Map<string, number>();
    for (const o of this.orders.values()) {
      if (o.businessId !== businessId) continue;
      statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
    }
    const ordersByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    const menuItemsCount = Array.from(this.menuItems.values()).filter(
      (m) => m.businessId === businessId,
    ).length;
    const staffCount = this.admins.filter((a) => a.businessId === businessId).length;

    let creditsIssuedKobo = 0;
    let creditsRedeemedKobo = 0;
    for (const e of this.pointsLedger) {
      if (e.businessId !== businessId) continue;
      if (e.type === "award") creditsIssuedKobo += e.amount;
      if (e.type === "redeem") creditsRedeemedKobo += Math.abs(e.amount);
    }

    const activeVouchers = Array.from(this.vouchers.values()).filter(
      (v) => v.businessId === businessId && v.status === "active",
    ).length;

    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    const customersNewLast30Days = Array.from(this.customers.values()).filter(
      (c) => c.businessId === businessId && c.firstSeen.getTime() >= cutoff,
    ).length;

    const visitCounts = new Map<string, number>();
    for (const s of scansBiz) {
      visitCounts.set(s.customerId, (visitCounts.get(s.customerId) ?? 0) + 1);
    }
    const ws = visitCounts.size;
    const rep = Array.from(visitCounts.values()).filter((n) => n > 1).length;
    const repeatVisitRate = ws > 0 ? rep / ws : 0;

    const pendingOrders = Array.from(this.orders.values()).filter(
      (o) => o.businessId === businessId && o.status === "pending",
    ).length;

    return {
      summary,
      scansByDay,
      ordersByStatus,
      menuItemsCount,
      staffCount,
      creditsIssuedKobo,
      creditsRedeemedKobo,
      activeVouchers,
      customersNewLast30Days,
      repeatVisitRate,
      pendingOrders,
    };
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
