// This route has been removed from the nav.
// Emergency panic is now accessible via the GlobalPanicButton floating action button.
// Redirecting to dashboard.

import { redirect } from "next/navigation";

export default function PanicPageRedirect() {
  redirect("/");
}
