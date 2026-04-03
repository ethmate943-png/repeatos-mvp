"use server";

import { repeatosAdminFetch } from "@/lib/repeatos-server";

export type CustomerLoyaltyPayload = {
  customer: {
    id: string;
    phone: string;
    name: string | null;
    firstSeen: string;
    lastSeen: string;
  };
  balanceKobo: number;
  minRedemptionKobo: number;
  maxDiscountPct: number;
  expiryDays: number;
  history: Array<{
    id: string;
    type: string;
    amount: number;
    note: string | null;
    createdAt: string;
    expiresAt: string | null;
  }>;
  vouchers: Array<{
    id: string;
    code: string;
    valueKobo: number;
    status: string;
    expiresAt: string;
  }>;
};

export async function loadCustomerLoyaltyAction(
  businessId: string,
  customerId: string,
): Promise<CustomerLoyaltyPayload | { error: string }> {
  const res = await repeatosAdminFetch(
    `/admin/customers/${customerId}/loyalty?businessId=${encodeURIComponent(businessId)}`,
  );
  if (!res) {
    return { error: "REPEATOS_ADMIN_API_KEY is not set on the Next.js server." };
  }
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    return { error: data.message ?? "Failed to load loyalty details." };
  }
  return data as CustomerLoyaltyPayload;
}

export async function redeemCreditsAction(input: {
  businessId: string;
  customerId: string;
  amountKobo: number;
  orderValueKobo: number;
  note: string;
}): Promise<
  | { ok: true; amount_redeemed_kobo: number; new_balance_kobo: number }
  | { ok: false; error: string }
> {
  const res = await repeatosAdminFetch(
    `/admin/customers/${input.customerId}/redeem`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: input.businessId,
        amount_kobo: input.amountKobo,
        order_value_kobo: input.orderValueKobo,
        note: input.note,
      }),
    },
  );
  if (!res) {
    return { ok: false, error: "REPEATOS_ADMIN_API_KEY is not set on the Next.js server." };
  }
  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
    amount_redeemed_kobo?: number;
    new_balance_kobo?: number;
  };
  if (!res.ok) {
    return { ok: false, error: data.message ?? "Redemption failed." };
  }
  return {
    ok: true,
    amount_redeemed_kobo: data.amount_redeemed_kobo ?? input.amountKobo,
    new_balance_kobo: data.new_balance_kobo ?? 0,
  };
}

export async function createStaffAction(input: {
  businessId: string;
  email: string;
  password: string;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await repeatosAdminFetch("/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessId: input.businessId,
      email: input.email,
      password: input.password,
    }),
  });
  if (!res) return { ok: false, message: "API not configured." };
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, message: data.message ?? "Create failed." };
  }
  return { ok: true };
}

export async function updateOrderStatusAction(input: {
  orderId: string;
  status: "pending" | "accepted" | "preparing" | "ready";
}): Promise<{ ok: boolean; message?: string }> {
  const res = await repeatosAdminFetch(`/admin/orders/${input.orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: input.status }),
  });
  if (!res) return { ok: false, message: "API not configured." };
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, message: data.error ?? "Update failed." };
  }
  return { ok: true };
}

export async function createMenuItemAction(input: {
  businessId: string;
  name: string;
  description?: string;
  priceKobo: number;
  category?: string;
  available?: boolean;
  sortOrder?: number;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await repeatosAdminFetch("/admin/menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessId: input.businessId,
      name: input.name,
      description: input.description,
      priceKobo: input.priceKobo,
      category: input.category,
      available: input.available ?? true,
      sortOrder: input.sortOrder ?? 0,
    }),
  });
  if (!res) return { ok: false, message: "API not configured." };
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, message: data.message ?? "Could not create menu item." };
  }
  return { ok: true };
}

export async function createCustomerAction(input: {
  businessId: string;
  phone: string;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await repeatosAdminFetch("/admin/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      businessId: input.businessId,
      phone: input.phone,
    }),
  });
  if (!res) return { ok: false, message: "API not configured." };
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, message: data.message ?? "Create failed." };
  }
  return { ok: true };
}
