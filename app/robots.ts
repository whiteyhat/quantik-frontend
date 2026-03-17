import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/agent-factory",
        "/manage-agent",
        "/settings",
        "/reports",
        "/trade-history",
        "/market-analysis",
        "/emergency",
      ],
    },
    sitemap: "https://quantik.fun/sitemap.xml",
  };
}
