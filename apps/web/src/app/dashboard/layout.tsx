import React from "react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-(--background) text-(--foreground)">
      {/* Sidebar */}
      <aside className="w-64 border-r border-(--border) flex flex-col p-6 sticky top-0 h-screen bg-black/5 backdrop-blur-xl">
        <div className="mb-12">
          <h1 className="text-xl font-extrabold tracking-tighter swiss-bold text-(--foreground)">
            Repeat<span className="text-(--accent)">OS</span>
          </h1>
          <p className="text-[10px] text-(--foreground)/40 font-medium tracking-widest uppercase mt-1">
            Admin Dashboard
          </p>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem href="/dashboard" label="Overview" icon="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
          <NavItem href="/dashboard/orders" label="Orders" icon="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z M3 6h18 M16 10a4 4 0 0 1-8 0" />
          <NavItem href="/dashboard/users" label="Users" icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />
          <NavItem href="/dashboard/menu" label="Menu" icon="M3 12h18M3 6h18M3 18h18" />
          <NavItem href="/dashboard/settings" label="Settings" icon="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        </nav>

        <div className="mt-auto pt-6 border-t border-(--border)">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-8 h-8 rounded-full bg-(--accent) flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-(--accent)/20">
              BC
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate">Bliss Cafe</p>
              <p className="text-[10px] text-(--foreground)/50 truncate">Premium Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

function NavItem({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-(--foreground)/5 group active:scale-[0.98]"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-(--foreground)/50 group-hover:text-(--foreground) transition-colors"
      >
        <path d={icon} />
      </svg>
      <span className="text-(--foreground)/60 group-hover:text-(--foreground) transition-colors">{label}</span>
    </Link>
  );
}
