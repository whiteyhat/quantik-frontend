import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { type Locale } from "@/i18n/routing";
import { PublicAgentProfileView } from "@/components/arena/PublicAgentProfile";
import { api } from "@/lib/api";
import { demoArenaProfile, isDemoArenaCode } from "@/lib/demo/arena";

type Props = {
  params: Promise<{ locale: string; agentCode: string }>;
};

// Sample-arena agents (Q-DEMO-…) come from fixtures, never the live API
async function loadProfile(agentCode: string) {
  if (isDemoArenaCode(agentCode)) return demoArenaProfile(agentCode);
  try {
    return await api.getPublicAgentProfile(agentCode);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, agentCode } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "arena" });

  let title = `${agentCode} | ${t("title")}`;
  let description = t("publicMetaDescription");

  const profile = await loadProfile(agentCode);
  if (profile) {
    title = t("publicAgentMeta", { emoji: profile.avatarEmoji, name: profile.name, rank: String(profile.rank ?? "—") });
    description = t("publicAgentMetaDesc", { name: profile.name, rank: String(profile.rank ?? "—"), pnl: profile.allTimePnl.toFixed(2), winRate: profile.winRate.toFixed(1), trades: String(profile.totalTrades) });
  }

  return {
    title,
    description,
    // Sample agents are illustrative: keep them out of search results
    ...(isDemoArenaCode(agentCode) ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      type: "profile",
    },
  };
}

export default async function PublicAgentPage({ params }: Props) {
  const { locale, agentCode } = await params;

  const profile = await loadProfile(agentCode);

  // Unknown codes answer 404 (see not-found.tsx), not an empty 200 page
  if (!profile) notFound();

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${locale}/arena/agent/${agentCode}`;

  return <PublicAgentProfileView profile={profile} shareUrl={shareUrl} demo={isDemoArenaCode(agentCode)} />;
}
