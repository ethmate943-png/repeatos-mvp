/** Query string so platform mode keeps the selected business across dashboard routes. */
export function dashboardBusinessQuery(
  mode: "platform" | "tenant",
  businessId: string,
): string {
  return mode === "platform" ? `?business=${encodeURIComponent(businessId)}` : "";
}
