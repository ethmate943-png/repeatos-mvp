import React from "react";
import Link from "next/link";
import {
  Setting2,
  Lock1,
  Global,
  MessageQuestion,
  Code1,
} from "iconsax-react";
import { resolveDashboardBusiness } from "@/lib/dashboard-business";
import { dashboardBusinessQuery } from "@/lib/dashboard-nav";
import { getRepeatosConfig } from "@/lib/repeatos-server";

import { ON_ACCENT } from "@/lib/dashboard-palette";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  const sp = await searchParams;
  const { configured, businessId, businesses, mode } = await resolveDashboardBusiness(
    sp.business,
  );
  const { base } = getRepeatosConfig();
  const venue = businesses.find((b) => b.id === businessId);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-start gap-4 mb-10">
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/25 flex items-center justify-center shrink-0">
          <Setting2 size={28} variant="Bold" color={ON_ACCENT} aria-hidden />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-(--foreground)/40 mb-1">
            Workspace
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight swiss-bold">Settings</h2>
          <p className="text-(--foreground)/50 text-sm mt-1">
            Environment and integration hints. Sensitive keys stay on the server.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <SettingCard
          icon={<Global size={22} variant="Bold" color="#52525b" aria-hidden />}
          title="API connection"
          body={
            <>
              <p className="text-sm text-(--foreground)/60 mb-2">
                Next.js calls{" "}
                <code className="text-xs bg-(--foreground)/10 px-1.5 py-0.5 rounded">
                  {base || "—"}
                </code>{" "}
                using{" "}
                <code className="text-xs bg-(--foreground)/10 px-1.5 py-0.5 rounded">
                  REPEATOS_ADMIN_API_KEY
                </code>{" "}
                (server-only).
              </p>
              <p className="text-xs text-(--foreground)/45">
                Configured:{" "}
                <strong className={configured ? "text-emerald-600" : "text-red-500"}>
                  {configured ? "Yes" : "No"}
                </strong>
              </p>
            </>
          }
        />

        <SettingCard
          icon={<Lock1 size={22} variant="Bold" className="text-(--accent)" aria-hidden />}
          title="Dashboard mode"
          body={
            <div className="space-y-3 text-sm text-(--foreground)/60">
              <p>
                Current:{" "}
                <code className="rounded bg-(--foreground)/10 px-1.5 py-0.5 text-xs">
                  DASHBOARD_MODE={mode}
                </code>
                {businessId ? (
                  <>
                    {" "}
                    ·{" "}
                    <code className="rounded bg-(--foreground)/10 px-1.5 py-0.5 text-xs">
                      {venue?.name ?? businessId.slice(0, 8) + "…"}
                    </code>
                  </>
                ) : null}
              </p>
              <div className="rounded-xl border border-(--border)/40 bg-(--foreground)/5 p-4 text-xs leading-relaxed text-(--foreground)/55">
                <p className="mb-2 font-semibold uppercase tracking-wide text-(--foreground)/70">
                  Showcase platform vs venue separately
                </p>
                <p className="mb-2">
                  The UI is the same route (<code className="text-[11px]">/dashboard</code>); mode is
                  controlled by env. Use two local env files or two deployments so each demo has the
                  right story.
                </p>
                <ul className="list-inside list-disc space-y-1.5">
                  <li>
                    <strong className="text-(--foreground)/70">Platform (all businesses):</strong> set{" "}
                    <code className="text-[11px]">DASHBOARD_MODE=platform</code>. Omit or relax{" "}
                    <code className="text-[11px]">DEFAULT_BUSINESS_ID</code>. Switch venue with{" "}
                    <code className="text-[11px]">?business=&lt;uuid&gt;</code> on dashboard URLs.
                  </li>
                  <li>
                    <strong className="text-(--foreground)/70">Venue (single tenant):</strong> set{" "}
                    <code className="text-[11px]">DASHBOARD_MODE=tenant</code> and{" "}
                    <code className="text-[11px]">DEFAULT_BUSINESS_ID=&lt;uuid&gt;</code> for that
                    business.
                  </li>
                </ul>
                <p className="mt-2 text-[11px] text-(--foreground)/45">
                  Tip: keep <code>.env.local.platform</code> and <code>.env.local.venue</code> copies
                  and swap into <code>.env.local</code> before{" "}
                  <code className="text-[11px]">npm run dev</code>, or run two apps on different ports
                  with different env files.
                </p>
              </div>
            </div>
          }
        />

        <SettingCard
          icon={
            <MessageQuestion size={22} variant="Bold" className="text-(--accent)" aria-hidden />
          }
          title="Quick links"
          body={
            <ul className="text-sm text-(--foreground)/60 space-y-2">
              <li>
                <Link href="/dashboard/customers" className="text-(--accent) font-semibold underline">
                  Credits &amp; redemption
                </Link>
              </li>
              <li>
                <Link href="/dashboard/orders" className="text-(--accent) font-semibold underline">
                  Orders pipeline
                </Link>
              </li>
              {businessId ? (
                <li>
                  <Link
                    href={`/dashboard/business/${businessId}${dashboardBusinessQuery(mode, businessId)}`}
                    className="text-(--accent) font-semibold underline"
                  >
                    Business details
                  </Link>
                </li>
              ) : null}
            </ul>
          }
        />

        <SettingCard
          icon={<Code1 size={22} variant="Bold" className="text-(--accent)" aria-hidden />}
          title="Developers"
          body={
            <p className="text-sm text-(--foreground)/60">
              Widget and scan flows use public routes; this dashboard uses admin routes with the
              same key as <code className="text-xs">x-admin-api-key</code>. Replace with JWT per
              tenant before production client access.
            </p>
          }
        />
      </div>
    </div>
  );
}

function SettingCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-(--border)/50 bg-(--muted)/20 p-6 flex gap-4">
      <div className="w-10 h-10 rounded-xl bg-(--foreground)/5 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-sm uppercase tracking-wide mb-2">{title}</h3>
        {body}
      </div>
    </div>
  );
}
