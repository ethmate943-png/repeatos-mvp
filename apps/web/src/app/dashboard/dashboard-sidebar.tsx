"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home2,
  Wallet3,
  ShoppingBag,
  People,
  MenuBoard,
  Setting2,
  Building,
  CloseSquare,
} from "iconsax-react";

import { ON_ACCENT, ON_DARK } from "@/lib/dashboard-palette";

const nav = [
  { href: "/dashboard", label: "Overview", Icon: Home2, prefix: "/dashboard" as const },
  { href: "/dashboard/business", label: "Business", Icon: Building, prefix: "/dashboard/business" },
  { href: "/dashboard/customers", label: "Credits", Icon: Wallet3, prefix: "/dashboard/customers" },
  { href: "/dashboard/orders", label: "Orders", Icon: ShoppingBag, prefix: "/dashboard/orders" },
  { href: "/dashboard/users", label: "Users", Icon: People, prefix: "/dashboard/users" },
  { href: "/dashboard/menu", label: "Menu", Icon: MenuBoard, prefix: "/dashboard/menu" },
  { href: "/dashboard/settings", label: "Settings", Icon: Setting2, prefix: "/dashboard/settings" },
];

function isActive(pathname: string, prefix: string): boolean {
  if (prefix === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/";
  }
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function DashboardSidebar({
  mode,
  onNavigate,
  onCloseMobile,
}: {
  mode: "platform" | "tenant";
  onNavigate?: () => void;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const modeLabel = mode === "platform" ? "Platform" : "Venue";

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-y-auto border-r border-white/10 bg-zinc-950 p-5 text-zinc-100 sm:p-6 lg:sticky lg:top-0 lg:h-screen">
      <div className="mb-8 flex items-start justify-between gap-2 lg:mb-10">
        <Link href="/dashboard" className="group block min-w-0" onClick={() => onNavigate?.()}>
          <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tighter text-white swiss-bold">
            <Home2 size={22} variant="Bold" color={ON_DARK} className="shrink-0" aria-hidden />
            Repeat<span className="text-white">OS</span>
          </h1>
          <p className="mt-1 pl-0.5 text-[10px] font-medium tracking-widest text-zinc-500 uppercase">
            Admin · {modeLabel}
          </p>
        </Link>
        {onCloseMobile ? (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
            onClick={onCloseMobile}
          >
            <CloseSquare size={22} variant="Linear" color="currentColor" aria-hidden />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-0.5">
        {nav.map(({ href, label, Icon, prefix }) => {
          const active = isActive(pathname, prefix);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onNavigate?.()}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${
                active
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon
                size={20}
                variant={active ? "Bold" : "Linear"}
                color={ON_DARK}
                className={`shrink-0 ${active ? "opacity-100" : "opacity-70"}`}
                aria-hidden
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-3 rounded-xl bg-white/5">
          <div className="w-9 h-9 rounded-full bg-[var(--color-accent)] flex items-center justify-center shrink-0">
            <Building size={20} variant="Bold" color={ON_ACCENT} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-xs font-bold text-white">{modeLabel}</p>
            <p className="truncate text-[10px] text-zinc-500">
              {mode === "platform" ? "All businesses" : "Single venue"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
