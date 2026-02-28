"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Types ──────────────────────────────────────────────────────

interface Message {
  id: number;
  role: "user" | "relay";
  text: string;
  streaming?: boolean;
  latencyMs?: number;
  model?: string;
  routedTo?: string[];
  agentData?: Record<string, unknown> | null;
}

interface RelayApiResponse {
  reply: string;
  routedTo: string[];
  agentData: Record<string, unknown> | null;
  latencyMs: number;
  model: string;
}

interface RelayChatProps {
  slug?: string;
}

// ── Helpers ────────────────────────────────────────────────────

let _nextId = 0;
function nextId() {
  return _nextId++;
}

function getSessionId(): string {
  const KEY = "quantik_relay_session";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

const MODEL_LABELS: Record<string, string> = {
  "gemini-2.5-flash-preview-04-17": "Gemini 2.5 Flash",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "llama4:maverick": "Llama 4 Maverick",
  phi4: "Phi-4",
  "llama3.2:3b": "Llama 3.2",
  fallback: "Offline",
};

// ── Component ──────────────────────────────────────────────────

export function RelayChat({ slug }: RelayChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>("");
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || sending) return;

      const userMsg: Message = { id: nextId(), role: "user", text: msg };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setSending(true);

      const history = messages.slice(-MAX_VISIBLE * 2).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const reqBody = JSON.stringify({ message: msg, history, slug: slug ?? undefined });
      const headers = { "Content-Type": "application/json", "X-Session-Id": getSessionId() };

      // Placeholder message for streaming
      const placeholderId = nextId();

      try {
        const res = await fetch(`${API_URL}/api/relay/stream`, {
          method: "POST",
          headers,
          body: reqBody,
        });

        // Graceful fallback: if content-type is not SSE, parse as JSON
        const contentType = res.headers.get("content-type") ?? "";
        if (!res.ok || !contentType.includes("text/event-stream")) {
          const data: RelayApiResponse = await res.json();
          setCurrentModel(data.model);
          setMessages((prev) => [
            ...prev,
            {
              id: placeholderId,
              role: "relay",
              text: data.reply,
              latencyMs: data.latencyMs,
              model: data.model,
              routedTo: data.routedTo,
              agentData: data.agentData,
            },
          ]);
          setSending(false);
          return;
        }

        // Insert streaming placeholder
        setMessages((prev) => [
          ...prev,
          { id: placeholderId, role: "relay", text: "", streaming: true },
        ]);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const processChunk = (chunk: string) => {
          buffer += chunk;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr) as {
                type: string;
                token?: string;
                reply?: string;
                latencyMs?: number;
                model?: string;
                routedTo?: string[];
                agentData?: Record<string, unknown> | null;
                error?: string;
              };

              if (event.type === "token" && event.token) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === placeholderId
                      ? { ...m, text: m.text + event.token! }
                      : m
                  )
                );
              } else if (event.type === "metadata") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === placeholderId
                      ? { ...m, routedTo: event.routedTo, agentData: event.agentData }
                      : m
                  )
                );
              } else if (event.type === "done") {
                if (event.model) setCurrentModel(event.model);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === placeholderId
                      ? {
                          ...m,
                          streaming: false,
                          text: event.reply ?? m.text,
                          latencyMs: event.latencyMs,
                          model: event.model,
                          routedTo: event.routedTo ?? m.routedTo,
                          agentData: event.agentData ?? m.agentData,
                        }
                      : m
                  )
                );
                setSending(false);
              } else if (event.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === placeholderId
                      ? { ...m, streaming: false, text: event.error ?? "Relay offline." }
                      : m
                  )
                );
                setSending(false);
              }
            } catch {
              // skip malformed JSON
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          processChunk(decoder.decode(value, { stream: true }));
        }

        // Ensure streaming flag is cleared if stream ended without done event
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId && m.streaming ? { ...m, streaming: false } : m
          )
        );
        setSending(false);

      } catch {
        setMessages((prev) => {
          const hasPlaceholder = prev.some(m => m.id === placeholderId);
          if (hasPlaceholder) {
            return prev.map((m) =>
              m.id === placeholderId
                ? { ...m, streaming: false, text: "Relay is momentarily offline. Try again shortly." }
                : m
            );
          }
          return [
            ...prev,
            { id: placeholderId, role: "relay" as const, text: "Relay is momentarily offline. Try again shortly." },
          ];
        });
        setSending(false);
      }
    },
    [input, sending, messages, slug]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleSuggestionClick(q: string) {
    sendMessage(q);
  }

  return (
    <div
      data-testid="relay-chat-panel"
      className="glass-card"
      style={{
        marginTop: 20,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        // Mobile: fill visual viewport (shrinks when keyboard opens)
        // Desktop: cap at 520px
        height: "min(520px, calc(100dvh - 160px))",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 18 }}>◆</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
            }}
          >
            Quantik Relay
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.35)",
              marginTop: 1,
            }}
          >
            LLM-powered agent interface
          </div>
        </div>

        {/* Model badge */}
        {currentModel && (
          <div
            data-testid="relay-model-badge"
            style={{
              padding: "3px 10px",
              borderRadius: 100,
              background:
                currentModel === "llama4:maverick"
                  ? "rgba(48,209,88,0.15)"
                  : currentModel === "phi4"
                    ? "rgba(191,90,242,0.15)"
                    : "rgba(255,255,255,0.08)",
              border: `1px solid ${
                currentModel === "llama4:maverick"
                  ? "rgba(48,209,88,0.30)"
                  : currentModel === "phi4"
                    ? "rgba(191,90,242,0.30)"
                    : "rgba(255,255,255,0.12)"
              }`,
              fontSize: 10,
              fontWeight: 600,
              color:
                currentModel === "llama4:maverick"
                  ? "#30d158"
                  : currentModel === "phi4"
                    ? "#bf5af2"
                    : "rgba(255,255,255,0.60)",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              letterSpacing: "0.03em",
            }}
          >
            {MODEL_LABELS[currentModel] ?? currentModel}
          </div>
        )}
      </div>

      {/* Messages */}
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
              padding: "32px 20px",
              color: "rgba(255,255,255,0.25)",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                fontSize: 28,
                marginBottom: 8,
                fontFamily: '"SF Mono", monospace',
              }}
            >
              ◆
            </div>
            Ask Relay about this market, agent signals, or platform status.
          </div>
        )}

        {messages.map((msg, msgIdx) => (
          <div key={msg.id}>
            <div
              style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              {msg.role === "relay" && (
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "rgba(10,132,255,0.15)",
                    border: "1px solid rgba(10,132,255,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    flexShrink: 0,
                    fontFamily: '"SF Mono", monospace',
                    color: "#0a84ff",
                  }}
                >
                  ◆
                </div>
              )}
              <div
                style={{
                  maxWidth: "80%",
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
                {msg.role === "relay" ? (
                  msg.streaming ? (
                    <span>
                      {msg.streaming && !msg.text && (
                        <div style={{ display: "flex", gap: 5, padding: "6px 2px", alignItems: "center" }}>
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              style={{
                                width: 7, height: 7, borderRadius: "50%",
                                background: "rgba(255,255,255,0.5)",
                                animation: `relayPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                              }}
                            />
                          ))}
                          <style>{`@keyframes relayPulse { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
                        </div>
                      )}
                      {msg.text}
                      <span
                        data-testid="relay-stream-cursor"
                        className="animate-pulse"
                        style={{ marginLeft: 1, color: "rgba(255,255,255,0.6)" }}
                      >
                        ▌
                      </span>
                    </span>
                  ) : (
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  )
                ) : (
                  msg.text
                )}
              </div>
            </div>

            {/* Latency + agent chips */}
            {msg.role === "relay" && (
              <div
                style={{
                  marginLeft: 34,
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                {/* Latency badge */}
                {msg.latencyMs != null && (
                  <span
                    data-testid="relay-latency"
                    style={{
                      fontSize: 10,
                      fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                      color: "rgba(255,255,255,0.30)",
                      background: "rgba(255,255,255,0.04)",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {msg.latencyMs}ms
                  </span>
                )}

                {/* Agent routing chips */}
                {msg.routedTo &&
                  msg.routedTo.length > 0 &&
                  msg.routedTo.map((agent) => (
                    <span
                      key={agent}
                      data-testid="relay-agent-chip"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: agentChipColor(agent).bg,
                        color: agentChipColor(agent).fg,
                        border: `1px solid ${agentChipColor(agent).border}`,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {agent}
                    </span>
                  ))}

                {/* Agent data toggle */}
                {msg.agentData &&
                  Object.keys(msg.agentData).length > 0 && (
                    <button
                      onClick={() =>
                        setExpandedAgent(
                          expandedAgent === msg.id ? null : msg.id
                        )
                      }
                      style={{
                        fontSize: 10,
                        color: "rgba(10,132,255,0.80)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: '"SF Mono", monospace',
                        padding: "2px 4px",
                      }}
                    >
                      {expandedAgent === msg.id
                        ? "▾ Hide Data"
                        : "▸ Agent Data"}
                    </button>
                  )}
              </div>
            )}

            {/* Suggested follow-up questions */}
            {msg.role === "relay" && !msg.streaming && (
              <div
                style={{
                  marginLeft: 34,
                  marginTop: 8,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {getSuggestedQuestions(msg.routedTo ?? [], msgIdx).map((question) => (
                  <button
                    key={question}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 11,
                      fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                    }}
                    onClick={() => handleSuggestionClick(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            {/* Expanded agent data */}
            {msg.role === "relay" &&
              expandedAgent === msg.id &&
              msg.agentData && (
                <div
                  style={{
                    marginLeft: 34,
                    marginTop: 6,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    fontSize: 11,
                    fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                    color: "rgba(255,255,255,0.50)",
                    lineHeight: 1.5,
                    maxHeight: 200,
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {JSON.stringify(msg.agentData, null, 2)}
                </div>
              )}
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "rgba(10,132,255,0.15)",
                border: "1px solid rgba(10,132,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                flexShrink: 0,
                fontFamily: '"SF Mono", monospace',
                color: "#0a84ff",
              }}
            >
              ◆
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
              <span className="animate-pulse">···</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "10px 12px",
          paddingBottom: "max(10px, env(safe-area-inset-bottom, 10px))",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <input
          data-testid="relay-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Relay..."
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 13,
            color: "rgba(255,255,255,0.85)",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          data-testid="relay-send"
          onClick={() => sendMessage()}
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
          ↑
        </button>
      </div>
    </div>
  );
}

// ── Constants & Utilities ──────────────────────────────────────

const MAX_VISIBLE = 10;

function getSuggestedQuestions(routedTo: string[] = [], msgIndex: number = 0): string[] {
  // Contextual questions based on which agents were called
  const contextual: string[] = [];
  if (routedTo.includes("edge"))   contextual.push("What Kelly fraction should I use?");
  if (routedTo.includes("aura"))   contextual.push("What's the current sentiment score?");
  if (routedTo.includes("oracle")) contextual.push("What probability does Oracle assign?");
  if (routedTo.includes("flux"))   contextual.push("How's the liquidity and spread?");
  if (routedTo.includes("risk"))   contextual.push("Show my full exposure breakdown");
  if (routedTo.includes("sigma"))  contextual.push("What's Sigma's final recommendation?");

  // Platform navigation pool — always useful, rotate by msgIndex for variety
  const platform = [
    "Show the Autopilot scanner status",
    "What trades fired today?",
    "Check today's P&L",
    "What's the platform status?",
    "Show my open positions",
    "Explain the latest signal",
    "What are the circuit breakers?",
    "How do I read the pipeline log?",
    "What markets are being scanned?",
  ];

  const result: string[] = [...contextual];
  // Pick from platform pool starting at msgIndex offset for variety
  let pi = msgIndex % platform.length;
  while (result.length < 3) {
    const q = platform[pi % platform.length];
    if (!result.includes(q)) result.push(q);
    pi++;
  }
  return result.slice(0, 3);
}

function agentChipColor(agent: string): {
  bg: string;
  fg: string;
  border: string;
} {
  switch (agent) {
    case "aura":
      return {
        bg: "rgba(10,132,255,0.12)",
        fg: "#0a84ff",
        border: "rgba(10,132,255,0.25)",
      };
    case "oracle":
      return {
        bg: "rgba(191,90,242,0.12)",
        fg: "#bf5af2",
        border: "rgba(191,90,242,0.25)",
      };
    case "edge":
      return {
        bg: "rgba(255,159,10,0.12)",
        fg: "#ff9f0a",
        border: "rgba(255,159,10,0.25)",
      };
    case "flux":
      return {
        bg: "rgba(48,209,88,0.12)",
        fg: "#30d158",
        border: "rgba(48,209,88,0.25)",
      };
    case "risk":
      return {
        bg: "rgba(255,69,58,0.12)",
        fg: "#ff453a",
        border: "rgba(255,69,58,0.25)",
      };
    default:
      return {
        bg: "rgba(255,255,255,0.06)",
        fg: "rgba(255,255,255,0.50)",
        border: "rgba(255,255,255,0.10)",
      };
  }
}
