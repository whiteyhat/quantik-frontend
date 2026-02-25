import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://3961c77c1bd80d63c7c50bbd917342f6@o4506259886833664.ingest.us.sentry.io/4510949172969472",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
