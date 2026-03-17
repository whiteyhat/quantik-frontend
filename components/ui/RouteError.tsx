"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RouteError({
  error,
  reset,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  return (
    <div className="command-center-shell">
      <section className="command-center-card command-center-card--red max-w-2xl">
        <div className="flex items-center gap-3 text-[#ffb4ac]">
          <AlertTriangle className="size-5" />
          <div>
            <div className="command-center-title">{title}</div>
            <div className="command-center-subtitle">
              {error.message || "An unexpected error occurred."}
            </div>
          </div>
        </div>
        <div className="pt-4">
          <Button onClick={reset}>
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      </section>
    </div>
  );
}
