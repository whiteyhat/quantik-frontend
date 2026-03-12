import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/:locale",
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)",
  "/api(.*)",
]);

const intlMiddleware = createIntlMiddleware(routing);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Run next-intl middleware to handle locale detection & prefix routing
  return intlMiddleware(request);
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, but match everything else
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
