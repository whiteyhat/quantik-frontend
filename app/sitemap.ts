import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const BASE_URL = "https://quantik.fun";
const PUBLIC_ROUTES = ["", "/arena"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routing.locales.flatMap((locale) =>
    PUBLIC_ROUTES.map((route) => ({
      url: `${BASE_URL}/${locale}${route}`,
      lastModified: now,
      changeFrequency: (route === "" ? "weekly" : "daily") as "weekly" | "daily",
      priority: route === "" ? 1 : 0.8,
    })),
  );
}
