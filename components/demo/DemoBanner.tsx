"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useViewer } from "@/context/ViewerContext";
import { useSignInGate } from "@/hooks/useSignInGate";

const PERSONAL_ROUTES = ["/dashboard", "/manage-agent", "/reports", "/settings"];

// Slim notice above personal pages while they show demo agent NOVA-7
export function DemoBanner() {
  const t = useTranslations("demo");
  const viewer = useViewer();
  const pathname = usePathname();
  const router = useRouter();
  const gate = useSignInGate();

  if (!viewer.isDemo || !PERSONAL_ROUTES.some((route) => pathname.startsWith(route))) return null;
  const guest = viewer.mode === "guest";

  return (
    <div role="status" className="demo-banner">
      <span className="demo-banner__badge">{t("badge")}</span>
      <span className="demo-banner__text">
        <strong>{guest ? t("guestTitle") : t("noAgentTitle")}</strong> {guest ? t("guestBody") : t("noAgentBody")}
      </span>
      <button
        type="button"
        className="demo-banner__cta"
        onClick={() => (guest ? gate(() => {}, { needs: "signIn" }) : router.push("/agent-factory"))}
      >
        {guest ? t("signIn") : t("createAgent")}
      </button>
    </div>
  );
}
