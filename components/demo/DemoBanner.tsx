"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useViewer } from "@/context/ViewerContext";
import { useSignInGate } from "@/hooks/useSignInGate";
import { cn } from "@/lib/utils";

const PERSONAL_ROUTES = ["/dashboard", "/manage-agent", "/reports", "/settings"];
const isArenaRoute = (pathname: string) => pathname === "/arena" || pathname.startsWith("/arena/");

// Slim notice above personal pages while they show demo agent NOVA-7, and
// above the arena while guests watch the sample season
export function DemoBanner() {
  const t = useTranslations("demo");
  const viewer = useViewer();
  const pathname = usePathname();
  const router = useRouter();
  const gate = useSignInGate();
  const guest = viewer.mode === "guest";

  if (isArenaRoute(pathname)) {
    // Members always see the live arena, so only guests get the notice
    if (!guest) return null;
    return (
      <div role="status" className="demo-banner">
        <span className="demo-banner__badge">{t("badge")}</span>
        <span className="demo-banner__text">
          <strong>{t("arenaTitle")}</strong> {t("arenaBody")}
        </span>
        <button type="button" className="demo-banner__cta" onClick={() => gate(() => {}, { needs: "signIn" })}>
          {t("signIn")}
        </button>
      </div>
    );
  }

  if (!viewer.isDemo || !PERSONAL_ROUTES.some((route) => pathname.startsWith(route))) return null;

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

// Label for public profiles of sample-arena agents; shown to everyone, since
// anyone can open the link
export function DemoArenaProfileBanner({ name, className }: { name: string; className?: string }) {
  const t = useTranslations("demo");
  const viewer = useViewer();
  const router = useRouter();
  const gate = useSignInGate();
  const guest = viewer.mode === "guest";

  return (
    <div role="status" className={cn("demo-banner", className)}>
      <span className="demo-banner__badge">{t("badge")}</span>
      <span className="demo-banner__text">
        <strong>{t("arenaProfileTitle")}</strong> {t("arenaProfileBody", { name })}
      </span>
      {viewer.mode === "loading" ? null : (
        <button
          type="button"
          className="demo-banner__cta"
          onClick={() => (guest ? gate(() => {}, { needs: "signIn" }) : router.push("/arena"))}
        >
          {guest ? t("signIn") : t("backToArena")}
        </button>
      )}
    </div>
  );
}
