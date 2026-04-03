import "server-only";

import { getDashboardMode, getDefaultBusinessId, repeatosAdminFetch } from "./repeatos-server";

export type BusinessRow = { id: string; name: string; slug: string };

export async function resolveDashboardBusiness(
  businessQuery?: string | null,
): Promise<{
  configured: boolean;
  businessId: string | null;
  businesses: BusinessRow[];
  mode: "platform" | "tenant";
}> {
  const configured = Boolean(process.env.REPEATOS_ADMIN_API_KEY);
  const mode = getDashboardMode();
  if (!configured) {
    return { configured: false, businessId: null, businesses: [], mode };
  }

  let businesses: BusinessRow[] = [];
  if (mode === "platform") {
    const res = await repeatosAdminFetch("/admin/businesses");
    if (res?.ok) {
      businesses = (await res.json()) as BusinessRow[];
    }
  }

  const defaultId = getDefaultBusinessId();
  const businessId =
    (businessQuery?.trim() || undefined) ||
    (mode === "tenant" ? defaultId : undefined) ||
    businesses[0]?.id ||
    defaultId ||
    null;

  return { configured, businessId, businesses, mode };
}
