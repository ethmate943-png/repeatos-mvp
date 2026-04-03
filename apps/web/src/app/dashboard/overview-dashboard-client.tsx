"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendUp,
  TrendDown,
  Cpu,
  Wallet3,
  ShoppingBag,
  People,
  MenuBoard,
  Building,
  Setting2,
} from "iconsax-react";
import { ON_ACCENT, ON_DARK } from "@/lib/dashboard-palette";

export type AnalyticsDashboardPayload = {
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
};

function formatNgn(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

type Props = {
  data: AnalyticsDashboardPayload | null;
  configured: boolean;
  businessId: string | null;
  mode: "platform" | "tenant";
  navQuery: string;
};

export function OverviewDashboardClient({
  data,
  configured,
  businessId,
  mode,
  navQuery,
}: Props) {
  const q = navQuery;
  const d = data ?? zeroDashboard();
  const chartScans = d.scansByDay.map((row) => ({
    ...row,
    label: row.date.slice(5).replace("-", "/"),
  }));

  const last7 = d.scansByDay.slice(-7).reduce((a, x) => a + x.count, 0);
  const prev7 = d.scansByDay.slice(0, 7).reduce((a, x) => a + x.count, 0);
  const scanDelta = last7 - prev7;
  const orderVolume = d.ordersByStatus.reduce((a, x) => a + x.count, 0);

  const insights = [
    {
      title: "Check-in momentum",
      body:
        scanDelta >= 0
          ? `Up ${scanDelta} scans in the last 7 days vs the week before. Keep QRs visible at tables.`
          : `${Math.abs(scanDelta)} fewer scans vs the prior week — nudge staff to mention rewards at handoff.`,
      icon: scanDelta >= 0 ? TrendUp : TrendDown,
      positive: scanDelta >= 0,
    },
    {
      title: "Repeat guests",
      body: `${pct(d.repeatVisitRate)} of guests who checked in came back at least once. Loyalty is working when this climbs.`,
      icon: People,
      positive: d.repeatVisitRate >= 0.25,
    },
    {
      title: "Credits in play",
      body: `${formatNgn(d.creditsIssuedKobo)} issued · ${formatNgn(d.creditsRedeemedKobo)} redeemed at the till. ${d.activeVouchers} active vouchers live.`,
      icon: Wallet3,
      positive: d.creditsIssuedKobo > 0,
    },
    {
      title: "Operations",
      body: `${d.pendingOrders} order${d.pendingOrders === 1 ? "" : "s"} waiting in pending — clearing them drives kitchen flow and unlocks credit awards on accept.`,
      icon: ShoppingBag,
      positive: d.pendingOrders === 0,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-10">
      <header className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          {mode === "platform" ? "Platform" : "Venue"} · live signals
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight swiss-bold text-white">
              Overview
            </h2>
            <p className="text-zinc-400 text-sm mt-2 max-w-xl leading-relaxed">
              What changed for your venue today: footfall from QR check-ins, credit movement, orders,
              and team coverage — so you can act before the shift ends.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <Cpu size={18} variant="Bold" color={ON_DARK} className="opacity-60" aria-hidden />
            {configured && businessId ? "Metrics refresh when you open this page." : "Wire the API to unlock live data."}
          </div>
        </div>
      </header>

      {!configured && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
          Add <code className="text-xs bg-black/30 px-1 rounded">REPEATOS_ADMIN_API_KEY</code> and{" "}
          <code className="text-xs bg-black/30 px-1 rounded">REPEATOS_API_URL</code> in{" "}
          <code className="text-xs">apps/web/.env.local</code>, then restart Next.js.
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="QR check-ins"
          value={String(d.summary.totalScans)}
          hint="All-time scans logged for this business"
        />
        <Kpi
          label="Guests in CRM"
          value={String(d.summary.uniqueCustomers)}
          hint="Unique phones that have checked in"
        />
        <Kpi
          label="New this month"
          value={String(d.customersNewLast30Days)}
          hint="First visit in the last 30 days"
        />
        <Kpi
          label="Menu live"
          value={String(d.menuItemsCount)}
          hint="Items on hosted menu"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Check-ins · last 14 days" subtitle="Daily QR volume (UTC days)">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartScans} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 12,
                  color: "#fafafa",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#ffffff"
                strokeWidth={2}
                fill="url(#scanFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Orders by status" subtitle="Pipeline balance">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.ordersByStatus} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="status" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 12,
                  color: "#fafafa",
                }}
              />
              <Bar dataKey="count" fill="#ffffff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {orderVolume === 0 ? (
            <p className="text-xs text-zinc-500 mt-2">No orders yet — hosted checkout will populate this.</p>
          ) : null}
        </ChartCard>
      </section>

      <section>
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">
          What to do next
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((row) => (
            <div
              key={row.title}
              className={`rounded-2xl border p-5 flex gap-4 ${
                row.positive
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  row.positive ? "bg-emerald-500/20" : "bg-white/10"
                }`}
              >
                <row.icon
                  size={22}
                  variant="Bold"
                  color={row.positive ? "#34d399" : ON_DARK}
                  aria-hidden
                />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{row.title}</p>
                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{row.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickLink
          href={`/dashboard/customers${q}`}
          title="Credits"
          desc="Balances & redemption"
          Icon={Wallet3}
        />
        <QuickLink
          href={`/dashboard/orders${q}`}
          title="Orders"
          desc={`${d.pendingOrders} pending`}
          Icon={ShoppingBag}
        />
        <QuickLink
          href={`/dashboard/users${q}`}
          title="Team"
          desc={`${d.staffCount} staff logins`}
          Icon={People}
        />
        <QuickLink
          href={`/dashboard/menu${q}`}
          title="Menu"
          desc={`${d.menuItemsCount} items`}
          Icon={MenuBoard}
        />
        <QuickLink
          href={businessId ? `/dashboard/business/${businessId}${q}` : `/dashboard/business${q}`}
          title="Business"
          desc="Venue profile"
          Icon={Building}
        />
        <QuickLink
          href={`/dashboard/settings${q}`}
          title="Settings"
          desc="Integration health"
          Icon={Setting2}
        />
      </section>
    </div>
  );
}

function zeroDashboard(): AnalyticsDashboardPayload {
  const scansByDay = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() - i);
    scansByDay.push({ date: day.toISOString().slice(0, 10), count: 0 });
  }
  return {
    summary: { totalScans: 0, uniqueCustomers: 0, rewardsTriggered: 0 },
    scansByDay,
    ordersByStatus: [],
    menuItemsCount: 0,
    staffCount: 0,
    creditsIssuedKobo: 0,
    creditsRedeemedKobo: 0,
    activeVouchers: 0,
    customersNewLast30Days: 0,
    repeatVisitRate: 0,
    pendingOrders: 0,
  };
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="text-3xl font-extrabold swiss-bold text-white mt-2">{value}</p>
      <p className="text-xs text-zinc-500 mt-2 leading-snug">{hint}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-6">
      <p className="text-xs font-black uppercase tracking-widest text-zinc-400">{title}</p>
      <p className="text-xs text-zinc-500 mt-1 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

function QuickLink({
  href,
  title,
  desc,
  Icon,
}: {
  href: string;
  title: string;
  desc: string;
  Icon: typeof Wallet3;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-white/10 p-5 transition-colors hover:border-white/25 hover:bg-white/[0.04]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-lg shadow-white/10">
        <Icon size={22} variant="Bold" color={ON_ACCENT} aria-hidden />
      </div>
      <div>
        <p className="text-sm font-bold tracking-wide text-white uppercase">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>
      </div>
    </Link>
  );
}
