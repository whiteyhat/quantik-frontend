import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: "o4506259886833664",
  project: "quantik-frontend",
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
