"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        richColors
        theme="dark"
        position="top-center"
        toastOptions={{
          classNames: {
            toast: "border border-white/10 bg-zinc-900 text-white",
          },
        }}
      />
    </>
  );
}
