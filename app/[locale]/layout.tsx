import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { Providers } from "@/components/Providers";
import { SolanaWalletProviders } from "@/components/SolanaWalletProviders";
import { themeBootstrapScript } from "@/lib/theme";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang="${locale}";${themeBootstrapScript}` }} />
      <NextIntlClientProvider messages={messages}>
        <SolanaWalletProviders>
          <Providers>{children}</Providers>
        </SolanaWalletProviders>
      </NextIntlClientProvider>
    </>
  );
}
