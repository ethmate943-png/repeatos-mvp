import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type {
  AdminRepository,
  AnalyticsRepository,
  CustomerLedgerRepository,
  CustomerSessionRepository,
  MenuRepository,
  OrderRepository,
  PointsLedgerRepository,
  RewardRepository,
  TenantRepository,
  VoucherRepository,
  WidgetRepository,
} from "./repository.js";
import type {
  AdminRecord,
  CustomerSessionRecord,
  CustomerRecord,
  MenuItemRecord,
  OrderRecord,
  OrderStatus,
  PointsLedgerRecord,
  Reward,
  ScanRecord,
  TenantContext,
  VoucherRecord,
  WidgetRecord,
} from "./types.js";

export class PostgresRepository
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
  constructor(private readonly pool: Pool) {}

  async findSessionById(
    sessionId: string,
  ): Promise<CustomerSessionRecord | null> {
    const res = await this.pool.query<{
      id: string;
      business_id: string;
      customer_id: string;
      phone: string;
      created_at: Date;
      last_seen: Date;
    }>(
      `
        UPDATE customer_sessions
        SET last_seen = NOW()
        WHERE id = $1
        RETURNING id,
          business_id,
          customer_id,
          phone,
          created_at,
          last_seen
      `,
      [sessionId],
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      businessId: row.business_id,
      customerId: row.customer_id,
      phone: row.phone,
      createdAt: row.created_at,
      lastSeen: row.last_seen,
    };
  }

  async createSession(input: {
    businessId: string;
    customerId: string;
    phone: string;
  }): Promise<CustomerSessionRecord> {
    const id = randomUUID();
    const res = await this.pool.query<{
      id: string;
      business_id: string;
      customer_id: string;
      phone: string;
      created_at: Date;
      last_seen: Date;
    }>(
      `
        INSERT INTO customer_sessions (id, business_id, customer_id, phone)
        VALUES ($1, $2, $3, $4)
        RETURNING id,
          business_id,
          customer_id,
          phone,
          created_at,
          last_seen
      `,
      [id, input.businessId, input.customerId, input.phone],
    );

    const row = res.rows[0];
    return {
      id: row.id,
      businessId: row.business_id,
      customerId: row.customer_id,
      phone: row.phone,
      createdAt: row.created_at,
      lastSeen: row.last_seen,
    };
  }

  async findTenantByToken(token: string): Promise<TenantContext | null> {
    const result = await this.pool.query<{
      token: string;
      business_id: string;
      active: boolean;
      allowed_origins: string[] | null;
    }>(
      `
        SELECT qr.token, qr.business_id, qr.active, b.allowed_origins
        FROM qr_codes qr
        JOIN businesses b ON b.id = qr.business_id
        WHERE qr.token = $1
        LIMIT 1
      `,
      [token],
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row.active) {
      return null;
    }

    return {
      businessId: row.business_id,
      allowedOrigins: row.allowed_origins ?? [],
      token: row.token,
    };
  }

  async getBusiness(id: string): Promise<any> {
    const res = await this.pool.query(
      `SELECT
         id,
         name,
         slug,
         integration_mode AS "integrationMode",
         menu_url AS "menuUrl",
         allowed_origins AS "allowedOrigins",
         loyalty_config AS "loyaltyConfig",
         created_at AS "createdAt"
       FROM businesses WHERE id = $1`,
      [id],
    );
    return res.rows[0];
  }

  async findByBusinessAndPhone(
    businessId: string,
    phone: string,
  ): Promise<CustomerRecord | null> {
    const res = await this.pool.query(
      "SELECT id, business_id as \"businessId\", phone, name, first_seen as \"firstSeen\", last_seen as \"lastSeen\" FROM customers WHERE business_id = $1 AND phone = $2",
      [businessId, phone],
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0] as any;
    return {
      ...row,
      name: row.name ?? undefined,
    } as CustomerRecord;
  }

  async findCustomerById(
    businessId: string,
    customerId: string,
  ): Promise<CustomerRecord | null> {
    const res = await this.pool.query(
      `SELECT id, business_id as "businessId", phone, name, first_seen as "firstSeen", last_seen as "lastSeen"
       FROM customers WHERE business_id = $1 AND id = $2`,
      [businessId, customerId],
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0] as any;
    return { ...row, name: row.name ?? undefined } as CustomerRecord;
  }

  async upsertVisit(
    businessId: string,
    phone: string,
    name?: string,
  ): Promise<CustomerRecord> {
    const id = randomUUID();
    const res = await this.pool.query(
      `INSERT INTO customers (id, business_id, phone, name, first_seen, last_seen)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (business_id, phone)
       DO UPDATE SET
         last_seen = NOW(),
         name = COALESCE(EXCLUDED.name, customers.name)
       RETURNING id, business_id as "businessId", phone, name, first_seen as "firstSeen", last_seen as "lastSeen"`,
      [id, businessId, phone, name ?? null],
    );

    const row = res.rows[0] as any;
    return { ...row, name: row.name ?? undefined } as CustomerRecord;
  }

  async insertScan(
    record: Omit<ScanRecord, "id" | "scannedAt">,
  ): Promise<ScanRecord> {
    const result = await this.pool.query<{
      id: string;
      business_id: string;
      customer_id: string;
      phone: string;
      token: string;
      visit_count: number;
      scanned_at: Date;
      ip: string | null;
      user_agent: string | null;
    }>(
      `
        INSERT INTO scans (
          id, business_id, customer_id, phone, token, visit_count, scanned_at, ip, user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
        RETURNING id, business_id, customer_id, phone, token, visit_count, scanned_at, ip, user_agent
      `,
      [
        randomUUID(),
        record.businessId,
        record.customerId,
        record.phone,
        record.token,
        record.visitCount,
        record.ip ?? null,
        record.userAgent ?? null,
      ],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      businessId: row.business_id,
      customerId: row.customer_id,
      phone: row.phone,
      token: row.token,
      visitCount: row.visit_count,
      scannedAt: row.scanned_at,
      ip: row.ip ?? undefined,
      userAgent: row.user_agent ?? undefined,
    };
  }

  async hasRecentScan(customerId: string, withinSeconds: number): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM scans
          WHERE customer_id = $1
          AND scanned_at >= NOW() - ($2 * INTERVAL '1 second')
        ) AS exists
      `,
      [customerId, withinSeconds],
    );

    return result.rows[0]?.exists ?? false;
  }
  
  async countScans(businessId: string, customerId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM scans WHERE business_id = $1 AND customer_id = $2`,
      [businessId, customerId],
    );
    return parseInt(result.rows[0].count, 10);
  }

  async listCustomers(businessId: string): Promise<CustomerRecord[]> {
    const res = await this.pool.query(
      `SELECT id, business_id as "businessId", phone, name, first_seen as "firstSeen", last_seen as "lastSeen"
       FROM customers WHERE business_id = $1 ORDER BY last_seen DESC`,
      [businessId],
    );
    return res.rows.map((row: any) => ({ ...row, name: row.name ?? undefined })) as CustomerRecord[];
  }

  // --- AdminRepository ---
  async listBusinesses(): Promise<{ id: string; name: string; slug: string }[]> {
    const res = await this.pool.query<{ id: string; name: string; slug: string }>(
      `SELECT id, name, slug FROM businesses ORDER BY name ASC`,
    );
    return res.rows;
  }

  async listAdmins(businessId: string): Promise<AdminRecord[]> {
    const res = await this.pool.query(
      `SELECT id, business_id as "businessId", email, password_hash as "passwordHash", created_at as "createdAt"
       FROM admins WHERE business_id = $1 ORDER BY created_at ASC`,
      [businessId],
    );
    return res.rows;
  }

  async findAdminById(businessId: string, adminId: string): Promise<AdminRecord | null> {
    const res = await this.pool.query(
      `SELECT id, business_id as "businessId", email, password_hash as "passwordHash", created_at as "createdAt"
       FROM admins WHERE business_id = $1 AND id = $2`,
      [businessId, adminId],
    );
    return res.rows[0] ?? null;
  }

  async createAdmin(admin: Omit<AdminRecord, "id" | "createdAt">): Promise<AdminRecord> {
    const id = randomUUID();
    const res = await this.pool.query(
      `INSERT INTO admins (id, business_id, email, password_hash, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, business_id as "businessId", email, password_hash as "passwordHash", created_at as "createdAt"`,
      [id, admin.businessId, admin.email, admin.passwordHash],
    );
    return res.rows[0];
  }

  async deleteAdmin(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM admins WHERE id = $1`, [id]);
  }

  async findRewardByVisitCount(
    businessId: string,
    visitCount: number,
  ): Promise<{ label: string } | null> {
    const result = await this.pool.query<{ label: string }>(
      `
        SELECT label
        FROM rewards
        WHERE business_id = $1
          AND visits_required = $2
          AND active = true
        LIMIT 1
      `,
      [businessId, visitCount],
    );

    if (result.rowCount === 0) {
      return null;
    }

    return { label: result.rows[0].label };
  }

  async createOrder(order: Omit<OrderRecord, "id" | "createdAt" | "updatedAt">): Promise<OrderRecord> {
    const id = randomUUID();
    const res = await this.pool.query(
      `INSERT INTO orders (id, business_id, customer_id, items, total_kobo, status, table_ref, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, business_id as "businessId", customer_id as "customerId", items, total_kobo as "totalKobo", status, table_ref as "tableRef", created_at as "createdAt", updated_at as "updatedAt"`,
      [id, order.businessId, order.customerId, JSON.stringify(order.items), order.totalKobo, order.status, order.tableRef],
    );
    return res.rows[0];
  }

  async getOrderById(id: string): Promise<OrderRecord | null> {
    const res = await this.pool.query(
      `SELECT id, business_id as "businessId", customer_id as "customerId", items, total_kobo as "totalKobo", status, table_ref as "tableRef", created_at as "createdAt", updated_at as "updatedAt"
       FROM orders WHERE id = $1`,
      [id],
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<OrderRecord> {
    const res = await this.pool.query(
      `UPDATE orders SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, business_id as "businessId", customer_id as "customerId", items, total_kobo as "totalKobo", status, table_ref as "tableRef", created_at as "createdAt", updated_at as "updatedAt"`,
      [status, id],
    );
    if (res.rows.length === 0) throw new Error("Order not found");
    return res.rows[0];
  }

  async listOrdersByBusiness(businessId: string, status?: OrderStatus): Promise<OrderRecord[]> {
    let query = `SELECT id, business_id as "businessId", customer_id as "customerId", items, total_kobo as "totalKobo", status, table_ref as "tableRef", created_at as "createdAt", updated_at as "updatedAt"
                 FROM orders WHERE business_id = $1`;
    const params: any[] = [businessId];
    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }
    query += ` ORDER BY created_at DESC`;
    const res = await this.pool.query(query, params);
    return res.rows;
  }

  // --- PointsLedgerRepository ---

  async addEntry(entry: Omit<PointsLedgerRecord, "id" | "createdAt">): Promise<PointsLedgerRecord> {
    const id = randomUUID();
    const res = await this.pool.query(
      `INSERT INTO points_ledger (id, business_id, customer_id, order_id, type, amount, note, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
       RETURNING id, business_id as "businessId", customer_id as "customerId", order_id as "orderId", type, amount, note, created_at as "createdAt", expires_at as "expiresAt"`,
      [
        id,
        entry.businessId,
        entry.customerId,
        entry.orderId ?? null,
        entry.type,
        entry.amount,
        entry.note ?? null,
        entry.expiresAt ?? null,
      ],
    );
    return res.rows[0];
  }

  async getBalance(businessId: string, customerId: string): Promise<number> {
    const res = await this.pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS balance FROM points_ledger
       WHERE business_id = $1 AND customer_id = $2
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [businessId, customerId],
    );
    return parseInt(res.rows[0].balance, 10);
  }

  async listEntries(businessId: string, customerId: string): Promise<PointsLedgerRecord[]> {
    const res = await this.pool.query(
      `SELECT id, business_id as "businessId", customer_id as "customerId", order_id as "orderId", type, amount, note, created_at as "createdAt", expires_at as "expiresAt"
       FROM points_ledger WHERE business_id = $1 AND customer_id = $2 ORDER BY created_at DESC`,
      [businessId, customerId],
    );
    return res.rows.map((row: any) => ({
      ...row,
      expiresAt: row.expiresAt ?? undefined,
    }));
  }

  // --- VoucherRepository ---

  async createVoucher(voucher: Omit<VoucherRecord, "id" | "issuedAt">): Promise<VoucherRecord> {
    const id = randomUUID();
    const res = await this.pool.query(
      `INSERT INTO vouchers (id, business_id, customer_id, code, value_kobo, min_order_kobo, max_discount_pct, status, expires_at, issued_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id, business_id as "businessId", customer_id as "customerId", code, value_kobo as "valueKobo", min_order_kobo as "minOrderKobo", max_discount_pct as "maxDiscountPct", status, expires_at as "expiresAt", issued_at as "issuedAt"`,
      [id, voucher.businessId, voucher.customerId, voucher.code, voucher.valueKobo, voucher.minOrderKobo, voucher.maxDiscountPct, voucher.status, voucher.expiresAt],
    );
    return res.rows[0];
  }

  async getVoucherByCode(code: string): Promise<VoucherRecord | null> {
    const res = await this.pool.query(
      `SELECT id, business_id as "businessId", customer_id as "customerId", code, value_kobo as "valueKobo", min_order_kobo as "minOrderKobo", max_discount_pct as "maxDiscountPct", status, expires_at as "expiresAt", issued_at as "issuedAt"
       FROM vouchers WHERE code = $1`,
      [code],
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  async listActiveVouchers(businessId: string, customerId: string): Promise<VoucherRecord[]> {
    const res = await this.pool.query(
      `SELECT id, business_id as "businessId", customer_id as "customerId", code, value_kobo as "valueKobo", min_order_kobo as "minOrderKobo", max_discount_pct as "maxDiscountPct", status, expires_at as "expiresAt", issued_at as "issuedAt"
       FROM vouchers WHERE business_id = $1 AND customer_id = $2 AND status = 'active' AND expires_at > NOW()`,
      [businessId, customerId],
    );
    return res.rows;
  }

  async markRedeemed(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE vouchers SET status = 'redeemed', redeemed_at = NOW() WHERE id = $1`,
      [id],
    );
  }

  // --- MenuRepository ---

  async listItems(businessId: string): Promise<MenuItemRecord[]> {
    const res = await this.pool.query(
      `SELECT id, business_id as "businessId", name, description, price_kobo as "priceKobo", category, available, sort_order as "sortOrder", created_at as "createdAt"
       FROM menu_items WHERE business_id = $1 AND available = true ORDER BY sort_order ASC`,
      [businessId],
    );
    return res.rows;
  }

  async listAllMenuItems(businessId: string): Promise<MenuItemRecord[]> {
    const res = await this.pool.query(
      `SELECT id, business_id as "businessId", name, description, price_kobo as "priceKobo", category, available, sort_order as "sortOrder", created_at as "createdAt"
       FROM menu_items WHERE business_id = $1 ORDER BY sort_order ASC, name ASC`,
      [businessId],
    );
    return res.rows;
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
    const res = await this.pool.query(
      `INSERT INTO menu_items (id, business_id, name, description, price_kobo, category, available, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, business_id as "businessId", name, description, price_kobo as "priceKobo", category, available, sort_order as "sortOrder", created_at as "createdAt"`,
      [
        id,
        input.businessId,
        input.name.trim(),
        input.description?.trim() || null,
        input.priceKobo,
        input.category?.trim() || null,
        input.available,
        input.sortOrder,
      ],
    );
    return res.rows[0];
  }

  async getItemById(id: string): Promise<MenuItemRecord | null> {
    const res = await this.pool.query(
      `SELECT id, business_id as "businessId", name, description, price_kobo as "priceKobo", category, available, sort_order as "sortOrder", created_at as "createdAt"
       FROM menu_items WHERE id = $1`,
      [id],
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  // --- RewardRepository ---
  async listRewards(businessId: string): Promise<{ visitsRequired: number; label: string }[]> {
    const result = await this.pool.query<{
      visits_required: number;
      label: string;
    }>(
      `
        SELECT visits_required, label
        FROM rewards
        WHERE business_id = $1
          AND active = true
        ORDER BY visits_required ASC
      `,
      [businessId],
    );

    return result.rows.map((row) => ({
      visitsRequired: row.visits_required,
      label: row.label,
    }));
  }

  async getSummary(businessId: string): Promise<{
    totalScans: number;
    uniqueCustomers: number;
    rewardsTriggered: number;
  }> {
    const totals = await this.pool.query<{
      total_scans: string;
      unique_customers: string;
    }>(
      `
        SELECT
          COUNT(*)::text AS total_scans,
          COUNT(DISTINCT customer_id)::text AS unique_customers
        FROM scans
        WHERE business_id = $1
      `,
      [businessId],
    );

    const rewards = await this.pool.query<{ rewards_triggered: string }>(
      `
        SELECT COUNT(*)::text AS rewards_triggered
        FROM scans s
        JOIN rewards r
          ON r.business_id = s.business_id
         AND r.visits_required = s.visit_count
         AND r.active = true
        WHERE s.business_id = $1
      `,
      [businessId],
    );

    return {
      totalScans: Number(totals.rows[0]?.total_scans ?? 0),
      uniqueCustomers: Number(totals.rows[0]?.unique_customers ?? 0),
      rewardsTriggered: Number(rewards.rows[0]?.rewards_triggered ?? 0),
    };
  }

  async getAnalyticsDashboard(businessId: string): Promise<{
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
  }> {
    const summary = await this.getSummary(businessId);

    const scansDay = await this.pool.query<{ d: string; c: string }>(
      `
        SELECT to_char((scanned_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS d,
               COUNT(*)::text AS c
        FROM scans
        WHERE business_id = $1
          AND scanned_at >= NOW() - INTERVAL '14 days'
        GROUP BY (scanned_at AT TIME ZONE 'UTC')::date
        ORDER BY d ASC
      `,
      [businessId],
    );
    const byDay = new Map<string, number>();
    for (const row of scansDay.rows) {
      byDay.set(row.d, Number(row.c));
    }
    const scansByDay: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      scansByDay.push({ date: key, count: byDay.get(key) ?? 0 });
    }

    const ordersSt = await this.pool.query<{ status: string; c: string }>(
      `SELECT status, COUNT(*)::text AS c FROM orders WHERE business_id = $1 GROUP BY status`,
      [businessId],
    );

    const menuC = await this.pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM menu_items WHERE business_id = $1`,
      [businessId],
    );

    const staffC = await this.pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM admins WHERE business_id = $1`,
      [businessId],
    );

    const ledger = await this.pool.query<{ type: string; t: string }>(
      `SELECT type, COALESCE(SUM(amount), 0)::text AS t FROM points_ledger WHERE business_id = $1 GROUP BY type`,
      [businessId],
    );
    let creditsIssuedKobo = 0;
    let creditsRedeemedKobo = 0;
    for (const row of ledger.rows) {
      if (row.type === "award") creditsIssuedKobo += Number(row.t);
      if (row.type === "redeem") creditsRedeemedKobo += Math.abs(Number(row.t));
    }

    const vouch = await this.pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM vouchers WHERE business_id = $1 AND status = 'active'`,
      [businessId],
    );

    const newCust = await this.pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM customers WHERE business_id = $1 AND first_seen >= NOW() - INTERVAL '30 days'`,
      [businessId],
    );

    const repeatQ = await this.pool.query<{ with_scans: string; repeaters: string }>(
      `
        WITH visit_counts AS (
          SELECT customer_id, COUNT(*) AS n
          FROM scans
          WHERE business_id = $1
          GROUP BY customer_id
        )
        SELECT
          COUNT(*)::text AS with_scans,
          COUNT(*) FILTER (WHERE n > 1)::text AS repeaters
        FROM visit_counts
      `,
      [businessId],
    );
    const ws = Number(repeatQ.rows[0]?.with_scans ?? 0);
    const rep = Number(repeatQ.rows[0]?.repeaters ?? 0);
    const repeatVisitRate = ws > 0 ? rep / ws : 0;

    const pend = await this.pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM orders WHERE business_id = $1 AND status = 'pending'`,
      [businessId],
    );

    return {
      summary,
      scansByDay,
      ordersByStatus: ordersSt.rows.map((r) => ({ status: r.status, count: Number(r.c) })),
      menuItemsCount: Number(menuC.rows[0]?.c ?? 0),
      staffCount: Number(staffC.rows[0]?.c ?? 0),
      creditsIssuedKobo,
      creditsRedeemedKobo,
      activeVouchers: Number(vouch.rows[0]?.c ?? 0),
      customersNewLast30Days: Number(newCust.rows[0]?.c ?? 0),
      repeatVisitRate,
      pendingOrders: Number(pend.rows[0]?.c ?? 0),
    };
  }

  async createWidget(
    widget: Omit<WidgetRecord, "id" | "createdAt">,
  ): Promise<WidgetRecord> {
    const id = randomUUID();
    const result = await this.pool.query<{
      id: string;
      business_id: string;
      name: string;
      config: any;
      created_at: Date;
    }>(
      `
        INSERT INTO widgets (id, business_id, name, config, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, business_id, name, config, created_at
      `,
      [id, widget.businessId, widget.name, JSON.stringify(widget.config)],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      config: row.config,
      createdAt: row.created_at,
    };
  }

  async getWidgetById(id: string): Promise<WidgetRecord | null> {
    const result = await this.pool.query<{
      id: string;
      business_id: string;
      name: string;
      config: any;
      created_at: Date;
    }>(
      `
        SELECT id, business_id, name, config, created_at
        FROM widgets
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      config: row.config,
      createdAt: row.created_at,
    };
  }

  async listWidgetsByBusiness(businessId: string): Promise<WidgetRecord[]> {
    const result = await this.pool.query<{
      id: string;
      business_id: string;
      name: string;
      config: any;
      created_at: Date;
    }>(
      `
        SELECT id, business_id, name, config, created_at
        FROM widgets
        WHERE business_id = $1
        ORDER BY created_at DESC
      `,
      [businessId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      config: row.config,
      createdAt: row.created_at,
    }));
  }
}
