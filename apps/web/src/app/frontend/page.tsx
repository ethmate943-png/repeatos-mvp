import { redirect } from "next/navigation";

/** Short alias so you can open `/frontend` on the Next host and land in the dashboard. */
export default function FrontendAliasPage() {
  redirect("/dashboard");
}
