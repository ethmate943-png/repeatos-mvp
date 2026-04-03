import "server-only";

export function getRepeatosConfig(): {
  base: string;
  key: string | null;
} {
  const base =
    process.env.REPEATOS_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:4000";
  const key = process.env.REPEATOS_ADMIN_API_KEY ?? null;
  return { base, key };
}

/** Authenticated fetch to the RepeatOS API (server-only). */
export async function repeatosAdminFetch(
  path: string,
  init?: RequestInit,
): Promise<Response | null> {
  const { base, key } = getRepeatosConfig();
  if (!key) return null;
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      "x-admin-api-key": key,
      ...(init?.headers as Record<string, string>),
    },
    cache: "no-store",
  });
}

export function getDashboardMode(): "platform" | "tenant" {
  const m = (process.env.DASHBOARD_MODE ?? "tenant").toLowerCase();
  return m === "platform" ? "platform" : "tenant";
}

export function getDefaultBusinessId(): string | null {
  const id = process.env.DEFAULT_BUSINESS_ID?.trim();
  return id || null;
}
