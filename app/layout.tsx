"use client";

import "./globals.css";
import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Quantik | Ultimate AI Trading</title>
        <meta
          name="description"
          content="AI-powered prediction market trading terminal"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
      </head>
      <body className="antialiased" style={{ minHeight: "100dvh" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
