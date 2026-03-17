import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type Locale } from "@/i18n/routing";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "metadata" });

  const title = t("title");
  const description = t("description");
  const url = `https://quantik.fun/${locale}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: "Quantik",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Quantik",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            description: "AI-powered prediction market trading terminal with a 7-agent swarm pipeline",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />
      {children}
    </>
  );
}
