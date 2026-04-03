"use client";

import { type ReactNode, useEffect, useState } from "react";
import { HambergerMenu, CloseSquare } from "iconsax-react";

import { ON_DARK } from "@/lib/dashboard-palette";

import { DashboardSidebar } from "./dashboard-sidebar";

export function DashboardFrame({
  mode,
  children,
}: {
  mode: "platform" | "tenant";
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-[#070707] text-zinc-100 lg:flex-row">
      <header className="sticky top-0 z-30 flex min-h-[3.25rem] items-center gap-3 border-b border-white/10 bg-zinc-950/95 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-100 transition-colors hover:bg-white/10 active:scale-[0.98]"
          aria-expanded={navOpen}
          aria-controls="dashboard-nav"
          aria-label={navOpen ? "Close menu" : "Open menu"}
          onClick={() => setNavOpen((o) => !o)}
        >
          {navOpen ? (
            <CloseSquare size={24} variant="Bold" color={ON_DARK} aria-hidden />
          ) : (
            <HambergerMenu size={24} variant="Bold" color={ON_DARK} aria-hidden />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold tracking-tight swiss-bold text-white">
            RepeatOS
          </p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            {mode === "platform" ? "Platform" : "Venue"} dashboard
          </p>
        </div>
      </header>

      {navOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div
        id="dashboard-nav"
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[min(16rem,88vw)] transition-transform duration-200 ease-out lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:shrink-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <DashboardSidebar
          mode={mode}
          onNavigate={() => setNavOpen(false)}
          onCloseMobile={() => setNavOpen(false)}
        />
      </div>

      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto border-white/10 p-4 sm:p-6 lg:border-l lg:p-10">
        {children}
      </main>
    </div>
  );
}
