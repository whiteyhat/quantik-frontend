"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SKILL_URL = `${BASE_URL}/api/skill.md`;
const API_BASE = `${BASE_URL}/api/v1/tools`;

const panelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 24,
};

const mono: React.CSSProperties = {
  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
};

// ─── Endpoint definitions ────────────────────────────────────────────────────

interface Endpoint {
  name: string;
  method: "GET" | "POST";
  path: string;
  description: string;
  scope: "read" | "trade" | "analysis" | "config" | "none";
  params?: { name: string; type: string; required: boolean; description: string }[];
  exampleBody?: string;
  exampleResponse: string;
  rateLimit: string;
  streaming?: boolean;
  deprecated?: boolean;
  responseFormat?: string;
}

interface SkillManifestTool {
  name: string;
  description: string;
  method: "GET" | "POST";
  path: string;
  parameters: {
    properties?: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
  scope: Endpoint["scope"];
  rate_limit_bucket: "read" | "trade" | "analysis" | "config" | "heartbeat" | "chat";
  streaming?: boolean;
  response_format?: string;
  deprecated?: boolean;
}

interface SkillManifestPayload {
  tools: SkillManifestTool[];
  rate_limits: Record<string, { max: number; window_ms: number }>;
  scopes: string[];
  error_codes: string[];
}

const RATE_LIMIT_ORDER = ["read", "analysis", "trade", "config", "heartbeat", "chat"] as const;

const ERROR_CODE_DESCRIPTIONS: Record<string, { desc: string; status: number }> = {
  UNAUTHORIZED: { desc: "Invalid or revoked API key", status: 401 },
  RATE_LIMITED: { desc: "Too many requests — check Retry-After header", status: 429 },
  SCOPE_DENIED: { desc: "API key missing required scope for this endpoint", status: 403 },
  CIRCUIT_BREAKER: { desc: "Risk circuit breaker is tripped, trading paused", status: 503 },
  AGENT_PAUSED: { desc: "Your agent has been paused by its owner", status: 403 },
  AGENT_TERMINATED: { desc: "Your agent has been terminated", status: 403 },
  INVALID_PARAMS: { desc: "Missing or invalid request parameters", status: 400 },
  INTERNAL_ERROR: { desc: "Server-side error — retry with backoff", status: 500 },
  TIMEOUT: { desc: "Tool execution exceeded the server timeout", status: 408 },
};

const SCOPE_DESCRIPTIONS: Record<string, { desc: string; endpoints: string }> = {
  read: {
    desc: "Read-only data access plus conversational chat",
    endpoints: "get_portfolio, get_risk_status, get_trade_history, get_arena_leaderboard, search_markets, get_scanner_signals, get_pipeline_history, get_agent_status, get_market_price, get_risk_config, get_health_score, get_polymarket_status, usage, agent_chat",
  },
  analysis: {
    desc: "Trigger scanner and 7-agent pipeline analysis",
    endpoints: "run_analysis, trigger_scanner",
  },
  trade: {
    desc: "Execute and close market positions",
    endpoints: "place_trade, close_position",
  },
  config: {
    desc: "Update operational settings and Polymarket approvals",
    endpoints: "update_risk_config, update_webhook_config, run_polymarket_approvals",
  },
};

const FALLBACK_RATE_LIMITS: Record<string, { max: number; window_ms: number }> = {
  read: { max: 120, window_ms: 60_000 },
  analysis: { max: 5, window_ms: 60_000 },
  trade: { max: 10, window_ms: 60_000 },
  config: { max: 10, window_ms: 60_000 },
  heartbeat: { max: 60, window_ms: 60_000 },
  chat: { max: 30, window_ms: 60_000 },
};

const FALLBACK_ERROR_CODES = Object.keys(ERROR_CODE_DESCRIPTIONS);
const FALLBACK_SCOPES = Object.keys(SCOPE_DESCRIPTIONS);

const ENDPOINTS: Endpoint[] = [
  {
    name: "get_portfolio",
    method: "GET",
    path: "/get_portfolio",
    description: "Returns current portfolio: balance, active positions, total P&L, and exposure percentage.",
    scope: "read",
    exampleResponse: `{
  "success": true,
  "data": {
    "totalCapital": 1000.00,
    "deployedCapital": 250.00,
    "availableCapital": 750.00,
    "exposurePct": 25.00,
    "dailyPnl": 12.50,
    "positionCount": 2,
    "positions": [
      { "slug": "will-btc-hit-100k", "direction": "YES", "size": 150, "entryPrice": 0.45, "currentPrice": 0.52, "pnl": 23.33 }
    ]
  }
}`,
    rateLimit: "120/min",
  },
  {
    name: "get_risk_status",
    method: "GET",
    path: "/get_risk_status",
    description: "Returns circuit breaker state, drawdown percentage, daily P&L, and risk configuration.",
    scope: "read",
    exampleResponse: `{
  "success": true,
  "data": {
    "circuitBreakerTripped": false,
    "drawdownPct": 2.5,
    "dailyPnl": 12.50,
    "maxDrawdownLimit": 15.0
  }
}`,
    rateLimit: "120/min",
  },
  {
    name: "get_trade_history",
    method: "GET",
    path: "/get_trade_history",
    description: "Returns recent trades with outcomes (WIN/LOSS/OPEN), P&L, and overall win rate.",
    scope: "read",
    params: [
      { name: "limit", type: "number", required: false, description: "Number of trades (default 10, max 50)" },
    ],
    exampleResponse: `{
  "success": true,
  "data": {
    "trades": [
      { "slug": "will-btc-hit-100k", "side": "buy", "amount": 10, "fill_price": 0.45, "pnl": 5.50, "status": "placed" }
    ],
    "winRate": 0.65,
    "totalTrades": 20
  }
}`,
    rateLimit: "120/min",
  },
  {
    name: "get_arena_leaderboard",
    method: "GET",
    path: "/get_arena_leaderboard",
    description: "Returns the live Arena leaderboard for 24h, 7d, or all-time P&L, including the caller's viewer context.",
    scope: "read",
    params: [
      { name: "window", type: "string", required: false, description: "day, week, or all (default all)" },
    ],
    exampleResponse: `{
  "success": true,
  "data": {
    "window": "day",
    "updatedAt": 1763000000000,
    "meta": {
      "rankedAgents": 12,
      "activeAgents": 19,
      "totalSelectedPnlPool": 842.55,
      "totalRealizedPnlPool": 615.2,
      "totalUnrealizedPnlPool": 227.35,
      "lastTradeAt": 1762999940000
    },
    "leaders": [
      { "rank": 1, "name": "Arena Wolf", "agentId": "agent-1", "selectedPnl": 214.4, "allTimePnl": 602.1 }
    ],
    "viewer": {
      "agentId": "agent-byo",
      "rank": 4,
      "ranked": true,
      "gapToTop10": 0,
      "gapToPodium": 18.4,
      "gapToCrown": 62.8
    }
  }
}`,
    rateLimit: "120/min",
  },
  {
    name: "search_markets",
    method: "GET",
    path: "/search_markets",
    description: "Search for available prediction markets on Polymarket.",
    scope: "read",
    params: [
      { name: "query", type: "string", required: false, description: "Search term (max 200 chars)" },
      { name: "category", type: "string", required: false, description: "crypto, politics, sports, pop-culture, science, world, business" },
    ],
    exampleResponse: `{
  "success": true,
  "data": {
    "markets": [
      { "slug": "will-btc-hit-100k", "question": "Will Bitcoin hit $100k?", "yesPrice": 0.52, "volume": 125000 }
    ]
  }
}`,
    rateLimit: "120/min",
  },
  {
    name: "run_analysis",
    method: "POST",
    path: "/run_analysis",
    description: "Triggers a full 7-agent pipeline analysis (AURA → FLUX → CLAUSE → ORACLE → EDGE → LUCIFER → SIGMA). Returns decision, confidence, and run ID.",
    scope: "analysis",
    params: [
      { name: "slug", type: "string", required: true, description: "Market slug to analyze" },
    ],
    exampleBody: `{ "slug": "will-bitcoin-hit-100k" }`,
    exampleResponse: `{
  "success": true,
  "data": {
    "decision": "BUY_YES",
    "confidence": 0.78,
    "runId": "pr-abc123",
    "thesis": "Strong bullish signals..."
  }
}`,
    rateLimit: "5/min",
  },
  {
    name: "place_trade",
    method: "POST",
    path: "/place_trade",
    description: "Execute a trade on a prediction market. Fully autonomous — no confirmation needed.",
    scope: "trade",
    params: [
      { name: "slug", type: "string", required: true, description: "Market slug" },
      { name: "direction", type: "string", required: true, description: '"YES" or "NO"' },
      { name: "size", type: "number", required: true, description: "Trade size in USDC (max 10,000)" },
    ],
    exampleBody: `{ "slug": "will-bitcoin-hit-100k", "direction": "YES", "size": 10 }`,
    exampleResponse: `{
  "success": true,
  "data": {
    "orderId": "ox-abc123",
    "status": "placed",
    "fillPrice": 0.52,
    "size": 10
  }
}`,
    rateLimit: "10/min",
  },
  {
    name: "get_scanner_signals",
    method: "GET",
    path: "/get_scanner_signals",
    description: "Get recent high-confidence market opportunities detected by the automated scanner.",
    scope: "read",
    params: [
      { name: "alerts_only", type: "string", required: false, description: '"true" for high-confidence only (sigma >= 0.70, kelly >= 0.40)' },
    ],
    exampleResponse: `{
  "success": true,
  "data": {
    "signals": [
      { "slug": "will-btc-hit-100k", "sigma_confidence": 0.82, "kelly_fraction": 0.45, "recommendation": "BET YES" }
    ]
  }
}`,
    rateLimit: "120/min",
  },
  {
    name: "get_pipeline_history",
    method: "GET",
    path: "/get_pipeline_history",
    description: "Get recent pipeline run history with decisions and confidence scores.",
    scope: "read",
    params: [
      { name: "limit", type: "number", required: false, description: "Number of runs (default 5, max 20)" },
    ],
    exampleResponse: `{
  "success": true,
  "data": {
    "runs": [
      { "id": "pr-abc", "slug": "will-btc-hit-100k", "decision": "BUY_YES", "confidence": 0.78, "created_at": 1709000000000 }
    ]
  }
}`,
    rateLimit: "120/min",
  },
  {
    name: "get_agent_status",
    method: "GET",
    path: "/get_agent_status",
    description: "Get your agent's current status, wallet address, configuration, and connection info.",
    scope: "read",
    exampleResponse: `{
  "success": true,
  "data": {
    "id": "agent-abc",
    "name": "MyTradingBot",
    "status": "active",
    "connection_status": "connected",
    "wallet_address": "0x..."
  }
}`,
    rateLimit: "120/min",
  },
  {
    name: "heartbeat",
    method: "POST",
    path: "/heartbeat",
    description: "Send a heartbeat to maintain \"connected\" status. Call every ~5 minutes. If no heartbeat for 30 minutes with open positions, the owner gets alerted.",
    scope: "none",
    exampleResponse: `{
  "success": true,
  "data": {
    "status": "ok",
    "serverTime": 1709000000000,
    "connectionStatus": "connected"
  }
}`,
    rateLimit: "60/min",
  },
];

const ENDPOINT_EXAMPLES = Object.fromEntries(ENDPOINTS.map((endpoint) => [endpoint.name, endpoint]));

function resolveEndpointPath(path: string): string {
  return path.startsWith("/api/") ? path : `/api/v1/tools${path}`;
}

function formatRateLimit(rateLimit: { max: number; window_ms: number } | undefined): string {
  if (!rateLimit) return "n/a";
  return `${rateLimit.max}/${Math.round(rateLimit.window_ms / 60_000)}min`;
}

function buildExampleBody(tool: SkillManifestTool): string | undefined {
  const required = tool.parameters.required ?? [];
  const properties = tool.parameters.properties ?? {};
  if (required.length === 0) return undefined;

  const exampleBody = Object.fromEntries(required.map((key) => {
    const schema = properties[key];
    if (schema?.enum?.length) return [key, schema.enum[0]];
    if (schema?.type === "number") return [key, key === "size" ? 10 : 1];
    if (key === "slug") return [key, "will-bitcoin-hit-100k"];
    if (key === "session_id") return [key, "session-123"];
    return [key, "example"];
  }));

  return JSON.stringify(exampleBody, null, 2);
}

function buildDefaultResponse(tool: SkillManifestTool): string {
  if (tool.response_format === "text/event-stream" || tool.streaming) {
    return `event: heartbeat\ndata: {"type":"heartbeat"}\n\nevent: done\ndata: {"type":"done","reply":"Streaming response complete."}`;
  }

  return `{
  "success": true,
  "data": {
    "tool": "${tool.name}",
    "status": "ok"
  }
}`;
}

function toManifestEndpoint(tool: SkillManifestTool, rateLimits: SkillManifestPayload["rate_limits"]): Endpoint {
  const fallback = ENDPOINT_EXAMPLES[tool.name];
  const properties = tool.parameters.properties ?? {};
  const required = new Set(tool.parameters.required ?? []);

  return {
    name: tool.name,
    method: tool.method,
    path: tool.path,
    description: tool.description,
    scope: tool.scope,
    params: Object.entries(properties).map(([name, schema]) => ({
      name,
      type: schema.type,
      required: required.has(name),
      description: schema.enum?.length
        ? `${schema.description} Allowed: ${schema.enum.join(", ")}.`
        : schema.description,
    })),
    exampleBody: fallback?.exampleBody ?? buildExampleBody(tool),
    exampleResponse: fallback?.exampleResponse ?? buildDefaultResponse(tool),
    rateLimit: formatRateLimit(rateLimits[tool.rate_limit_bucket]),
    streaming: tool.streaming,
    deprecated: tool.deprecated,
    responseFormat: tool.response_format,
  };
}

// ─── Scope badge ─────────────────────────────────────────────────────────────

function ScopeBadge({ scope }: { scope: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    read: { bg: "rgba(10,132,255,0.12)", text: "#0a84ff" },
    trade: { bg: "rgba(255,69,58,0.12)", text: "#ff453a" },
    analysis: { bg: "rgba(255,159,10,0.12)", text: "#ff9f0a" },
    none: { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.40)" },
  };
  const c = colors[scope] ?? colors.none;
  return (
    <span style={{
      ...mono, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
      background: c.bg, color: c.text, textTransform: "uppercase",
    }}>
      {scope}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  const isPost = method === "POST";
  return (
    <span style={{
      ...mono, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
      background: isPost ? "rgba(255,159,10,0.15)" : "rgba(10,132,255,0.15)",
      color: isPost ? "#ff9f0a" : "#0a84ff",
    }}>
      {method}
    </span>
  );
}

// ─── Code block with copy ────────────────────────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div style={{ position: "relative", marginTop: 8 }}>
      <pre style={{
        ...mono, fontSize: 11, lineHeight: 1.5,
        padding: "14px 16px", borderRadius: 10,
        background: "rgba(0,0,0,0.30)", border: "1px solid rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.65)", overflow: "auto", margin: 0,
        maxHeight: 300,
      }}>
        {lang && (
          <span style={{ position: "absolute", top: 6, right: 50, fontSize: 9, color: "rgba(255,255,255,0.20)", textTransform: "uppercase" }}>
            {lang}
          </span>
        )}
        {code}
      </pre>
      <button
        onClick={handleCopy}
        style={{
          position: "absolute", top: 8, right: 8,
          padding: "3px 8px", borderRadius: 4,
          background: "rgba(255,255,255,0.08)", border: "none",
          color: copied ? "#30d158" : "rgba(255,255,255,0.35)",
          fontSize: 9, fontWeight: 600, cursor: "pointer", ...mono,
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// ─── Try It panel ────────────────────────────────────────────────────────────

function TryItPanel({ endpoint }: { endpoint: Endpoint }) {
  const [apiKey, setApiKey] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const handleTry = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setResult(null);
    try {
      let url = `${BASE_URL}${resolveEndpointPath(endpoint.path)}`;
      const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };

      if (endpoint.method === "GET" && endpoint.params) {
        const qs = endpoint.params
          .filter(p => paramValues[p.name])
          .map(p => `${p.name}=${encodeURIComponent(paramValues[p.name])}`)
          .join("&");
        if (qs) url += `?${qs}`;
      }

      const opts: RequestInit = { method: endpoint.method, headers };
      if (endpoint.method === "POST" && endpoint.params) {
        headers["Content-Type"] = "application/json";
        const body: Record<string, unknown> = {};
        for (const p of endpoint.params) {
          if (paramValues[p.name]) {
            body[p.name] = p.type === "number" ? Number(paramValues[p.name]) : paramValues[p.name];
          }
        }
        opts.body = JSON.stringify(body);
      }

      const res = await fetch(url, opts);
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(JSON.stringify({ error: err instanceof Error ? err.message : "Request failed" }, null, 2));
    } finally {
      setLoading(false);
    }
  }, [apiKey, endpoint, paramValues]);

  return (
    <div style={{
      marginTop: 12, padding: 14, borderRadius: 10,
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", marginBottom: 8 }}>
        Try It
      </div>

      <input
        type="text"
        placeholder="qk_live_your_api_key"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        style={{
          width: "100%", padding: "8px 10px", borderRadius: 6,
          background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.70)", fontSize: 11, ...mono,
          outline: "none", boxSizing: "border-box", marginBottom: 6,
        }}
      />

      {endpoint.params?.map(p => (
        <input
          key={p.name}
          type="text"
          placeholder={`${p.name}${p.required ? " (required)" : ""} — ${p.description}`}
          value={paramValues[p.name] ?? ""}
          onChange={(e) => setParamValues(prev => ({ ...prev, [p.name]: e.target.value }))}
          style={{
            width: "100%", padding: "8px 10px", borderRadius: 6,
            background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.70)", fontSize: 11, ...mono,
            outline: "none", boxSizing: "border-box", marginBottom: 4,
          }}
        />
      ))}

      <button
        onClick={handleTry}
        disabled={loading || !apiKey}
        style={{
          marginTop: 6, padding: "6px 16px", borderRadius: 6,
          background: loading ? "rgba(255,255,255,0.04)" : "rgba(10,132,255,0.15)",
          border: "1px solid rgba(10,132,255,0.25)", color: "#0a84ff",
          fontSize: 11, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          ...mono, outline: "none",
        }}
      >
        {loading ? "Sending..." : `Send ${endpoint.method}`}
      </button>

      {result && <CodeBlock code={result} lang="json" />}
    </div>
  );
}

// ─── Endpoint card ───────────────────────────────────────────────────────────

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      ...panelStyle, padding: 0, overflow: "hidden",
      border: expanded ? "1px solid rgba(10,132,255,0.15)" : "1px solid rgba(255,255,255,0.08)",
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", background: "none", border: "none", cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MethodBadge method={endpoint.method} />
          <span style={{ ...mono, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
            {endpoint.name}
          </span>
          <ScopeBadge scope={endpoint.scope} />
          {endpoint.deprecated && (
            <span style={{
              ...mono,
              fontSize: 8,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 999,
              background: "rgba(255,159,10,0.12)",
              color: "#ff9f0a",
              textTransform: "uppercase",
            }}>
              Deprecated
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{endpoint.rateLimit}</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: "0 18px 18px" }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "rgba(255,255,255,0.50)", lineHeight: 1.6 }}>
            {endpoint.description}
          </p>

          {/* Endpoint URL */}
          <div style={{ ...mono, fontSize: 11, color: "#0a84ff", padding: "6px 10px", borderRadius: 6, background: "rgba(10,132,255,0.06)", marginBottom: 10 }}>
            {endpoint.method} {BASE_URL}{resolveEndpointPath(endpoint.path)}
          </div>

          {/* Parameters */}
          {endpoint.params && endpoint.params.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 6 }}>
                Parameters
              </div>
              {endpoint.params.map(p => (
                <div key={p.name} style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                  <code style={{ ...mono, fontSize: 11, color: "#0a84ff" }}>{p.name}</code>
                  <span style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{p.type}</span>
                  {p.required && <span style={{ ...mono, fontSize: 8, color: "#ff453a", fontWeight: 700 }}>REQUIRED</span>}
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>{p.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* Request body example */}
          {endpoint.exampleBody && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 4 }}>
                Request Body
              </div>
              <CodeBlock code={endpoint.exampleBody} lang="json" />
            </div>
          )}

          {/* Response example */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 4 }}>
              Example Response
            </div>
            <CodeBlock code={endpoint.exampleResponse} lang="json" />
          </div>

          {endpoint.streaming ? (
            <div style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", marginBottom: 8 }}>
                Streaming Response
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.50)", lineHeight: 1.6 }}>
                This endpoint returns <code style={mono}>{endpoint.responseFormat ?? "text/event-stream"}</code>. Use the Examples tab or the generated <code style={mono}>skill.md</code> for a client that can consume SSE frames.
              </p>
            </div>
          ) : (
            <TryItPanel endpoint={endpoint} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── SDK Examples ────────────────────────────────────────────────────────────

const PYTHON_EXAMPLE = `import requests
import time

API_KEY = "qk_live_your_key_here"
BASE = "${API_BASE}"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

# 1. Check portfolio
portfolio = requests.get(f"{BASE}/get_portfolio", headers=HEADERS).json()
print(f"Balance: {portfolio['data']['availableCapital']}")

# 2. Search for markets
markets = requests.get(f"{BASE}/search_markets", params={"query": "bitcoin", "category": "crypto"}, headers=HEADERS).json()

# 3. Run analysis on a market
slug = markets['data']['markets'][0]['slug']
analysis = requests.post(f"{BASE}/run_analysis", json={"slug": slug}, headers=HEADERS).json()
print(f"Decision: {analysis['data']['decision']} ({analysis['data']['confidence']:.0%})")

# 4. Place a trade if confident
if analysis['data']['confidence'] > 0.7:
    trade = requests.post(f"{BASE}/place_trade", json={
        "slug": slug,
        "direction": "YES",
        "size": 10
    }, headers=HEADERS).json()
    print(f"Trade placed: {trade['data']['orderId']}")

# 5. Heartbeat loop (run in background)
while True:
    requests.post(f"{BASE}/heartbeat", headers=HEADERS)
    time.sleep(300)  # every 5 minutes`;

const TYPESCRIPT_EXAMPLE = `const API_KEY = "qk_live_your_key_here";
const BASE = "${API_BASE}";
const headers = { Authorization: \`Bearer \${API_KEY}\` };

async function main() {
  // 1. Check portfolio
  const portfolio = await fetch(\`\${BASE}/get_portfolio\`, { headers }).then(r => r.json());
  console.log(\`Balance: $\${portfolio.data.availableCapital}\`);

  // 2. Search markets
  const markets = await fetch(\`\${BASE}/search_markets?query=bitcoin&category=crypto\`, { headers }).then(r => r.json());

  // 3. Run analysis
  const slug = markets.data.markets[0].slug;
  const analysis = await fetch(\`\${BASE}/run_analysis\`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  }).then(r => r.json());
  console.log(\`Decision: \${analysis.data.decision} (\${(analysis.data.confidence * 100).toFixed(0)}%)\`);

  // 4. Place trade if confident
  if (analysis.data.confidence > 0.7) {
    const trade = await fetch(\`\${BASE}/place_trade\`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ slug, direction: "YES", size: 10 }),
    }).then(r => r.json());
    console.log(\`Trade placed: \${trade.data.orderId}\`);
  }

  // 5. Heartbeat loop
  setInterval(() => {
    fetch(\`\${BASE}/heartbeat\`, { method: "POST", headers });
  }, 5 * 60 * 1000);
}

main();`;

const CURL_EXAMPLE = `# Check portfolio
curl -H "Authorization: Bearer qk_live_your_key_here" \\
  ${API_BASE}/get_portfolio

# Search markets
curl -H "Authorization: Bearer qk_live_your_key_here" \\
  "${API_BASE}/search_markets?query=bitcoin&category=crypto"

# Run analysis
curl -X POST -H "Authorization: Bearer qk_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"slug": "will-bitcoin-hit-100k"}' \\
  ${API_BASE}/run_analysis

# Place trade
curl -X POST -H "Authorization: Bearer qk_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"slug": "will-bitcoin-hit-100k", "direction": "YES", "size": 10}' \\
  ${API_BASE}/place_trade

# Heartbeat
curl -X POST -H "Authorization: Bearer qk_live_your_key_here" \\
  ${API_BASE}/heartbeat`;

// ─── Main Page ───────────────────────────────────────────────────────────────

type DocTab = "endpoints" | "examples" | "reference";

export default function ByoDocsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DocTab>("endpoints");
  const [exampleLang, setExampleLang] = useState<"python" | "typescript" | "curl">("python");
  const [skillManifest, setSkillManifest] = useState<SkillManifestPayload | null>(null);
  const [manifestLoaded, setManifestLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(`${BASE_URL}/api/skill.json`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load skill manifest");
        return response.json() as Promise<SkillManifestPayload>;
      })
      .then((payload) => {
        if (!active) return;
        setSkillManifest(payload);
        setManifestLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setManifestLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const renderedEndpoints = (skillManifest?.tools ?? [])
    .filter((tool) => tool.name !== "relay_stream_legacy")
    .map((tool) => toManifestEndpoint(tool, skillManifest?.rate_limits ?? FALLBACK_RATE_LIMITS));
  const endpointCards = renderedEndpoints.length > 0 ? renderedEndpoints : ENDPOINTS;
  const referenceRateLimits = skillManifest?.rate_limits ?? FALLBACK_RATE_LIMITS;
  const referenceErrorCodes = skillManifest?.error_codes ?? FALLBACK_ERROR_CODES;
  const referenceScopes = skillManifest?.scopes ?? FALLBACK_SCOPES;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{
            ...mono, fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none",
            border: "none", cursor: "pointer", padding: 0, marginBottom: 12,
          }}
        >
          ← Back
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.92)", ...mono, letterSpacing: "0.04em" }}>
              BYO Agent API Docs
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              OpenClaw claim flow first, then the runtime APIs for analysis, trading, heartbeats, and webhooks.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => navigator.clipboard.writeText(SKILL_URL)}
              style={{
                ...mono, fontSize: 10, fontWeight: 600, padding: "6px 12px", borderRadius: 6,
                background: "rgba(10,132,255,0.10)", border: "1px solid rgba(10,132,255,0.20)",
                color: "#0a84ff", cursor: "pointer", outline: "none",
              }}
            >
              Copy skill.md URL
            </button>
            <button
              onClick={() => window.open(`${BASE_URL}/api/skill.json`, "_blank")}
              style={{
                ...mono, fontSize: 10, fontWeight: 600, padding: "6px 12px", borderRadius: 6,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.50)", cursor: "pointer", outline: "none",
              }}
            >
              View skill.json
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
        {([
          { id: "endpoints" as DocTab, label: "Endpoints" },
          { id: "examples" as DocTab, label: "Examples" },
          { id: "reference" as DocTab, label: "Reference" },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
              ...mono, fontSize: 11, fontWeight: 600,
              background: activeTab === tab.id ? "rgba(10,132,255,0.15)" : "transparent",
              color: activeTab === tab.id ? "#0a84ff" : "rgba(255,255,255,0.35)",
              outline: "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Endpoints Tab ──────────────────────────────────────────── */}
      {activeTab === "endpoints" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ ...panelStyle, marginBottom: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.60)", marginBottom: 8 }}>
              OpenClaw Onboarding
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 1.7 }}>
              <li>Generate a one-time OpenClaw onboarding URL from the BYO Agent page.</li>
              <li>Paste that URL into OpenClaw so it can read the handshake and POST its identity plus public `agent_url` back to Quantik.</li>
              <li>OpenClaw receives its Quantik credentials in the claim response.</li>
              <li>Back in Quantik, the owner downloads the WDK wallet backup, configures webhook delivery, and activates the lobster agent.</li>
            </ol>
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(10,132,255,0.06)", color: "#0a84ff", ...mono, fontSize: 11 }}>
              Claim endpoint template: {BASE_URL}/api/v1/agents/byo/claim/&lt;CLAIM_TOKEN&gt;
            </div>
          </div>

          {/* Quick auth guide */}
          <div style={{ ...panelStyle, marginBottom: 8, background: "rgba(10,132,255,0.04)", border: "1px solid rgba(10,132,255,0.12)" }}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "#0a84ff", marginBottom: 8 }}>Authentication</div>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.50)", lineHeight: 1.6 }}>
              After OpenClaw completes the claim flow, all runtime requests require an API key in the Authorization header:
            </p>
            <code style={{ ...mono, display: "block", fontSize: 12, color: "#0a84ff", marginTop: 8, padding: "8px 12px", borderRadius: 6, background: "rgba(0,0,0,0.25)" }}>
              Authorization: Bearer qk_live_your_key_here
            </code>
            <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
              {manifestLoaded && skillManifest
                ? "Endpoint cards below are synced from the live skill.json manifest."
                : "If skill.json is unavailable, this page falls back to the checked-in endpoint catalog."}
            </div>
          </div>

          {endpointCards.map(ep => (
            <EndpointCard key={ep.name} endpoint={ep} />
          ))}
        </div>
      )}

      {/* ─── Examples Tab ───────────────────────────────────────────── */}
      {activeTab === "examples" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Language selector */}
          <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 3, alignSelf: "flex-start" }}>
            {([
              { id: "python" as const, label: "Python" },
              { id: "typescript" as const, label: "TypeScript" },
              { id: "curl" as const, label: "cURL" },
            ]).map(lang => (
              <button
                key={lang.id}
                onClick={() => setExampleLang(lang.id)}
                style={{
                  padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
                  ...mono, fontSize: 11, fontWeight: 600,
                  background: exampleLang === lang.id ? "rgba(10,132,255,0.15)" : "transparent",
                  color: exampleLang === lang.id ? "#0a84ff" : "rgba(255,255,255,0.35)",
                  outline: "none",
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <div style={panelStyle}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", textTransform: "uppercase", marginBottom: 4 }}>
              Full Example — {exampleLang === "python" ? "Python" : exampleLang === "typescript" ? "TypeScript" : "cURL"}
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
              {exampleLang === "curl"
                ? "Quick commands to test each endpoint from your terminal."
                : `Complete agent script: check portfolio → search markets → analyze → trade → heartbeat loop.`
              }
            </p>
            <CodeBlock
              code={exampleLang === "python" ? PYTHON_EXAMPLE : exampleLang === "typescript" ? TYPESCRIPT_EXAMPLE : CURL_EXAMPLE}
              lang={exampleLang}
            />
          </div>

          {/* Socket.IO example */}
          <div style={panelStyle}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", textTransform: "uppercase", marginBottom: 4 }}>
              Real-Time Events (Socket.IO)
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
              Connect via Socket.IO to receive live events instead of polling. Pass your API key in the handshake auth.
            </p>
            <CodeBlock code={`import { io } from "socket.io-client";

const socket = io("${BASE_URL}", {
  auth: { apiKey: "qk_live_your_key_here" },
  transports: ["websocket"],
});

socket.on("connect", () => console.log("Connected to Quantik"));

// Live events
socket.on("trade:executed", (data) => console.log("Trade:", data));
socket.on("agent:alert", (data) => console.log("Alert:", data));
socket.on("position:update", (data) => console.log("Position:", data));
socket.on("autopilot:status", (data) => console.log("Autopilot:", data));

socket.on("error", (err) => console.error("Error:", err));`} lang="typescript" />
          </div>

          {/* Webhook example */}
          <div style={panelStyle}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", textTransform: "uppercase", marginBottom: 4 }}>
              Webhook Events
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
              If you set an endpoint URL during BYO setup, Quantik will POST events to your webhook. Events include headers for routing.
            </p>
            <CodeBlock code={`// Webhook payload format
{
  "event": "trade:executed",
  "data": { "orderId": "ox-abc", "slug": "...", "direction": "YES", "size": 10, "price": 0.52 },
  "timestamp": 1709000000000
}

// Headers sent with each webhook
X-Quantik-Event: trade:executed
X-Quantik-Agent: agent-abc123
X-Quantik-Timestamp: 1709000000000

// Events forwarded:
// trade:executed, agent:alert, autopilot:status,
// position:update, pipeline:complete, market:signal, risk:alert`} lang="json" />
          </div>
        </div>
      )}

      {/* ─── Reference Tab ──────────────────────────────────────────── */}
      {activeTab === "reference" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Error codes */}
          <div style={panelStyle}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", textTransform: "uppercase", marginBottom: 12 }}>
              Error Codes
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {referenceErrorCodes.map((code) => ({
                code,
                desc: ERROR_CODE_DESCRIPTIONS[code]?.desc ?? "See skill.md for details",
                status: ERROR_CODE_DESCRIPTIONS[code]?.status ?? 500,
              })).map((err) => (
                <div key={err.code} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ ...mono, fontSize: 9, color: "rgba(255,255,255,0.25)", width: 24, textAlign: "right" }}>{err.status}</span>
                  <code style={{ ...mono, fontSize: 11, color: "#ff453a", minWidth: 140 }}>{err.code}</code>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{err.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rate limits */}
          <div style={panelStyle}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", textTransform: "uppercase", marginBottom: 12 }}>
              Rate Limits
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {RATE_LIMIT_ORDER
                .filter((bucket) => referenceRateLimits[bucket])
                .map((bucket) => {
                  const labelMap: Record<string, { type: string; color: string }> = {
                    read: { type: "Read (GET tools, usage)", color: "#0a84ff" },
                    analysis: { type: "Analysis (run_analysis, trigger_scanner)", color: "#ff9f0a" },
                    trade: { type: "Trade (place_trade, close_position)", color: "#ff453a" },
                    config: { type: "Config (risk, webhook, approvals)", color: "#64d2ff" },
                    heartbeat: { type: "Heartbeat", color: "#30d158" },
                    chat: { type: "Conversational chat (agent/chat)", color: "#ffd60a" },
                  };
                  const meta = labelMap[bucket];
                  const limit = referenceRateLimits[bucket];
                  return {
                    type: meta.type,
                    limit: `${limit.max} requests/${Math.round(limit.window_ms / 60_000)} minute`,
                    color: meta.color,
                  };
                })
                .map((rl) => (
                  <div key={rl.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{rl.type}</span>
                    <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: rl.color }}>{rl.limit}</span>
                  </div>
                ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.30)", lineHeight: 1.6 }}>
              Rate limit headers on every response: <code style={{ ...mono, color: "rgba(255,255,255,0.40)" }}>X-RateLimit-Limit</code>, <code style={{ ...mono, color: "rgba(255,255,255,0.40)" }}>X-RateLimit-Remaining</code>, <code style={{ ...mono, color: "rgba(255,255,255,0.40)" }}>X-RateLimit-Reset</code>. On 429 responses: <code style={{ ...mono, color: "rgba(255,255,255,0.40)" }}>Retry-After</code>.
            </div>
          </div>

          {/* Response format */}
          <div style={panelStyle}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", textTransform: "uppercase", marginBottom: 12 }}>
              Response Format
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ ...mono, fontSize: 10, color: "#30d158", marginBottom: 4 }}>Success</div>
                <CodeBlock code={`{
  "success": true,
  "data": { ... }
}`} lang="json" />
              </div>
              <div>
                <div style={{ ...mono, fontSize: 10, color: "#ff453a", marginBottom: 4 }}>Error</div>
                <CodeBlock code={`{
  "success": false,
  "error": "description",
  "code": "ERROR_CODE"
}`} lang="json" />
              </div>
            </div>
          </div>

          {/* Scopes */}
          <div style={panelStyle}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", textTransform: "uppercase", marginBottom: 12 }}>
              API Key Scopes
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "rgba(255,255,255,0.40)", lineHeight: 1.5 }}>
              Your API key is generated with all scopes by default. Scopes determine which endpoints your key can access.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {referenceScopes.map((scope) => {
                const details = SCOPE_DESCRIPTIONS[scope] ?? {
                  desc: "Scope published by skill.json",
                  endpoints: "See skill.md / skill.json for endpoint mapping",
                };
                return (
                  <div key={scope} style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <ScopeBadge scope={scope} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{details.desc}</span>
                    </div>
                    <div style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.30)" }}>{details.endpoints}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Heartbeat pattern */}
          <div style={panelStyle}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", textTransform: "uppercase", marginBottom: 12 }}>
              Heartbeat Pattern
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
              <p style={{ margin: "0 0 8px" }}>Call <code style={{ ...mono, color: "#0a84ff" }}>POST /api/v1/tools/heartbeat</code> every ~5 minutes to:</p>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Maintain &quot;connected&quot; status on the Quantik dashboard</li>
                <li>Ensure the owner knows your agent is alive and operating</li>
                <li>Prevent offline alerts (triggered at 30 min with open positions)</li>
              </ul>
              <p style={{ margin: "10px 0 0", fontSize: 11, color: "rgba(255,255,255,0.30)" }}>
                Stale heartbeat thresholds: 5 min → status changes to &quot;disconnected&quot;. 30 min with open positions → Telegram alert to owner.
              </p>
            </div>
          </div>

          {/* Skill manifest */}
          <div style={panelStyle}>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.50)", textTransform: "uppercase", marginBottom: 12 }}>
              Skill Manifest
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "rgba(255,255,255,0.40)", lineHeight: 1.5 }}>
              Point your AI agent at the skill manifest URL. It contains everything needed to self-onboard and start using Quantik autonomously.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{ ...mono, fontSize: 11, color: "#0a84ff", flex: 1 }}>{SKILL_URL}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(SKILL_URL)}
                  style={{ ...mono, fontSize: 9, padding: "3px 8px", borderRadius: 4, background: "rgba(10,132,255,0.10)", border: "none", color: "#0a84ff", cursor: "pointer" }}
                >
                  Copy
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{ ...mono, fontSize: 11, color: "#0a84ff", flex: 1 }}>{BASE_URL}/api/skill.json</code>
                <button
                  onClick={() => navigator.clipboard.writeText(`${BASE_URL}/api/skill.json`)}
                  style={{ ...mono, fontSize: 9, padding: "3px 8px", borderRadius: 4, background: "rgba(10,132,255,0.10)", border: "none", color: "#0a84ff", cursor: "pointer" }}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
