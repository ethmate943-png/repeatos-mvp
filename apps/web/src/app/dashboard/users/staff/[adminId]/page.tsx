import Link from "next/link";
import { notFound } from "next/navigation";
import { People, Setting2 } from "iconsax-react";
import { repeatosAdminFetch, getDashboardMode, getDefaultBusinessId } from "@/lib/repeatos-server";
import { resolveDashboardBusiness } from "@/lib/dashboard-business";
import { dashboardBusinessQuery } from "@/lib/dashboard-nav";

type StaffDetail = {
  id: string;
  email: string;
  createdAt: string;
};

export default async function StaffDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminId: string }>;
  searchParams: Promise<{ business?: string }>;
}) {
  const { adminId } = await params;
  const sp = await searchParams;
  const { configured, businessId, businesses, mode } = await resolveDashboardBusiness(
    sp.business,
  );

  if (!configured || !businessId) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-extrabold swiss-bold mb-3">Dashboard not wired</h2>
        <p className="text-(--foreground)/50 text-sm">
          Configure the API key and select a business.
        </p>
      </div>
    );
  }

  const tenantMode = getDashboardMode() === "tenant";
  const defaultBid = getDefaultBusinessId();
  if (tenantMode && defaultBid && businessId !== defaultBid) {
    notFound();
  }

  const res = await repeatosAdminFetch(
    `/admin/users/${encodeURIComponent(adminId)}?businessId=${encodeURIComponent(businessId)}`,
  );
  if (!res?.ok) {
    notFound();
  }

  const staff = (await res.json()) as StaffDetail;
  const q = dashboardBusinessQuery(mode, businessId);
  const businessLabel = businesses.find((b) => b.id === businessId)?.name ?? "Business";

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-start gap-4 mb-10">
        <div className="w-14 h-14 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-600 font-bold text-xl ring-1 ring-blue-500/25 shrink-0">
          {staff.email[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--foreground)/40 mb-1">
            Staff · {businessLabel}
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight swiss-bold break-all">
            {staff.email}
          </h2>
          <p className="text-sm text-(--foreground)/50 mt-2 font-mono">
            Added {new Date(staff.createdAt).toLocaleString()}
          </p>
          <div className="flex flex-wrap gap-3 mt-5 text-sm">
            <Link
              href={`/dashboard/users${q}`}
              className="inline-flex items-center gap-2 text-(--accent) font-semibold underline"
            >
              <People size={18} variant="Bold" aria-hidden />
              All users
            </Link>
            <Link
              href={`/dashboard/settings${q}`}
              className="inline-flex items-center gap-2 text-(--accent) font-semibold underline"
            >
              <Setting2 size={18} variant="Bold" aria-hidden />
              Settings
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-(--border)/50 bg-(--muted)/20 p-6 text-sm text-(--foreground)/60">
        <p>
          Dashboard login accounts are managed here. Password hashes are never exposed through the
          admin API.
        </p>
        <p className="text-xs font-mono text-(--foreground)/35 mt-4">Admin ID {staff.id}</p>
      </div>
    </div>
  );
}
