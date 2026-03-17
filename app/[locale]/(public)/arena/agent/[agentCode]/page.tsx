import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type Locale } from "@/i18n/routing";
import { PublicAgentProfileView } from "@/components/arena/PublicAgentProfile";
import { api } from "@/lib/api";

type Props = {
  params: Promise<{ locale: string; agentCode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, agentCode } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "arena" });

  let title = `${agentCode} | ${t("title")}`;
  let description = t("publicMetaDescription");

  try {
    const profile = await api.getPublicAgentProfile(agentCode);
    if (profile) {
      title = t("publicAgentMeta", { emoji: profile.avatarEmoji, name: profile.name, rank: String(profile.rank ?? "—") });
      description = t("publicAgentMetaDesc", { name: profile.name, rank: String(profile.rank ?? "—"), pnl: profile.allTimePnl.toFixed(2), winRate: profile.winRate.toFixed(1), trades: String(profile.totalTrades) });
    }
  } catch {
    // Use defaults
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
    },
  };
}

export default async function PublicAgentPage({ params }: Props) {
  const { locale, agentCode } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "arena" });

  let profile;
  try {
    profile = await api.getPublicAgentProfile(agentCode);
  } catch {
    profile = null;
  }

  if (!profile) {
    return (
      <div className="arena-public-empty">
        <h1>{t("publicNotFoundTitle")}</h1>
        <p>{t("publicNotFoundDetail")}</p>
      </div>
    );
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${locale}/arena/agent/${agentCode}`;

  return <PublicAgentProfileView profile={profile} shareUrl={shareUrl} />;
}
