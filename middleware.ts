import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/manifest.json",
  "/:locale",
  "/:locale/manifest.json",
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)",
  "/:locale/architecture",
  "/:locale/world",
  "/api(.*)",
]);

const intlMiddleware = createIntlMiddleware(routing);

// When CLERK_JWT_KEY is set, verify JWTs locally without a network call to
// Clerk's JWKS endpoint. Required in production when using a custom Clerk
// domain (e.g. clerk.quantik.fun) — remote JWKS lookup fails with
// "Handshake token verification failed due to an invalid signature".
export default clerkMiddleware(async (auth, request: NextRequest) => {
  // Protect non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Run next-intl middleware to handle locale detection & prefix routing
  return intlMiddleware(request);
}, process.env.CLERK_JWT_KEY ? { jwtKey: process.env.CLERK_JWT_KEY } : undefined);

export const config = {
  matcher: [
    // Skip Next.js internals and static files, including public JSON assets like manifest.json
    "/((?!_next|[^?]*\\.(?:html?|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
