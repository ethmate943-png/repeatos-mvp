import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentText, ProfileCircle, Wallet3 } from "iconsax-react";
import {
  repeatosAdminFetch,
  getDashboardMode,
  getDefaultBusinessId,
} from "@/lib/repeatos-server";
import { resolveDashboardBusiness } from "@/lib/dashboard-business";
import { dashboardBusinessQuery } from "@/lib/dashboard-nav";
import type { CustomerLoyaltyPayload } from "../../actions";

import { ON_ACCENT } from "@/lib/dashboard-palette";

function formatNgn(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ business?: string }>;
}) {
  const { customerId } = await params;
  const sp = await searchParams;
  const { configured, businessId, businesses, mode } = await resolveDashboardBusiness(
    sp.business,
  );

  if (!configured || !businessId) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-extrabold swiss-bold mb-3">Dashboard not wired</h2>
        <p className="text-(--foreground)/50 text-sm">
          Configure the API key and open this page with a selected business.
        </p>
      </div>
    );
  }

  const tenantMode = getDashboardMode() === "tenant";
  const defaultBid = getDefaultBusinessId();
  if (tenantMode && defaultBid && businessId !== defaultBid) {
    notFound();
  }

  const res = await repeatosAdminFetch(
    `/admin/customers/${encodeURIComponent(customerId)}/loyalty?businessId=${encodeURIComponent(businessId)}`,
  );
  if (!res?.ok) {
    notFound();
  }

  const loyalty = (await res.json()) as CustomerLoyaltyPayload;
  const q = dashboardBusinessQuery(mode, businessId);
  const businessLabel = businesses.find((b) => b.id === businessId)?.name ?? "Business";

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 text-zinc-100">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-lg shadow-white/10 flex items-center justify-center shrink-0">
          <ProfileCircle size={28} variant="Bold" color={ON_ACCENT} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">
            Customer · {businessLabel}
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight swiss-bold mb-1 text-white">
            {loyalty.customer.name?.trim() || "Guest"}
          </h2>
          <p className="text-zinc-500 text-sm font-mono">{loyalty.customer.phone}</p>
          <div className="flex flex-wrap gap-3 mt-4 text-sm">
            <Link
              href={`/dashboard/customers${q}`}
              className="inline-flex items-center gap-2 text-white font-semibold underline underline-offset-4"
            >
              <Wallet3 size={18} variant="Bold" aria-hidden />
              Credits &amp; redeem
            </Link>
            <Link
              href={`/dashboard/users${q}`}
              className="text-white font-semibold underline underline-offset-4"
            >
              User management
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-xl mb-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">
          Balance
        </h3>
        <p className="text-4xl font-extrabold swiss-bold text-white">
          {formatNgn(loyalty.balanceKobo)}
        </p>
        <p className="text-sm text-zinc-400 mt-3">
          Min. to redeem: {formatNgn(loyalty.minRedemptionKobo)} · Credits expire after{" "}
          {loyalty.expiryDays} days per award · Max discount {loyalty.maxDiscountPct}% of order
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-sm text-(--foreground)/60">
        <div className="rounded-2xl border border-(--border)/50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-(--foreground)/40 mb-1">
            First seen
          </p>
          <p className="font-mono text-xs">{new Date(loyalty.customer.firstSeen).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-(--border)/50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-(--foreground)/40 mb-1">
            Last seen
          </p>
          <p className="font-mono text-xs">{new Date(loyalty.customer.lastSeen).toLocaleString()}</p>
        </div>
      </div>

      {loyalty.vouchers.length > 0 ? (
        <div className="rounded-3xl border border-(--border)/50 p-6 mb-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-(--foreground)/40 mb-4">
            Active vouchers
          </h3>
          <ul className="space-y-2 text-sm">
            {loyalty.vouchers.map((v) => (
              <li
                key={v.id}
                className="flex justify-between gap-4 py-2 border-b border-(--border)/20"
              >
                <span className="font-mono font-bold">{v.code}</span>
                <span>{formatNgn(v.valueKobo)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-3xl border border-(--border)/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border)/30 bg-(--foreground)/5 flex items-center gap-2">
          <DocumentText size={18} variant="Bold" className="text-(--foreground)/40" aria-hidden />
          <h3 className="text-xs font-black uppercase tracking-widest text-(--foreground)/50">
            Ledger
          </h3>
        </div>
        <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-(--border)/20 text-[10px] uppercase tracking-widest text-(--foreground)/40">
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loyalty.history.map((h) => (
                <tr key={h.id} className="border-b border-(--border)/10 hover:bg-(--foreground)/5">
                  <td className="px-4 py-2 font-mono text-xs text-(--foreground)/60">
                    {new Date(h.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">{h.type}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatNgn(h.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-(--foreground)/35 font-mono mt-6">Customer ID {loyalty.customer.id}</p>
    </div>
  );
}
