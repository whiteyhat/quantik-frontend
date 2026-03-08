"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useQuantikStore } from "@/store/useQuantikStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Dynamic intro based on agent personality
function getAgentIntro(name: string, personality: string, emoji: string): string {
  switch (personality) {
    case "guardian":
      return `${emoji} ${name} online. Capital preservation is my mandate. I'll keep your portfolio protected while we find edge. What would you like to review?`;
    case "adventurer":
      return `${emoji} ${name} reporting for duty. High-conviction setups are my bread and butter. Let's find some alpha. What are we looking at?`;
    default:
      return `${emoji} ${name} here \u2014 your personal trading agent on Quantik. Ask me about markets, portfolio, signals, or let me run analysis. Ready when you are.`;
  }
}

const FALLBACK_INTRO =
  "Hi \u{1F44B} \u2014 I'm the Quantik intelligence network. Create your agent in the Agent Factory to unlock personalized trading insights. Ask me anything about markets or trading.";

const FALLBACK_SUGGESTIONS = [
  ["What's my current PnL?", "Show active positions"],
  ["Any new signals?", "What's the risk status?"],
  ["Summarize recent trades", "Show top performing markets"],
  ["What did the agent decide?", "Any liquidation risks?"],
  ["How is autopilot performing?", "Show my portfolio breakdown"],
];

const QUICK_ACTIONS = [
  { label: "Portfolio", message: "What's my portfolio status?" },
  { label: "Signals", message: "Any new scanner signals?" },
  { label: "Risk", message: "What's my current risk status?" },
];

// Tool display names
const TOOL_LABELS: Record<string, string> = {
  get_portfolio: "Checking portfolio",
  get_risk_status: "Checking risk status",
  get_trade_history: "Fetching trade history",
  search_markets: "Searching markets",
  run_analysis: "Running analysis",
  place_trade: "Preparing trade",
  get_scanner_signals: "Checking signals",
};

interface ToolCall {
  tool: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

interface TradeConfirmation {
  slug: string;
  direction: string;
  size: number;
}

interface Message {
  id: number;
  role: "user" | "agent" | "tool";
  text: string;
  toolCall?: ToolCall;
  tradeConfirmation?: TradeConfirmation;
}

let _nextId = 0;
function nextId() {
  return _nextId++;
}

// ── Tool Call Bubble ─────────────────────────────────────────────

function ToolCallBubble({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const label = TOOL_LABELS[toolCall.tool] ?? toolCall.tool;

  return (
    <div style={{
      padding: "8px 12px",
      borderRadius: 10,
      background: "rgba(10,132,255,0.08)",
      border: "1px solid rgba(10,132,255,0.15)",
      fontSize: 12,
    }}>
      <div
        onClick={() => toolCall.result && setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          cursor: toolCall.result ? "pointer" : "default",
          color: "rgba(10,132,255,0.8)",
        }}
      >
        <span style={{ fontSize: 14 }}>{toolCall.result ? "\u2713" : "\u23F3"}</span>
        <span>{label}{!toolCall.result ? "\u2026" : ""}</span>
        {toolCall.result != null && (
          <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.6 }}>
            {expanded ? "\u25B2" : "\u25BC"}
          </span>
        )}
      </div>
      {expanded && toolCall.result != null && (
        <pre style={{
          marginTop: 6,
          padding: 8,
          borderRadius: 6,
          background: "rgba(0,0,0,0.3)",
          color: "rgba(255,255,255,0.6)",
          fontSize: 11,
          lineHeight: 1.4,
          overflow: "auto",
          maxHeight: 200,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {JSON.stringify(toolCall.result, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Trade Confirmation Bubble ────────────────────────────────────

function TradeConfirmationBubble({
  confirmation,
  onConfirm,
  onCancel,
}: {
  confirmation: TradeConfirmation;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{
      padding: "10px 12px",
      borderRadius: 10,
      background: "rgba(255,165,0,0.08)",
      border: "1px solid rgba(255,165,0,0.25)",
      fontSize: 12,
    }}>
      <div style={{ color: "rgba(255,165,0,0.9)", fontWeight: 600, marginBottom: 6 }}>
        Trade Confirmation Required
      </div>
      <div style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
        <div>{confirmation.direction} on <strong>{confirmation.slug}</strong></div>
        <div>Size: <strong>${confirmation.size} USDC</strong></div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={onConfirm}
          style={{
            padding: "6px 16px", borderRadius: 6, border: "none",
            background: "#0a84ff", color: "#fff", fontSize: 12,
            cursor: "pointer", fontWeight: 600,
          }}
        >
          Confirm Trade
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "6px 16px", borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "transparent", color: "rgba(255,255,255,0.6)",
            fontSize: 12, cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

interface RelayChatSidebarProps {
  open: boolean;
  onToggle: () => void;
  onFirstOpen?: () => void;
}

export function RelayChatSidebar({ open, onToggle, onFirstOpen }: RelayChatSidebarProps) {
  const myAgent = useQuantikStore((s) => s.myAgent);
  const agentName = myAgent?.name ?? "Relay";
  const agentEmoji = myAgent?.avatar_emoji ?? "\u{1F91D}";
  const agentPersonality = myAgent?.personality ?? "balanced";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasInjectedIntro, setHasInjectedIntro] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 320);
    }
  }, [open]);

  // Inject intro message on first open
  useEffect(() => {
    if (open && !hasInjectedIntro) {
      setHasInjectedIntro(true);
      onFirstOpen?.();
      const intro = myAgent
        ? getAgentIntro(agentName, agentPersonality, agentEmoji)
        : FALLBACK_INTRO;
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "agent", text: intro },
        ]);
      }, 400);
    }
  }, [open, hasInjectedIntro, onFirstOpen, myAgent, agentName, agentPersonality, agentEmoji]);

  const handleTradeConfirm = useCallback(async (confirmation: TradeConfirmation) => {
    try {
      const res = await fetch(`${API_URL}/api/trade/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: confirmation.slug,
          side: confirmation.direction === "YES" ? "buy" : "sell",
          price: 0.5,
          size: confirmation.size,
          marketSlug: confirmation.slug,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "agent",
          text: res.ok
            ? `Trade executed. Order ID: ${data.orderId ?? "pending"}`
            : `Trade failed: ${data.error ?? "Unknown error"}`,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "agent", text: "Trade execution failed. Check your connection." },
      ]);
    }
  }, []);

  const handleTradeCancel = useCallback(() => {
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "agent", text: "Trade cancelled." },
    ]);
  }, []);

  const sendMessageWithText = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: Message = { id: nextId(), role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSuggestions([]);
    setSending(true);

    const agentId = nextId();

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      // Use personalized agent chat if agent exists, otherwise fallback to relay
      const chatUrl = myAgent
        ? `${API_URL}/api/v1/agent/chat`
        : `${API_URL}/api/relay/stream`;

      const res = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        const replyText = errData.error || "The intelligence network is currently unreachable. Please try again.";
        setMessages((prev) => [...prev, { id: agentId, role: "agent", text: replyText }]);
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";
      const isStream = contentType.includes("text/event-stream") || contentType.includes("text/plain");

      if (isStream && res.body) {
        // Insert empty agent message immediately so it streams in
        setMessages((prev) => [...prev, { id: agentId, role: "agent", text: "" }]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") break;

            try {
              const parsed = JSON.parse(payload) as Record<string, unknown>;

              // Handle tool call event — show inline indicator
              if (parsed.type === "tool_call") {
                const toolId = nextId();
                setMessages((prev) => [
                  ...prev,
                  {
                    id: toolId,
                    role: "tool",
                    text: "",
                    toolCall: {
                      tool: parsed.tool as string,
                      args: parsed.args as Record<string, unknown>,
                    },
                  },
                ]);
                continue;
              }

              // Handle tool result — update existing tool message
              if (parsed.type === "tool_result") {
                const resultData = parsed.data as Record<string, unknown>;

                // Check for trade confirmation
                if (resultData?.action === "trade_confirmation_required") {
                  const confirmId = nextId();
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: confirmId,
                      role: "tool",
                      text: "",
                      tradeConfirmation: {
                        slug: resultData.slug as string,
                        direction: resultData.direction as string,
                        size: resultData.size as number,
                      },
                    },
                  ]);
                  continue;
                }

                // Update the last tool message with result data
                setMessages((prev) => {
                  const lastToolIdx = prev.findLastIndex(
                    (m) => m.role === "tool" && m.toolCall && !m.toolCall.result
                  );
                  if (lastToolIdx === -1) return prev;
                  const updated = [...prev];
                  updated[lastToolIdx] = {
                    ...updated[lastToolIdx],
                    toolCall: {
                      ...updated[lastToolIdx].toolCall!,
                      result: parsed.data,
                    },
                  };
                  return updated;
                });
                continue;
              }

              // Handle suggestions
              if (Array.isArray(parsed.suggestions)) {
                setSuggestions((parsed.suggestions as string[]).slice(0, 2));
                continue;
              }

              // Handle token streaming
              if (parsed.type === "token" || parsed.token || parsed.delta || parsed.text || parsed.content) {
                const token = (parsed.token ?? parsed.delta ?? parsed.text ?? parsed.content ?? "") as string;
                if (token) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === agentId ? { ...m, text: m.text + token } : m
                    )
                  );
                }
              }
            } catch {
              // Non-JSON payload — treat as raw token
              if (payload) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentId ? { ...m, text: m.text + payload } : m
                  )
                );
              }
            }
          }
        }
      } else {
        // Fallback: non-streaming JSON response
        const data = (await res.json()) as { reply?: string; message?: string; suggestions?: string[] };
        const replyText = data.reply ?? data.message ?? "Got it.";
        const replySuggestions = Array.isArray(data.suggestions) ? data.suggestions.slice(0, 2) : [];
        setMessages((prev) => [...prev, { id: agentId, role: "agent", text: replyText }]);
        setSuggestions(replySuggestions);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: agentId,
          role: "agent",
          text: `Unable to reach ${agentName}. Check your connection and try again.`,
        },
      ]);
      setSuggestions([]);
    } finally {
      setSending(false);
      setSuggestions((prev) => {
        if (prev.length > 0) return prev;
        const pool = FALLBACK_SUGGESTIONS[Math.floor(Math.random() * FALLBACK_SUGGESTIONS.length)];
        return pool;
      });
    }
  }, [sending, messages, myAgent, agentName]);

  const sendMessage = useCallback(() => {
    sendMessageWithText(input);
  }, [input, sendMessageWithText]);

  const handleSuggestionClick = useCallback((q: string) => {
    setSuggestions([]);
    setInput(q);
    setTimeout(() => sendMessageWithText(q), 50);
  }, [sendMessageWithText]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    /* Agent chat drawer */
    <div
      className="md:w-[320px] w-screen"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100dvh",
        zIndex: 60,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 300ms ease",
        background: "rgba(12,12,20,0.90)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Drawer header */}
      <div
        style={{
          padding: "20px 16px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 20 }}>{agentEmoji}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
            {agentName}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
            {myAgent ? `${agentPersonality.charAt(0).toUpperCase() + agentPersonality.slice(1)} Agent` : "Quantik Intelligence Network"}
          </div>
        </div>
        <button
          onClick={onToggle}
          style={{
            marginLeft: "auto",
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "rgba(255,255,255,0.50)",
            flexShrink: 0,
          }}
        >
          {"\u2715"}
        </button>
      </div>

      {/* Message thread */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 14px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "rgba(255,255,255,0.25)",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{agentEmoji}</div>
            <div>
              Ask {agentName} anything about your positions, market signals, or trading strategy.
            </div>
          </div>
        )}

        {messages.map((msg) => {
          // Tool call bubble
          if (msg.role === "tool" && msg.toolCall) {
            return (
              <div key={msg.id} style={{ paddingLeft: 36 }}>
                <ToolCallBubble toolCall={msg.toolCall} />
              </div>
            );
          }

          // Trade confirmation bubble
          if (msg.role === "tool" && msg.tradeConfirmation) {
            return (
              <div key={msg.id} style={{ paddingLeft: 36 }}>
                <TradeConfirmationBubble
                  confirmation={msg.tradeConfirmation}
                  onConfirm={() => handleTradeConfirm(msg.tradeConfirmation!)}
                  onCancel={handleTradeCancel}
                />
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              {msg.role === "agent" && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "rgba(10,132,255,0.15)",
                    border: "1px solid rgba(10,132,255,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {agentEmoji}
                </div>
              )}
              <div
                style={{
                  maxWidth: "75%",
                  padding: "9px 12px",
                  borderRadius:
                    msg.role === "user"
                      ? "14px 14px 4px 14px"
                      : "14px 14px 14px 4px",
                  background:
                    msg.role === "user"
                      ? "rgba(10,132,255,0.18)"
                      : "rgba(255,255,255,0.07)",
                  border: `1px solid ${
                    msg.role === "user"
                      ? "rgba(10,132,255,0.30)"
                      : "rgba(255,255,255,0.08)"
                  }`,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "rgba(255,255,255,0.85)",
                  wordBreak: "break-word",
                }}
              >
                {msg.role === "agent" ? (
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {sending && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(10,132,255,0.15)",
                border: "1px solid rgba(10,132,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {agentEmoji}
            </div>
            <div
              style={{
                padding: "9px 14px",
                borderRadius: "14px 14px 14px 4px",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 18,
                color: "rgba(255,255,255,0.40)",
                letterSpacing: 3,
              }}
            >
              <span className="animate-pulse">{"\u00B7\u00B7\u00B7"}</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion pills */}
      {suggestions.length > 0 && !sending && (
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap",
          padding: "8px 12px 0",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          {suggestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(q)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.65)",
                fontSize: 12,
                cursor: "pointer",
                transition: "all 200ms ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(10,132,255,0.40)";
                e.currentTarget.style.color = "#0a84ff";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                e.currentTarget.style.color = "rgba(255,255,255,0.65)";
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Quick action buttons */}
      {messages.length <= 1 && !sending && (
        <div style={{
          display: "flex", gap: 6, padding: "6px 12px 0",
          borderTop: suggestions.length > 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
        }}>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleSuggestionClick(action.message)}
              style={{
                flex: 1,
                padding: "8px 4px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.5)",
                fontSize: 11,
                cursor: "pointer",
                transition: "all 200ms ease",
                fontFamily: "inherit",
                textAlign: "center",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(10,132,255,0.30)";
                e.currentTarget.style.color = "rgba(10,132,255,0.8)";
                e.currentTarget.style.background = "rgba(10,132,255,0.06)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          flexShrink: 0,
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${agentName}\u2026`}
          rows={1}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 13,
            color: "rgba(255,255,255,0.85)",
            outline: "none",
            resize: "none",
            fontFamily: "inherit",
            lineHeight: 1.5,
            maxHeight: 100,
            overflowY: "auto",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "none",
            background:
              input.trim() && !sending ? "#0a84ff" : "rgba(255,255,255,0.08)",
            color:
              input.trim() && !sending ? "#fff" : "rgba(255,255,255,0.25)",
            cursor: input.trim() && !sending ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            transition: "all 200ms ease",
            flexShrink: 0,
          }}
        >
          {"\u2191"}
        </button>
      </div>
    </div>
  );
}
