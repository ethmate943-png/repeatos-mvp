"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { People, UserAdd, ArrowDown2, SearchNormal1 } from "iconsax-react";
import { dashboardBusinessQuery } from "@/lib/dashboard-nav";
import { createCustomerAction, createStaffAction } from "../actions";
import { ON_ACCENT, ON_DARK } from "@/lib/dashboard-palette";
import { toast } from "sonner";

type Staff = {
  id: string;
  email: string;
  createdAt: string;
};

export type Customer = {
  id: string;
  phone: string;
  name?: string;
  firstSeen: string;
  lastSeen: string;
};

export type BusinessOption = { id: string; name: string; slug: string };

type Props = {
  mode: "platform" | "tenant";
  businesses: BusinessOption[];
  businessId: string;
  initialStaff: Staff[];
  initialCustomers: Customer[];
};

export function UsersManageClient({
  mode,
  businesses,
  businessId,
  initialStaff,
  initialCustomers,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"staff" | "customers">("staff");
  const [staff, setStaff] = useState(initialStaff);
  const [customers, setCustomers] = useState(initialCustomers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formType, setFormType] = useState<"staff" | "customer">("staff");
  const [formData, setFormData] = useState({ email: "", password: "", phone: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [staffSort, setStaffSort] = useState<"email" | "createdAt">("email");
  const [customerSort, setCustomerSort] = useState<"phone" | "name" | "lastSeen">("lastSeen");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const openModal = () => {
    setFormError(null);
    setFormType(activeTab === "staff" ? "staff" : "customer");
    setIsModalOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      if (formType === "staff") {
        const res = await createStaffAction({
          businessId,
          email: formData.email,
          password: formData.password,
        });
        if (!res.ok) {
          const msg = res.message ?? "Failed to create staff.";
          setFormError(msg);
          toast.error(msg);
          return;
        }
        toast.success("Staff member added.");
      } else {
        const res = await createCustomerAction({
          businessId,
          phone: formData.phone,
        });
        if (!res.ok) {
          const msg = res.message ?? "Failed to create customer.";
          setFormError(msg);
          toast.error(msg);
          return;
        }
        toast.success("Customer record added.");
      }
      setIsModalOpen(false);
      setFormData({ email: "", password: "", phone: "" });
      router.refresh();
    });
  };

  React.useEffect(() => {
    setStaff(initialStaff);
    setCustomers(initialCustomers);
  }, [initialStaff, initialCustomers]);

  function switchBusiness(nextId: string) {
    router.push(`/dashboard/users?business=${encodeURIComponent(nextId)}`);
  }

  const staffFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = !q
      ? staff
      : staff.filter((s) => s.email.toLowerCase().includes(q));
    const mul = sortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      if (staffSort === "createdAt") {
        return (
          mul *
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        );
      }
      return mul * a.email.localeCompare(b.email);
    });
    return rows;
  }, [staff, search, staffSort, sortDir]);

  const customersFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = !q
      ? customers
      : customers.filter(
          (c) =>
            c.phone.toLowerCase().includes(q) ||
            (c.name ?? "").toLowerCase().includes(q),
        );
    const mul = sortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      if (customerSort === "phone") return mul * a.phone.localeCompare(b.phone);
      if (customerSort === "name")
        return mul * (a.name ?? "").localeCompare(b.name ?? "");
      return (
        mul *
        (new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime())
      );
    });
    return rows;
  }, [customers, search, customerSort, sortDir]);

  function toggleStaffSort(key: "email" | "createdAt") {
    if (staffSort === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setStaffSort(key);
      setSortDir(key === "email" ? "asc" : "desc");
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[var(--color-accent)]/25 bg-[var(--color-accent)]">
            <People size={28} variant="Bold" color={ON_ACCENT} aria-hidden />
          </div>
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight swiss-bold mb-2">
              User Management
            </h2>
            <p className="text-(--foreground)/50 text-sm font-medium">
              Staff logins and customer records for this business.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 lg:min-w-[240px]">
          {mode === "platform" && businesses.length > 0 ? (
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-(--foreground)/40">
                Business
              </label>
              <select
                value={businessId}
                onChange={(e) => switchBusiness(e.target.value)}
                className="bg-(--foreground)/5 border border-(--border)/50 rounded-xl px-4 py-3 text-sm font-medium"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center justify-center gap-2 bg-white text-zinc-900 px-6 py-3 rounded-xl font-bold text-sm tracking-tight hover:scale-105 transition-transform shadow-xl shadow-white/10 active:scale-95"
          >
            <UserAdd size={20} variant="Bold" color={ON_ACCENT} aria-hidden />
            {activeTab === "staff" ? "Add Staff" : "Add Customer"}
          </button>
        </div>
      </div>

      <div className="flex gap-8 border-b border-(--border) mb-8">
        <TabButton active={activeTab === "staff"} onClick={() => setActiveTab("staff")}>
          Staff Members <span className="ml-2 text-[10px] opacity-40">{staff.length}</span>
        </TabButton>
        <TabButton
          active={activeTab === "customers"}
          onClick={() => setActiveTab("customers")}
        >
          Customers <span className="ml-2 text-[10px] opacity-40">{customers.length}</span>
        </TabButton>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 max-w-3xl">
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
            placeholder={
              activeTab === "staff" ? "Filter staff by email…" : "Filter by phone or name…"
            }
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-(--foreground)/5 border border-(--border)/50 text-sm"
          />
        </div>
        {activeTab === "customers" ? (
          <select
            value={customerSort}
            onChange={(e) => {
              setCustomerSort(e.target.value as "phone" | "name" | "lastSeen");
              setSortDir(e.target.value === "lastSeen" ? "desc" : "asc");
            }}
            className="rounded-xl bg-(--foreground)/5 border border-(--border)/50 px-4 py-3 text-sm font-medium min-w-[160px]"
          >
            <option value="lastSeen">Sort by last seen</option>
            <option value="phone">Sort by phone</option>
            <option value="name">Sort by name</option>
          </select>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-3xl border border-(--border)/50 bg-(--muted)/30 shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-zinc-900 text-white text-[10px] uppercase tracking-widest">
              <th className="px-6 py-4">
                {activeTab === "staff" ? (
                  <SortTh
                    label="Identifier"
                    active={staffSort === "email"}
                    dir={sortDir}
                    onClick={() => toggleStaffSort("email")}
                  />
                ) : (
                  <span className="font-black text-white/80">Customer</span>
                )}
              </th>
              <th className="px-6 py-4">
                {activeTab === "staff" ? (
                  <SortTh
                    label="Joined"
                    active={staffSort === "createdAt"}
                    dir={sortDir}
                    onClick={() => toggleStaffSort("createdAt")}
                  />
                ) : (
                  <span className="font-black text-white/80">Last seen</span>
                )}
              </th>
              <th className="px-6 py-4 text-right text-white/80 font-black">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeTab === "staff"
              ? staffFiltered.length === 0
                ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-sm text-(--foreground)/45">
                        {staff.length === 0
                          ? "No staff yet."
                          : "No staff match your filter."}
                      </td>
                    </tr>
                  )
                : staffFiltered.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-(--border)/10 hover:bg-(--foreground)/2 transition-colors"
                  >
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs ring-1 ring-blue-500/20">
                          {s.email[0].toUpperCase()}
                        </div>
                        <Link
                          href={`/dashboard/users/staff/${s.id}${dashboardBusinessQuery(mode, businessId)}`}
                          className="font-bold text-sm tracking-tight text-(--foreground) hover:text-(--accent) hover:underline"
                        >
                          {s.email}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-xs text-(--foreground)/50 font-mono">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-6 text-right">
                      <Link
                        href={`/dashboard/users/staff/${s.id}${dashboardBusinessQuery(mode, businessId)}`}
                        className="text-[10px] font-bold uppercase tracking-widest text-(--accent)"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              : customersFiltered.length === 0
                ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-sm text-(--foreground)/45">
                        {customers.length === 0
                          ? "No customers yet."
                          : "No customers match your filter."}
                      </td>
                    </tr>
                  )
                : customersFiltered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-(--border)/10 hover:bg-(--foreground)/2 transition-colors"
                  >
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs ring-1 ring-emerald-500/20">
                          {(c.name?.[0] ?? "#").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{c.phone}</p>
                          {c.name && (
                            <p className="text-xs text-(--foreground)/50">{c.name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-xs text-(--foreground)/50 font-mono">
                      Last {new Date(c.lastSeen).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-6 text-right space-x-3">
                      <Link
                        href={`/dashboard/customers/${c.id}${dashboardBusinessQuery(mode, businessId)}`}
                        className="text-[10px] font-bold uppercase tracking-widest text-(--foreground)/50 hover:text-(--accent)"
                      >
                        Profile
                      </Link>
                      <Link
                        href={`/dashboard/customers${dashboardBusinessQuery(mode, businessId)}`}
                        className="text-[10px] font-bold uppercase tracking-widest text-(--accent)"
                      >
                        Credits
                      </Link>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-(--background) border border-(--border) w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-extrabold tracking-tight swiss-bold mb-6">
              Add {formType === "staff" ? "Staff Member" : "Customer"}
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              {formError && (
                <p className="text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}
              {formType === "staff" ? (
                <>
                  <Input
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(v) => setFormData({ ...formData, email: v })}
                  />
                  <Input
                    label="Temporary Password"
                    type="password"
                    value={formData.password}
                    onChange={(v) => setFormData({ ...formData, password: v })}
                  />
                </>
              ) : (
                <Input
                  label="Phone Number"
                  type="tel"
                  value={formData.phone}
                  onChange={(v) => setFormData({ ...formData, phone: v })}
                />
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-(--border) rounded-xl font-bold text-sm hover:bg-(--foreground)/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 px-6 py-3 bg-(--foreground) text-(--background) rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {pending ? "Saving…" : "Submit"}
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

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pb-4 px-2 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-2 ${
        active
          ? "border-(--accent) text-(--foreground)"
          : "border-transparent text-(--foreground)/30 hover:text-(--foreground)/50"
      }`}
    >
      {children}
    </button>
  );
}

function Input({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-(--foreground)/40 ml-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-(--foreground)/5 border border-(--border)/50 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-(--accent)/30 transition-shadow"
        required
      />
    </div>
  );
}
