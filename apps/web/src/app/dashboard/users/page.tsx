"use client";

import React, { useState, useEffect } from "react";

type Staff = {
  id: string;
  email: string;
  createdAt: string;
};

type Customer = {
  id: string;
  phone: string;
  lastSeen: string;
};

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<"staff" | "customers">("staff");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formType, setFormType] = useState<"staff" | "customer">("staff");
  const [formData, setFormData] = useState({ email: "", password: "", phone: "" });

  const businessId = "demo-business-id"; // In real app, derived from auth/context
  const apiKey = "dev-admin-key"; // From env
  const apiBase = "http://localhost:4000";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, custRes] = await Promise.all([
        fetch(`${apiBase}/admin/users?businessId=${businessId}`, { headers: { "x-admin-api-key": apiKey } }),
        fetch(`${apiBase}/admin/customers?businessId=${businessId}`, { headers: { "x-admin-api-key": apiKey } }),
      ]);
      if (staffRes.ok) setStaff(await staffRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = formType === "staff" ? "/admin/users" : "/admin/customers";
    const body = formType === "staff" 
      ? { businessId, email: formData.email, password: formData.password }
      : { businessId, phone: formData.phone };

    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-api-key": apiKey 
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ email: "", password: "", phone: "" });
        fetchData();
      }
    } catch (err) {
      console.error("Create failed", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight swiss-bold mb-2">
            User Management
          </h2>
          <p className="text-(--foreground)/50 text-sm font-medium">
            Manage your staff roles and view customer loyalty profiles.
          </p>
        </div>
        <button 
          onClick={() => { setFormType(activeTab === "staff" ? "staff" : "customer"); setIsModalOpen(true); }}
          className="bg-(--accent) text-white px-6 py-3 rounded-xl font-bold text-sm tracking-tight hover:scale-105 transition-transform shadow-xl shadow-(--accent)/20 active:scale-95"
        >
          {activeTab === "staff" ? "+ Add Staff" : "+ Add Customer"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-(--border) mb-8">
        <TabButton active={activeTab === "staff"} onClick={() => setActiveTab("staff")}>
          Staff Members <span className="ml-2 text-[10px] opacity-40">{staff.length}</span>
        </TabButton>
        <TabButton active={activeTab === "customers"} onClick={() => setActiveTab("customers")}>
          Customers <span className="ml-2 text-[10px] opacity-40">{customers.length}</span>
        </TabButton>
      </div>

      {/* Content */}
      <div className="bg-(--muted)/30 backdrop-blur-md border border-(--border)/50 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-20 flex justify-center text-(--foreground)/30 animate-pulse font-mono text-sm tracking-widest">
            SYNCHRONIZING_DATA...
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-(--border)/30 bg-(--foreground)/5">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-(--foreground)/40">Identifier</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-(--foreground)/40">Joined / Last Seen</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-(--foreground)/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === "staff" ? (
                staff.map((s) => (
                  <tr key={s.id} className="border-b border-(--border)/10 hover:bg-(--foreground)/2 transition-colors group">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs ring-1 ring-blue-500/20">
                          {s.email[0].toUpperCase()}
                        </div>
                        <span className="font-bold text-sm tracking-tight">{s.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-xs text-(--foreground)/50 font-mono">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-6 text-right">
                      <button className="text-[10px] font-bold uppercase tracking-widest text-(--foreground)/20 hover:text-(--accent) transition-colors">Revoke</button>
                    </td>
                  </tr>
                ))
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="border-b border-(--border)/10 hover:bg-(--foreground)/2 transition-colors group">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs ring-1 ring-emerald-500/20">
                          #
                        </div>
                        <span className="font-bold text-sm tracking-tight">{c.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-xs text-(--foreground)/50 font-mono">
                      {new Date(c.lastSeen).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-6 text-right">
                      <button className="text-[10px] font-bold uppercase tracking-widest text-(--foreground)/20 hover:text-(--foreground) transition-colors">Details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) }
      </div>

      {/* Modal Placeholder */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-(--background) border border-(--border) w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-extrabold tracking-tight swiss-bold mb-6">
              Add {formType === "staff" ? "Staff Member" : "Customer"}
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              {formType === "staff" ? (
                <>
                  <Input label="Email Address" type="email" value={formData.email} onChange={v => setFormData({...formData, email: v})} />
                  <Input label="Temporary Password" type="password" value={formData.password} onChange={v => setFormData({...formData, password: v})} />
                </>
              ) : (
                <Input label="Phone Number" type="tel" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-(--border) rounded-xl font-bold text-sm hover:bg-(--foreground)/5 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-(--foreground) text-(--background) rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`pb-4 px-2 text-xs font-black uppercase tracking-[0.2em] transition-all border-b-2 ${active ? 'border-(--accent) text-(--foreground)' : 'border-transparent text-(--foreground)/30 hover:text-(--foreground)/50'}`}
    >
      {children}
    </button>
  );
}

function Input({ label, type, value, onChange }: { label: string, type: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-(--foreground)/40 ml-1">{label}</label>
      <input 
        type={type} 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-(--foreground)/5 border border-(--border)/50 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-(--accent)/30 transition-shadow"
        required
      />
    </div>
  );
}
