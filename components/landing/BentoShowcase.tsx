"use client";

import { useTranslations } from "next-intl";
import { SectionShell } from "./SectionShell";
import SwarmRunTile from "./bento/SwarmRunTile";
import GuardrailsTile from "./bento/GuardrailsTile";
import MarketsHubTile from "./bento/MarketsHubTile";
import DebateTile from "./bento/DebateTile";
import AskAgentTile from "./bento/AskAgentTile";
import ArenaTile from "./bento/ArenaTile";
import ByoAgentTile from "./bento/ByoAgentTile";

// "Inside the machine": React Bits bento tiles re-cut for Quantik. The tiles
// style themselves with `dark:` utilities, so the grid sits in a `.dark` scope.
export function BentoShowcase() {
  const t = useTranslations("landing.bento");

  return (
    <SectionShell wide>
      <div style={{ textAlign: "center", margin: "0 auto 48px", maxWidth: 640 }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, color: "#fff", margin: "0 0 12px" }}>
          {t("title")}
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(255,255,255,0.55)", margin: 0, textWrap: "balance" }}>
          {t("subtitle")}
        </p>
      </div>

      <div className="dark grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[minmax(400px,auto)]">
        <div className="sm:col-span-2">
          <SwarmRunTile />
        </div>
        <GuardrailsTile />
        <MarketsHubTile />
        <div className="sm:col-span-2">
          <DebateTile />
        </div>
        <AskAgentTile />
        <ArenaTile />
        <div className="sm:col-span-2 lg:col-span-1">
          <ByoAgentTile />
        </div>
      </div>
    </SectionShell>
  );
}
