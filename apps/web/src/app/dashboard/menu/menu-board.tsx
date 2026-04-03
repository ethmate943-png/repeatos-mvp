"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MenuBoard as MenuBoardIcon,
  TickCircle,
  CloseCircle,
  Add,
  ArrowDown2,
  SearchNormal1,
} from "iconsax-react";
import type { BusinessRow } from "@/lib/dashboard-business";
import { createMenuItemAction } from "../actions";
import { ON_ACCENT, ON_DARK } from "@/lib/dashboard-palette";
import { toast } from "sonner";

export type MenuItemRow = {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  priceKobo: number;
  category?: string;
  available: boolean;
  sortOrder: number;
  createdAt: string;
};

type SortKey = "sortOrder" | "name" | "price" | "category";

type Props = {
  mode: "platform" | "tenant";
  businesses: BusinessRow[];
  businessId: string;
  items: MenuItemRow[];
};

function formatNgn(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function VenueMenuBoard({ mode, businesses, businessId, items }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("sortOrder");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    description: "",
    priceNgn: "",
    category: "",
    available: true,
    sortOrder: "0",
  });

  function switchBusiness(nextId: string) {
    router.push(`/dashboard/menu?business=${encodeURIComponent(nextId)}`);
  }

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const i of items) {
      if (i.category?.trim()) s.add(i.category.trim());
    }
    return Array.from(s).sort();
  }, [items]);

  const filteredSorted = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let rows = items.filter((item) => {
      if (availableOnly && !item.available) return false;
      if (categoryFilter && (item.category ?? "").trim() !== categoryFilter) return false;
      if (!q) return true;
      const blob = `${item.name} ${item.description ?? ""} ${item.category ?? ""}`.toLowerCase();
      return blob.includes(q);
    });

    const mul = sortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return mul * a.name.localeCompare(b.name);
        case "price":
          return mul * (a.priceKobo - b.priceKobo);
        case "category":
          return mul * (a.category ?? "").localeCompare(b.category ?? "");
        case "sortOrder":
        default:
          return mul * (a.sortOrder - b.sortOrder);
      }
    });
    return rows;
  }, [items, filter, categoryFilter, availableOnly, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "category" ? "asc" : "asc");
    }
  }

  function submitMenuItem(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const price = Number(form.priceNgn);
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setFormError("Enter a valid price in ₦.");
      return;
    }
    const sortOrder = Math.round(Number(form.sortOrder));
    if (!Number.isFinite(sortOrder)) {
      setFormError("Sort order must be a number.");
      return;
    }

    const priceKobo = Math.round(price * 100);
    startTransition(async () => {
      const res = await createMenuItemAction({
        businessId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priceKobo,
        category: form.category.trim() || undefined,
        available: form.available,
        sortOrder,
      });
      if (!res.ok) {
        const msg = res.message ?? "Failed to add item.";
        setFormError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Menu item added.");
      setModalOpen(false);
      setForm({
        name: "",
        description: "",
        priceNgn: "",
        category: "",
        available: true,
        sortOrder: "0",
      });
      router.refresh();
    });
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[var(--color-accent)]/25 bg-[var(--color-accent)]"
            aria-hidden
          >
            <MenuBoardIcon size={28} variant="Bold" color={ON_ACCENT} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--foreground)/40 mb-1">
              Hosted menu
            </p>
            <h2 className="text-4xl font-extrabold tracking-tight swiss-bold">Menu</h2>
            <p className="text-(--foreground)/50 text-sm mt-1">
              Filter and sort items, add new dishes for Mode A hosted pages.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
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
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-zinc-900 bg-white shadow-lg shadow-white/10 hover:opacity-95 active:scale-[0.98]"
          >
            <Add size={22} variant="Bold" color={ON_ACCENT} aria-hidden />
            Add item
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-wrap gap-3 mb-6">
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
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search name, description, category…"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-(--foreground)/5 border border-(--border)/50 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl bg-(--foreground)/5 border border-(--border)/50 px-4 py-3 text-sm font-medium min-w-[160px]"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-sm font-medium px-2">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="rounded border-(--border)"
          />
          Available only
        </label>
        <p className="text-xs text-(--foreground)/45 self-center lg:ml-auto">
          Showing {filteredSorted.length} of {items.length}
        </p>
      </div>

      <div className="rounded-3xl border border-(--border)/50 overflow-hidden bg-(--muted)/20 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-zinc-900 text-white text-[10px] uppercase tracking-widest">
                <th className="px-4 py-3">
                  <SortTh
                    label="Item"
                    active={sortKey === "name"}
                    dir={sortDir}
                    onClick={() => toggleSort("name")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortTh
                    label="Category"
                    active={sortKey === "category"}
                    dir={sortDir}
                    onClick={() => toggleSort("category")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortTh
                    label="Price"
                    active={sortKey === "price"}
                    dir={sortDir}
                    onClick={() => toggleSort("price")}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortTh
                    label="Order"
                    active={sortKey === "sortOrder"}
                    dir={sortDir}
                    onClick={() => toggleSort("sortOrder")}
                  />
                </th>
                <th className="px-4 py-3">Available</th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-(--foreground)/45">
                    {items.length === 0
                      ? "No menu items yet. Add your first item above."
                      : "No items match your filters."}
                  </td>
                </tr>
              ) : (
                filteredSorted.map((item) => (
                  <tr key={item.id} className="border-b border-(--border)/15 hover:bg-(--foreground)/5">
                    <td className="px-6 py-4">
                      <p className="font-bold">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-(--foreground)/45 mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-(--foreground)/55">{item.category ?? "—"}</td>
                    <td className="px-6 py-4 font-mono font-semibold">
                      {formatNgn(item.priceKobo)}
                    </td>
                    <td className="px-6 py-4 font-mono text-(--foreground)/55">{item.sortOrder}</td>
                    <td className="px-6 py-4">
                      {item.available ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
                          <TickCircle size={18} variant="Bold" aria-hidden /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-(--foreground)/40 text-xs font-bold">
                          <CloseCircle size={18} variant="Linear" aria-hidden /> No
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-(--background) border border-(--border) w-full max-w-md rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-extrabold swiss-bold mb-6">Add menu item</h3>
            <form onSubmit={submitMenuItem} className="space-y-4">
              {formError && (
                <p className="text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}
              <Field label="Name" required>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-(--foreground)/5 border border-(--border)/50 rounded-xl px-4 py-3 text-sm"
                  required
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full bg-(--foreground)/5 border border-(--border)/50 rounded-xl px-4 py-3 text-sm resize-y"
                />
              </Field>
              <Field label="Price (₦)" required>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.priceNgn}
                  onChange={(e) => setForm({ ...form, priceNgn: e.target.value })}
                  placeholder="e.g. 2500"
                  className="w-full bg-(--foreground)/5 border border-(--border)/50 rounded-xl px-4 py-3 text-sm font-mono"
                  required
                />
              </Field>
              <Field label="Category">
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Drinks"
                  className="w-full bg-(--foreground)/5 border border-(--border)/50 rounded-xl px-4 py-3 text-sm"
                />
              </Field>
              <Field label="Sort order">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  className="w-full bg-(--foreground)/5 border border-(--border)/50 rounded-xl px-4 py-3 text-sm font-mono"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) => setForm({ ...form, available: e.target.checked })}
                />
                Available on menu
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-(--border) rounded-xl font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-zinc-900 bg-white disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Save item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-(--foreground)/40">
        {label}
        {required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}
