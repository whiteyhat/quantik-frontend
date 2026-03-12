// Minimal root layout — the real layout lives in app/[locale]/layout.tsx
// This wrapper is required by Next.js but delegates everything to the locale layout.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
