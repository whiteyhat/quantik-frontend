"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function ShareButtons({
  url,
  text,
  className,
}: {
  url: string;
  text: string;
  className?: string;
}) {
  const t = useTranslations("arena");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  const handleTwitter = useCallback(() => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer,width=550,height=420");
  }, [url, text]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch (_) {
        // User cancelled or share failed — no action needed
      }
    }
  }, [url, text]);

  return (
    <div className={cn("arena-share-row", className)}>
      <button
        type="button"
        className={cn("arena-share-btn", copied && "arena-share-btn--copied")}
        onClick={handleCopy}
        aria-label={t("copyLink")}
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              style={{ display: "inline-flex" }}
            >
              <Check className="size-4" />
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              style={{ display: "inline-flex" }}
            >
              <Copy className="size-4" />
            </motion.span>
          )}
        </AnimatePresence>
        <span>{copied ? t("copied") : t("copyLink")}</span>
      </button>

      <button
        type="button"
        className="arena-share-btn arena-share-btn--twitter"
        onClick={handleTwitter}
        aria-label={t("shareTwitter")}
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span>{t("shareTwitter")}</span>
      </button>

      {canNativeShare && (
        <button
          type="button"
          className="arena-share-btn"
          onClick={handleNativeShare}
          aria-label={t("shareMore")}
        >
          <Share2 className="size-4" />
          <span>{t("shareMore")}</span>
        </button>
      )}
    </div>
  );
}
