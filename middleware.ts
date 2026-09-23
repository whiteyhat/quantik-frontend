import { clerkMiddleware } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

// When CLERK_JWT_KEY is set, verify JWTs locally without a network call to
// Clerk's JWKS endpoint. Required in production when using a custom Clerk
// domain (e.g. clerk.quantik.fun) — remote JWKS lookup fails with
// "Handshake token verification failed due to an invalid signature".
// Every page is public: guests explore a demo, and the backend enforces
// sign-in and ownership on every real action. Clerk still runs here so
// signed-in sessions are recognised on the server.
export default clerkMiddleware(async (_auth, request: NextRequest) => {
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
