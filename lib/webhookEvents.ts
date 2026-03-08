export const AVAILABLE_WEBHOOK_EVENTS = [
  { key: "trade:executed", label: "Trade Executed" },
  { key: "trade:closed", label: "Trade Closed" },
  { key: "agent:alert", label: "Agent Alert" },
  { key: "pipeline:complete", label: "Pipeline Complete" },
  { key: "scanner:signal", label: "Scanner Signal" },
  { key: "risk:circuit_breaker", label: "Circuit Breaker" },
] as const;

function isPrivateOrInternalHost(hostnameRaw: string): boolean {
  const host = hostnameRaw.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "[::1]" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  );
}

export function validateOptionalPublicHttpsUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return "Webhook URL must use HTTPS.";
    }

    if (isPrivateOrInternalHost(parsed.hostname)) {
      return "Webhook URL must not point to a private or internal address.";
    }

    return null;
  } catch {
    return "Webhook URL must be a valid URL.";
  }
}
