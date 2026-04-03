import { redirect } from "next/navigation";
import { resolveDashboardBusiness } from "@/lib/dashboard-business";
import { dashboardBusinessQuery } from "@/lib/dashboard-nav";

export default async function BusinessIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  const sp = await searchParams;
  const { configured, businessId, mode } = await resolveDashboardBusiness(sp.business);

  if (!configured || !businessId) {
    redirect("/dashboard/settings");
  }

  redirect(`/dashboard/business/${businessId}${dashboardBusinessQuery(mode, businessId)}`);
}
