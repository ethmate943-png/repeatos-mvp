import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building, Global, Setting2 } from "iconsax-react";
import {
  repeatosAdminFetch,
  getDashboardMode,
  getDefaultBusinessId,
} from "@/lib/repeatos-server";
import { resolveDashboardBusiness } from "@/lib/dashboard-business";
import { dashboardBusinessQuery } from "@/lib/dashboard-nav";

import { ON_ACCENT } from "@/lib/dashboard-palette";
import type { AnalyticsDashboardPayload } from "../../overview-dashboard-client";

function formatNgn(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export type BusinessDetail = {
  id: string;
  name: string;
  slug: string;
  integrationMode: string;
  menuUrl: string | null;
  allowedOrigins: string[];
  loyaltyConfig: unknown;
  createdAt: string | null;
};

export default async function BusinessDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ business?: string }>;
}) {
  const { businessId: paramId } = await params;
  const sp = await searchParams;
  const { configured, businessId: resolvedId, businesses, mode } = await resolveDashboardBusiness(
    sp.business,
  );

  if (!configured) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-extrabold swiss-bold mb-3">Dashboard not wired</h2>
        <p className="text-(--foreground)/50 text-sm">
          Set <code className="text-xs bg-(--muted) px-1 py-0.5 rounded">REPEATOS_ADMIN_API_KEY</code>{" "}
          in <code className="text-xs">apps/web/.env.local</code>.
        </p>
      </div>
    );
  }

  const tenantMode = getDashboardMode() === "tenant";
  const defaultBid = getDefaultBusinessId();
  if (tenantMode && defaultBid && paramId !== defaultBid) {
    notFound();
  }

  const res = await repeatosAdminFetch(`/admin/businesses/${encodeURIComponent(paramId)}`);
  if (!res?.ok) {
    notFound();
  }

  const detail = (await res.json()) as BusinessDetail;
  const dashRes = await repeatosAdminFetch(
    `/admin/analytics/dashboard?businessId=${encodeURIComponent(paramId)}`,
  );
  const dash: AnalyticsDashboardPayload | null = dashRes?.ok
    ? ((await dashRes.json()) as AnalyticsDashboardPayload)
    : null;
  const q = dashboardBusinessQuery(mode, paramId);
  const contextLabel =
    resolvedId != null
      ? (businesses.find((b) => b.id === resolvedId)?.name ?? resolvedId)
      : "";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-zinc-100">
      <div className="flex items-start gap-4 mb-10">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-lg shadow-white/10 flex items-center justify-center shrink-0">
          <Building size={28} variant="Bold" color={ON_ACCENT} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">
            Business
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight swiss-bold mb-2 truncate text-white">
            {detail.name}
          </h2>
          <p className="text-zinc-500 text-sm font-mono">{detail.slug}</p>
          <div className="flex flex-wrap gap-3 mt-4 text-sm">
            <Link
              href={`/dashboard/settings${q}`}
              className="inline-flex items-center gap-2 text-white font-semibold underline underline-offset-4"
            >
              <Setting2 size={18} variant="Bold" aria-hidden />
              Settings
            </Link>
            <Link
              href={`/dashboard/users${q}`}
              className="inline-flex items-center gap-2 text-white font-semibold underline underline-offset-4"
            >
              Users
            </Link>
            <Link
              href={`/dashboard/customers${q}`}
              className="inline-flex items-center gap-2 text-white font-semibold underline underline-offset-4"
            >
              Credits
            </Link>
            <Link
              href={`/dashboard/orders${q}`}
              className="inline-flex items-center gap-2 text-white font-semibold underline underline-offset-4"
            >
              Orders
            </Link>
            <Link
              href={`/dashboard/menu${q}`}
              className="inline-flex items-center gap-2 text-white font-semibold underline underline-offset-4"
            >
              Menu
            </Link>
          </div>
        </div>
      </div>

      {mode === "platform" && businesses.length > 1 ? (
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
            Switch business
          </p>
          <ul className="flex flex-wrap gap-2">
            {businesses.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/dashboard/business/${b.id}${dashboardBusinessQuery(mode, b.id)}`}
                  className={`inline-block px-3 py-1.5 rounded-xl text-xs font-bold ${
                    b.id === paramId
                      ? "bg-white text-zinc-900"
                      : "bg-white/10 text-zinc-300 hover:bg-white/15"
                  }`}
                >
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {dash ? (
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <BizStat label="QR check-ins" value={String(dash.summary.totalScans)} />
          <BizStat label="Guests" value={String(dash.summary.uniqueCustomers)} />
          <BizStat label="New · 30d" value={String(dash.customersNewLast30Days)} />
          <BizStat label="Repeat rate" value={`${Math.round(dash.repeatVisitRate * 100)}%`} />
          <BizStat label="Credits issued" value={formatNgn(dash.creditsIssuedKobo)} />
          <BizStat label="Credits redeemed" value={formatNgn(dash.creditsRedeemedKobo)} />
          <BizStat label="Active vouchers" value={String(dash.activeVouchers)} />
          <BizStat label="Menu items" value={String(dash.menuItemsCount)} />
          <BizStat label="Staff seats" value={String(dash.staffCount)} />
          <BizStat label="Pending orders" value={String(dash.pendingOrders)} />
        </div>
      ) : (
        <p className="text-sm text-zinc-500 mb-8">
          Run a full migration (includes <code className="text-xs">admins</code> table) and ensure the
          API key is set to load live venue metrics here.
        </p>
      )}

      <div className="space-y-4">
        <DetailCard
          icon={<Global size={22} variant="Bold" className="text-white" aria-hidden />}
          title="Integration"
          body={
            <dl className="text-sm space-y-2 text-zinc-300">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Mode</dt>
                <dd className="font-mono text-xs">{detail.integrationMode}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Menu URL</dt>
                <dd className="font-mono text-xs truncate max-w-[60%] text-right">
                  {detail.menuUrl ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 mb-1">Allowed origins</dt>
                <dd className="font-mono text-xs break-all">
                  {detail.allowedOrigins?.length
                    ? detail.allowedOrigins.join(", ")
                    : "—"}
                </dd>
              </div>
            </dl>
          }
        />

        <DetailCard
          icon={<Building size={22} variant="Bold" className="text-white" aria-hidden />}
          title="Loyalty config (raw)"
          body={
            <pre className="text-xs font-mono bg-black/40 border border-white/10 rounded-xl p-4 overflow-x-auto max-h-80 overflow-y-auto text-zinc-300">
              {JSON.stringify(detail.loyaltyConfig ?? {}, null, 2)}
            </pre>
          }
        />

        {detail.createdAt ? (
          <p className="text-xs text-zinc-500 font-mono">
            Created {new Date(detail.createdAt).toLocaleString()} · ID {detail.id}
          </p>
        ) : (
          <p className="text-xs text-zinc-500 font-mono">ID {detail.id}</p>
        )}

        {resolvedId && resolvedId !== paramId ? (
          <p className="text-xs text-amber-600/90">
            Context business is{" "}
            <span className="font-mono">{contextLabel}</span>; this page shows{" "}
            <span className="font-mono">{detail.name}</span>. Use the switcher above or open with{" "}
            <code className="text-[10px]">?business=…</code> to align navigation.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BizStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="text-lg font-bold text-white mt-1 truncate">{value}</p>
    </div>
  );
}

function DetailCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 flex gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-sm uppercase tracking-wide mb-2 text-white">{title}</h3>
        {body}
      </div>
    </div>
  );
}
