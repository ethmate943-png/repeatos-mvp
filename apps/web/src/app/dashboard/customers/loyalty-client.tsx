"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet3, DocumentText, ProfileCircle, SearchNormal1 } from "iconsax-react";
import { dashboardBusinessQuery } from "@/lib/dashboard-nav";
import {
  loadCustomerLoyaltyAction,
  redeemCreditsAction,
  type CustomerLoyaltyPayload,
} from "../actions";

import { ON_ACCENT, ON_DARK } from "@/lib/dashboard-palette";
import { toast } from "sonner";

function formatNgn(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export type CustomerRow = {
  id: string;
  phone: string;
  name?: string;
  firstSeen: string;
  lastSeen: string;
};

export type BusinessRow = { id: string; name: string; slug: string };

type Props = {
  mode: "platform" | "tenant";
  businesses: BusinessRow[];
  businessId: string;
  businessLabel: string;
  customers: CustomerRow[];
};

export function LoyaltyDashboardClient({
  mode,
  businesses,
  businessId,
  businessLabel,
  customers,
}: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loyalty, setLoyalty] = useState<CustomerLoyaltyPayload | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemOk, setRedeemOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [redeemPending, startRedeem] = useTransition();

  const [orderValueNgn, setOrderValueNgn] = useState("");
  const [amountNgn, setAmountNgn] = useState("");
  const [note, setNote] = useState("");
  const [listFilter, setListFilter] = useState("");
  const [listSort, setListSort] = useState<"lastSeen" | "name" | "phone">("lastSeen");
  const [listSortDir, setListSortDir] = useState<"asc" | "desc">("desc");
  const [ledgerSortKey, setLedgerSortKey] = useState<"createdAt" | "type" | "amount">(
    "createdAt",
  );
  const [ledgerSortDir, setLedgerSortDir] = useState<"asc" | "desc">("desc");

  const customersFiltered = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    let rows = !q
      ? customers
      : customers.filter((c) => {
          const blob = `${c.name ?? ""} ${c.phone} ${c.id}`.toLowerCase();
          return blob.includes(q);
        });
    const mul = listSortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      if (listSort === "phone") return mul * a.phone.localeCompare(b.phone);
      if (listSort === "name")
        return mul * (a.name ?? "").localeCompare(b.name ?? "");
      return (
        mul *
        (new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime())
      );
    });
    return rows;
  }, [customers, listFilter, listSort, listSortDir]);

  const ledgerRows = useMemo(() => {
    if (!loyalty?.history?.length) return [];
    const mul = ledgerSortDir === "asc" ? 1 : -1;
    const rows = [...loyalty.history];
    rows.sort((a, b) => {
      if (ledgerSortKey === "amount") return mul * (a.amount - b.amount);
      if (ledgerSortKey === "type") return mul * a.type.localeCompare(b.type);
      return (
        mul *
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      );
    });
    return rows.slice(0, 120);
  }, [loyalty, ledgerSortKey, ledgerSortDir]);

  function onSelectBusiness(nextId: string) {
    router.push(`/dashboard/customers?business=${encodeURIComponent(nextId)}`);
  }

  function loadCustomer(id: string) {
    setSelectedId(id);
    setLoyalty(null);
    setPanelError(null);
    setRedeemError(null);
    setRedeemOk(null);
    startTransition(async () => {
      const res = await loadCustomerLoyaltyAction(businessId, id);
      if ("error" in res) {
        setPanelError(res.error);
        return;
      }
      setLoyalty(res);
    });
  }

  function onRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !loyalty) return;
    setRedeemError(null);
    setRedeemOk(null);

    const orderKobo = Math.round(Number(orderValueNgn) * 100);
    const amtKobo = Math.round(Number(amountNgn) * 100);
    if (!Number.isFinite(orderKobo) || orderKobo < 0) {
      setRedeemError("Enter a valid order total (₦).");
      return;
    }
    if (!Number.isFinite(amtKobo) || amtKobo <= 0) {
      setRedeemError("Enter a valid credit amount (₦).");
      return;
    }
    if (!note.trim()) {
      setRedeemError("Add a short note (e.g. table or receipt ref).");
      return;
    }

    startRedeem(async () => {
      const res = await redeemCreditsAction({
        businessId,
        customerId: selectedId,
        amountKobo: amtKobo,
        orderValueKobo: orderKobo,
        note: note.trim(),
      });
      if (!res.ok) {
        setRedeemError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success("Credits applied at the till.");
      setRedeemOk(
        `Redeemed ${formatNgn(res.amount_redeemed_kobo)}. New balance ${formatNgn(res.new_balance_kobo)}.`,
      );
      setOrderValueNgn("");
      setAmountNgn("");
      setNote("");
      const refreshed = await loadCustomerLoyaltyAction(businessId, selectedId);
      if (!("error" in refreshed)) setLoyalty(refreshed);
      router.refresh();
    });
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[var(--color-accent)]/25 bg-[var(--color-accent)]">
            <Wallet3 size={28} variant="Bold" color={ON_ACCENT} aria-hidden />
          </div>
          <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--foreground)/40 mb-2">
            {mode === "platform" ? "RepeatOS platform" : "Your venue"}
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight swiss-bold mb-2">
            Credits &amp; redemption
          </h2>
          <p className="text-(--foreground)/50 text-sm font-medium max-w-xl">
            Look up a customer, confirm their balance, and apply a manual credit discount
            at checkout. The API enforces minimum balance, max discount as a percentage of
            order total, and amount caps from each venue&apos;s loyalty config.
          </p>
          </div>
        </div>

        {mode === "platform" && businesses.length > 0 ? (
          <div className="flex flex-col gap-1 min-w-[240px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-(--foreground)/40">
              Business
            </label>
            <select
              value={businessId}
              onChange={(e) => onSelectBusiness(e.target.value)}
              className="bg-(--foreground)/5 border border-(--border)/50 rounded-xl px-4 py-3 text-sm font-medium"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.slug})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-right text-sm text-(--foreground)/50 font-medium">
            {businessLabel}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        <div className="xl:col-span-2 bg-(--muted)/30 border border-(--border)/50 rounded-3xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-(--border)/30 bg-zinc-900 text-white flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ProfileCircle size={18} variant="Bold" color={ON_DARK} aria-hidden />
              <h3 className="text-xs font-black uppercase tracking-widest text-white/90">
                Customers ({customersFiltered.length}
                {customersFiltered.length !== customers.length
                  ? ` of ${customers.length}`
                  : ""}
                )
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <SearchNormal1
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"
                  size={16}
                  color={ON_DARK}
                  variant="Linear"
                  aria-hidden
                />
                <input
                  type="search"
                  value={listFilter}
                  onChange={(e) => setListFilter(e.target.value)}
                  placeholder="Filter…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm text-white placeholder:text-white/40"
                />
              </div>
              <select
                value={listSort}
                onChange={(e) => {
                  const v = e.target.value as "lastSeen" | "name" | "phone";
                  setListSort(v);
                  setListSortDir(v === "lastSeen" ? "desc" : "asc");
                }}
                className="rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-sm text-white font-medium min-w-[140px]"
              >
                <option value="lastSeen" className="text-zinc-900">
                  Last seen
                </option>
                <option value="name" className="text-zinc-900">
                  Name
                </option>
                <option value="phone" className="text-zinc-900">
                  Phone
                </option>
              </select>
              <button
                type="button"
                onClick={() => setListSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-xs font-bold text-white"
              >
                {listSortDir === "asc" ? "Asc" : "Desc"}
              </button>
            </div>
          </div>
          <ul className="max-h-[560px] overflow-y-auto divide-y divide-(--border)/20">
            {customers.length === 0 ? (
              <li className="px-6 py-12 text-center text-sm text-(--foreground)/40">
                No customers yet for this business. They appear after QR check-ins.
              </li>
            ) : customersFiltered.length === 0 ? (
              <li className="px-6 py-12 text-center text-sm text-(--foreground)/40">
                No customers match your filter.
              </li>
            ) : (
              customersFiltered.map((c) => (
                <li key={c.id} className="flex flex-col sm:flex-row sm:items-stretch border-b border-(--border)/20 last:border-0">
                  <button
                    type="button"
                    onClick={() => loadCustomer(c.id)}
                    className={`flex-1 text-left px-6 py-4 transition-colors hover:bg-(--foreground)/5 ${
                      selectedId === c.id ? "bg-(--accent)/10 ring-1 ring-inset ring-(--accent)/20" : ""
                    }`}
                  >
                    <p className="font-bold text-sm">
                      {c.name?.trim() || "No name"}
                    </p>
                    <p className="text-xs text-(--foreground)/50 font-mono mt-0.5">
                      {c.phone}
                    </p>
                    <p className="text-[10px] text-(--foreground)/35 mt-1">
                      Last seen {new Date(c.lastSeen).toLocaleString()}
                    </p>
                  </button>
                  <div className="px-6 pb-4 sm:py-4 sm:pr-6 sm:pl-0 flex items-center shrink-0">
                    <Link
                      href={`/dashboard/customers/${c.id}${dashboardBusinessQuery(mode, businessId)}`}
                      className="text-[10px] font-black uppercase tracking-widest text-(--accent) hover:underline"
                    >
                      Profile
                    </Link>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="xl:col-span-3 space-y-6">
          {!selectedId && (
            <div className="rounded-3xl border border-dashed border-(--border) p-12 text-center text-(--foreground)/40 text-sm">
              Select a customer to load credit balance and ledger history.
            </div>
          )}

          {selectedId && pending && !loyalty && !panelError && (
            <div className="rounded-3xl border border-(--border)/50 p-12 text-center animate-pulse text-sm text-(--foreground)/40">
              Loading loyalty…
            </div>
          )}

          {panelError && (
            <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-600">
              {panelError}
            </div>
          )}

          {loyalty && (
            <>
              <div className="rounded-3xl border border-(--border)/50 bg-(--muted)/20 p-8 shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-(--foreground)/40 mb-4">
                  Balance
                </h3>
                <p className="text-4xl font-extrabold swiss-bold text-(--accent)">
                  {formatNgn(loyalty.balanceKobo)}
                </p>
                <p className="text-sm text-(--foreground)/50 mt-3">
                  Min. to redeem: {formatNgn(loyalty.minRedemptionKobo)} · Credits expire
                  after {loyalty.expiryDays} days per award · Max discount{" "}
                  {loyalty.maxDiscountPct}% of order
                </p>
                <div className="mt-6 pt-6 border-t border-(--border)/30 text-sm">
                  <p className="font-bold">{loyalty.customer.name || "Guest"}</p>
                  <p className="text-(--foreground)/50 font-mono text-xs mt-1">
                    {loyalty.customer.phone}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-(--border)/50 p-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-(--foreground)/40 mb-4">
                  Apply redemption
                </h3>
                <form onSubmit={onRedeem} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Order total (₦)"
                      value={orderValueNgn}
                      onChange={setOrderValueNgn}
                      placeholder="e.g. 8500"
                    />
                    <Field
                      label="Credit to use (₦)"
                      value={amountNgn}
                      onChange={setAmountNgn}
                      placeholder="e.g. 500"
                    />
                  </div>
                  <Field
                    label="Note for staff / audit"
                    value={note}
                    onChange={setNote}
                    placeholder="Table 4 — lunch"
                  />
                  {redeemError && (
                    <p className="text-sm text-red-600">{redeemError}</p>
                  )}
                  {redeemOk && (
                    <p className="text-sm text-emerald-600">{redeemOk}</p>
                  )}
                  <button
                    type="submit"
                    disabled={redeemPending}
                    className="w-full sm:w-auto bg-(--foreground) text-(--background) px-8 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    {redeemPending ? "Applying…" : "Redeem credits"}
                  </button>
                </form>
              </div>

              {loyalty.vouchers.length > 0 && (
                <div className="rounded-3xl border border-(--border)/50 p-8">
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
              )}

              <div className="rounded-3xl border border-(--border)/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 bg-zinc-900 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <DocumentText size={18} variant="Bold" color={ON_DARK} aria-hidden />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/90">
                      Ledger ({ledgerRows.length} shown)
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={ledgerSortKey}
                      onChange={(e) => {
                        const v = e.target.value as "createdAt" | "type" | "amount";
                        setLedgerSortKey(v);
                        setLedgerSortDir(v === "createdAt" ? "desc" : "asc");
                      }}
                      className="rounded-lg bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-bold text-white min-w-[120px]"
                    >
                      <option value="createdAt" className="text-zinc-900">
                        Sort: Date
                      </option>
                      <option value="type" className="text-zinc-900">
                        Sort: Type
                      </option>
                      <option value="amount" className="text-zinc-900">
                        Sort: Amount
                      </option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setLedgerSortDir((d) => (d === "asc" ? "desc" : "asc"))
                      }
                      className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs font-bold text-white"
                    >
                      {ledgerSortDir === "asc" ? "Asc" : "Desc"}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-zinc-900 text-white text-[10px] uppercase tracking-widest">
                        <th className="px-4 py-2">When</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRows.map((h) => (
                        <tr
                          key={h.id}
                          className="border-b border-(--border)/10 hover:bg-(--foreground)/5"
                        >
                          <td className="px-4 py-2 font-mono text-xs text-(--foreground)/60">
                            {new Date(h.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-2">{h.type}</td>
                          <td className="px-4 py-2 text-right font-mono">
                            {formatNgn(h.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-(--foreground)/40">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-(--foreground)/5 border border-(--border)/50 rounded-xl px-4 py-3 text-sm"
      />
    </div>
  );
}
