import { repeatosAdminFetch } from "@/lib/repeatos-server";
import { resolveDashboardBusiness } from "@/lib/dashboard-business";
import { OrdersBoard, type OrderRow } from "./orders-board";

export default async function OrdersPage({
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
          Set <code>REPEATOS_ADMIN_API_KEY</code> and <code>REPEATOS_API_URL</code> in{" "}
          <code>.env.local</code>.
        </p>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center text-sm text-(--foreground)/50">
        Set <code>DEFAULT_BUSINESS_ID</code> or use <code>?business=</code> in platform mode.
      </div>
    );
  }

  const res = await repeatosAdminFetch(
    `/admin/orders?businessId=${encodeURIComponent(businessId)}`,
  );
  const initialOrders: OrderRow[] = res?.ok ? await res.json() : [];

  return (
    <OrdersBoard
      mode={mode}
      businesses={businesses}
      businessId={businessId}
      initialOrders={initialOrders}
    />
  );
}
