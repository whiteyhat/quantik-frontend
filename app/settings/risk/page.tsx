import { redirect } from "next/navigation";

// Risk configuration has been merged into /settings.
// This page redirects there using a server-side redirect (no flash, no hydration).
export default function RiskRedirect() {
  redirect("/settings");
}
