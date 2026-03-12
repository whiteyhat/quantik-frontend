"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const FONT = "'General Sans', sans-serif";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4";


function PillButton({
  children,
  variant = "dark",
  onClick,
}: {
  children: React.ReactNode;
  variant?: "dark" | "light";
  onClick?: () => void;
}) {
  const isDark = variant === "dark";

  return (
    <button
      onClick={onClick}
      className={`group relative inline-flex cursor-pointer overflow-hidden transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]`}
      style={{
        borderRadius: 9999,
        border: "0.6px solid rgba(255,255,255,0.6)",
        background: "transparent",
        padding: 1,
      }}
    >
      {/* Top glow streak */}
      <span
        className="transition-opacity duration-300 group-hover:opacity-100"
        style={{
          position: "absolute",
          top: 0,
          left: "20%",
          right: "20%",
          height: 12,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)",
          borderRadius: "0 0 50% 50%",
          filter: "blur(4px)",
          pointerEvents: "none",
          opacity: 0.7,
        }}
      />
      <span
        className={`relative inline-flex items-center justify-center transition-colors duration-200 ${
          isDark
            ? "bg-black text-white/90 group-hover:text-white"
            : "bg-white text-black group-hover:bg-white/90"
        }`}
        style={{
          borderRadius: 9999,
          fontFamily: FONT,
          fontSize: 14,
          fontWeight: 500,
          padding: "11px 29px",
          lineHeight: 1,
        }}
      >
        {children}
      </span>
    </button>
  );
}

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const t = useTranslations("landing");
  const tNav = useTranslations("nav");

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) {
    return <div style={{ background: "#000", minHeight: "100vh" }} />;
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        background: "#000",
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      {/* Fullscreen background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* 50% black overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1,
        }}
      />

      {/* Content layer */}
      <div style={{ position: "relative", zIndex: 2 }}>
        {/* ─── Navbar ──────────────────────────────────────────────── */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 120px",
          }}
          className="!px-6 md:!px-[120px]"
        >
          {/* Left — Logo */}
          <div
            style={{
              width: 187,
              height: 25,
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: FONT,
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "0.04em",
              }}
            >
              {tNav("wordmark")}
            </span>
          </div>

          {/* Right — Join Now */}
          <SignInButton mode="modal" forceRedirectUrl="/dashboard">
            <PillButton variant="dark">{t("joinNow")}</PillButton>
          </SignInButton>
        </nav>

        {/* ─── Hero Content ────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            paddingBottom: 102,
          }}
          className="pt-[200px] md:pt-[280px]"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 40,
            }}
          >
            {/* Badge / pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.20)",
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "#fff",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                {t("badge")}
              </span>
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#fff",
                }}
              >
                {t("badgeDate")}
              </span>
            </div>

            {/* Heading */}
            <h1
              style={{
                maxWidth: 613,
                fontFamily: FONT,
                fontWeight: 500,
                lineHeight: 1.28,
                margin: 0,
                background:
                  "linear-gradient(144.5deg, #FFFFFF 28%, rgba(255,255,255,0.40) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              className="text-[36px] md:text-[56px] px-4 md:px-0"
            >
              {t("heading")}
            </h1>

            {/* Subtitle */}
            <p
              style={{
                maxWidth: 680,
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: 400,
                color: "rgba(255,255,255,0.80)",
                lineHeight: 1.6,
                margin: 0,
              }}
              className="px-6 md:px-0"
            >
              {t("subtitle")}
            </p>

            {/* CTA Button — opens Clerk sign-in modal */}
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <PillButton variant="light">{t("joinNow")}</PillButton>
            </SignInButton>
          </div>
        </div>
      </div>
    </div>
  );
}
