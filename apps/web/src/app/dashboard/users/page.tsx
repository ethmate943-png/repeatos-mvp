import { repeatosAdminFetch } from "@/lib/repeatos-server";
import { resolveDashboardBusiness } from "@/lib/dashboard-business";
import { UsersManageClient } from "./users-manage-client";

type StaffRow = { id: string; email: string; createdAt: string };
type CustomerRow = {
  id: string;
  phone: string;
  name?: string;
  firstSeen: string;
  lastSeen: string;
};

export default async function UsersPage({
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
        <h2 className="text-2xl font-extrabold swiss-bold mb-3">API not configured</h2>
        <p className="text-(--foreground)/50 text-sm">
          Add <code>REPEATOS_ADMIN_API_KEY</code> and <code>REPEATOS_API_URL</code> to{" "}
          <code>.env.local</code>.
        </p>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center text-sm text-(--foreground)/50">
        Set <code>DEFAULT_BUSINESS_ID</code> or open this page with{" "}
        <code>?business=…</code> in platform mode.
      </div>
    );
  }

  const [staffRes, custRes] = await Promise.all([
    repeatosAdminFetch(`/admin/users?businessId=${encodeURIComponent(businessId)}`),
    repeatosAdminFetch(`/admin/customers?businessId=${encodeURIComponent(businessId)}`),
  ]);

  const initialStaff: StaffRow[] = staffRes?.ok ? await staffRes.json() : [];
  const initialCustomers: CustomerRow[] = custRes?.ok ? await custRes.json() : [];

  return (
    <UsersManageClient
      mode={mode}
      businesses={businesses}
      businessId={businessId}
      initialStaff={initialStaff}
      initialCustomers={initialCustomers}
    />
  );
}
