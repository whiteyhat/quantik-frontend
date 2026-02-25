import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Quantik | Trading Terminal",
  description: "AI-powered prediction market trading terminal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen" style={{ background: '#0a0a0f', color: '#e0e0e0' }}>
        <Providers>
          <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
            {/* Top nav bar */}
            <nav className="border-b px-4 py-2 flex items-center justify-between"
              style={{ background: '#0f0f1a', borderColor: '#1e1e2e' }}>
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm tracking-widest" style={{ color: '#00ff88' }}>
                  ◈ QUANTIK
                </span>
                <span className="text-xs" style={{ color: '#606080' }}>
                  AI Trading Terminal
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs q-mono" style={{ color: '#606080' }}>
                  {new Date().toLocaleTimeString('en-US', { hour12: false })} UTC
                </span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1e1e2e', color: '#00ff88' }}>
                  LIVE
                </span>
              </div>
            </nav>
            <main className="p-4 max-w-[1600px] mx-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
