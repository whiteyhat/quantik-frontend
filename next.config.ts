import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
import packageJson from "./package.json";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  // Trade history now lives in Reports. Redirect on the server (before any page renders), so the
  // browser gets one 308 instead of loading a page that redirects itself.
  async redirects() {
    return [
      { source: "/:locale(en|es|fr|de)/trade-history", destination: "/:locale/reports", permanent: true },
      { source: "/trade-history", destination: "/reports", permanent: true },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: "o4506259886833664",
  project: "quantik-frontend",
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
