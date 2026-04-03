import { repeatosAdminFetch } from "@/lib/repeatos-server";
import { resolveDashboardBusiness } from "@/lib/dashboard-business";
import { LoyaltyDashboardClient, type CustomerRow } from "./loyalty-client";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  const sp = await searchParams;
  const { configured, businessId, businesses, mode } = await resolveDashboardBusiness(
    sp.business,
  );

  if (!configured) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-extrabold swiss-bold mb-3">Dashboard not wired</h2>
        <p className="text-(--foreground)/50 text-sm leading-relaxed">
          Set <code className="text-xs bg-(--muted) px-1 py-0.5 rounded">REPEATOS_API_URL</code>{" "}
          and{" "}
          <code className="text-xs bg-(--muted) px-1 py-0.5 rounded">
            REPEATOS_ADMIN_API_KEY
          </code>{" "}
          in <code className="text-xs">apps/web/.env.local</code> (server-side only). Restart
          Next.js after changing env.
        </p>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-extrabold swiss-bold mb-3">No business selected</h2>
        <p className="text-(--foreground)/50 text-sm">
          For client dashboards set{" "}
          <code className="text-xs bg-(--muted) px-1 py-0.5 rounded">DEFAULT_BUSINESS_ID</code>
          . For platform mode ensure businesses exist in the database.
        </p>
      </div>
    );
  }

  const custRes = await repeatosAdminFetch(
    `/admin/customers?businessId=${encodeURIComponent(businessId)}`,
  );
  const customers: CustomerRow[] = custRes?.ok
    ? ((await custRes.json()) as CustomerRow[])
    : [];

  const businessLabel =
    businesses.find((b) => b.id === businessId)?.name ?? "Selected business";

  return (
    <LoyaltyDashboardClient
      mode={mode}
      businesses={businesses}
      businessId={businessId}
      businessLabel={businessLabel}
      customers={customers}
    />
  );
}
