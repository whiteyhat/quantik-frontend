import { redirect } from "next/navigation";

export default async function TradeHistoryRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/reports`);
}
