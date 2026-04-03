"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  ArrowRight2,
  Refresh,
  ArrowDown2,
  SearchNormal1,
} from "iconsax-react";
import { updateOrderStatusAction } from "../actions";
import type { BusinessRow } from "@/lib/dashboard-business";
import { ON_ACCENT, ON_DARK } from "@/lib/dashboard-palette";
import { toast } from "sonner";

export type OrderRow = {
  id: string;
  businessId: string;
  customerId: string;
  items: unknown[];
  totalKobo: number;
  status: string;
  tableRef?: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_FLOW = ["pending", "accepted", "preparing", "ready"] as const;

type SortKey = "createdAt" | "totalKobo" | "status" | "tableRef";

type Props = {
  mode: "platform" | "tenant";
  businesses: BusinessRow[];
  businessId: string;
  initialOrders: OrderRow[];
};

function formatNgn(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function OrdersBoard({ mode, businesses, businessId, initialOrders }: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  React.useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  function switchBusiness(nextId: string) {
    router.push(`/dashboard/orders?business=${encodeURIComponent(nextId)}`);
  }

  function nextStatus(current: string): (typeof STATUS_FLOW)[number] | null {
    const i = STATUS_FLOW.indexOf(current as (typeof STATUS_FLOW)[number]);
    if (i < 0 || i >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[i + 1];
  }

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!q) return true;
      const blob = `${o.id} ${o.status} ${o.tableRef ?? ""} ${o.customerId}`.toLowerCase();
      return blob.includes(q);
    });

    const mul = sortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      switch (sortKey) {
        case "totalKobo":
          return mul * (a.totalKobo - b.totalKobo);
        case "status":
          return mul * a.status.localeCompare(b.status);
        case "tableRef":
          return mul * (a.tableRef ?? "").localeCompare(b.tableRef ?? "");
        case "createdAt":
        default:
          return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });
    return rows;
  }, [orders, statusFilter, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "createdAt" ? "desc" : "asc");
    }
  }

  function advance(order: OrderRow) {
    const next = nextStatus(order.status);
    if (!next) return;
    setError(null);
    setPendingId(order.id);
    startTransition(async () => {
      const res = await updateOrderStatusAction({ orderId: order.id, status: next });
      setPendingId(null);
      if (!res.ok) {
        const msg = res.message ?? "Update failed";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success(`Order marked ${next}.`);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)),
      );
      router.refresh();
    });
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[var(--color-accent)]/25 bg-[var(--color-accent)]">
            <ShoppingBag size={28} variant="Bold" color={ON_ACCENT} aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--foreground)/40 mb-1">
              Kitchen &amp; service
            </p>
            <h2 className="text-4xl font-extrabold tracking-tight swiss-bold">Orders</h2>
            <p className="text-(--foreground)/50 text-sm mt-1">
              Filter, sort, and move orders through pending → ready.
            </p>
          </div>
        </div>
        {mode === "platform" && businesses.length > 0 ? (
          <select
            value={businessId}
            onChange={(e) => switchBusiness(e.target.value)}
            className="bg-(--foreground)/5 border border-(--border)/50 rounded-xl px-4 py-3 text-sm font-medium min-w-[220px]"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <SearchNormal1
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
            size={18}
            color="currentColor"
            variant="Linear"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search id, status, table, customer…"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-(--foreground)/5 border border-(--border)/50 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl bg-(--foreground)/5 border border-(--border)/50 px-4 py-3 text-sm font-medium min-w-[160px]"
        >
          <option value="all">All statuses</option>
          {STATUS_FLOW.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <p className="text-xs text-(--foreground)/45 self-center sm:ml-auto">
          {filteredSorted.length} of {orders.length} orders
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-(--border)/50 overflow-hidden bg-(--muted)/20 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-zinc-900 text-white text-[10px] uppercase tracking-widest">
                <th className="px-4 py-3">
                  <SortTh
                    label="When"
                    active={sortKey === "createdAt"}
                    dir={sortDir}
                    onClick={() => toggleSort("createdAt")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortTh
                    label="Total"
                    active={sortKey === "totalKobo"}
                    dir={sortDir}
                    onClick={() => toggleSort("totalKobo")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortTh
                    label="Status"
                    active={sortKey === "status"}
                    dir={sortDir}
                    onClick={() => toggleSort("status")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortTh
                    label="Table"
                    active={sortKey === "tableRef"}
                    dir={sortDir}
                    onClick={() => toggleSort("tableRef")}
                  />
                </th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-(--foreground)/45">
                    {orders.length === 0
                      ? "No orders yet for this business."
                      : "No orders match your filters."}
                  </td>
                </tr>
              ) : (
                filteredSorted.map((o) => {
                  const next = nextStatus(o.status);
                  return (
                    <tr key={o.id} className="border-b border-(--border)/15 hover:bg-(--foreground)/5">
                      <td className="px-6 py-4 font-mono text-xs text-(--foreground)/55">
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-bold">{formatNgn(o.totalKobo)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-(--foreground)/10 capitalize">
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-(--foreground)/50">
                        {o.tableRef ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {next ? (
                          <button
                            type="button"
                            disabled={pendingId === o.id}
                            onClick={() => advance(o)}
                            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-(--accent) hover:underline disabled:opacity-40"
                          >
                            {pendingId === o.id ? (
                              <Refresh size={16} className="animate-spin" aria-hidden />
                            ) : (
                              <ArrowRight2 size={16} color="#fafafa" aria-hidden />
                            )}
                            Mark {next}
                          </button>
                        ) : (
                          <span className="text-xs text-(--foreground)/35">Done</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SortTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 font-black hover:text-white/90 text-white/80"
    >
      {label}
      <ArrowDown2
        size={14}
        variant="Bold"
        color={ON_DARK}
        className={active ? (dir === "desc" ? "rotate-180" : "") : "opacity-30"}
        aria-hidden
      />
    </button>
  );
}
