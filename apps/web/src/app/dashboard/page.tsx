import { repeatosAdminFetch } from "@/lib/repeatos-server";
import { resolveDashboardBusiness } from "@/lib/dashboard-business";
import {
  OverviewDashboardClient,
  type AnalyticsDashboardPayload,
} from "./overview-dashboard-client";

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  const sp = await searchParams;
  const { configured, businessId, mode } = await resolveDashboardBusiness(sp.business);

  let dashboard: AnalyticsDashboardPayload | null = null;
  if (configured && businessId) {
    const res = await repeatosAdminFetch(
      `/admin/analytics/dashboard?businessId=${encodeURIComponent(businessId)}`,
    );
    if (res?.ok) {
      dashboard = (await res.json()) as AnalyticsDashboardPayload;
    }
  }

  const navQuery = businessId ? `?business=${encodeURIComponent(businessId)}` : "";

  return (
    <OverviewDashboardClient
      data={dashboard}
      configured={configured}
      businessId={businessId}
      mode={mode}
      navQuery={navQuery}
    />
  );
}
