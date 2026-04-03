import React from "react";
import { getDashboardMode } from "@/lib/repeatos-server";

import { DashboardFrame } from "./dashboard-frame";
import { DashboardProviders } from "./dashboard-providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mode = getDashboardMode();

  return (
    <DashboardProviders>
      <DashboardFrame mode={mode}>{children}</DashboardFrame>
    </DashboardProviders>
  );
}
