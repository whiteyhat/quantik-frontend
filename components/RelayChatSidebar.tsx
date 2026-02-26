"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

const RELAY_INTRO =
  "Hi, I'm Relay \u{1F91D} \u2014 your interface to the Quantik intelligence network. Ask me anything about your portfolio, active markets, agent decisions, or risk config. I'm here to help.";

interface Message {
  id: number;
  role: "user" | "agent";
  text: string;
}

let _nextId = 0;
function nextId() {
  return _nextId++;
}

interface RelayChatSidebarProps {
  open: boolean;
  onToggle: () => void;
  onFirstOpen?: () => void;
}

export function RelayChatSidebar({ open, onToggle, onFirstOpen }: RelayChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasInjectedIntro, setHasInjectedIntro] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Inject intro message on first open
  useEffect(() => {
    if (open && !hasInjectedIntro) {
      setHasInjectedIntro(true);
      onFirstOpen?.();
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "agent", text: RELAY_INTRO },
        ]);
      }, 400);
    }
  }, [open, hasInjectedIntro, onFirstOpen]);

  const sendMessageWithText = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: Message = { id: nextId(), role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSuggestions([]); // Clear suggestions on any send
    setSending(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      let replyText: string;
      let replySuggestions: string[] = [];

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        replyText = errData.error || "The intelligence network is currently unreachable. Please try again.";
      } else {
        const data = (await res.json()) as { reply?: string; message?: string; suggestions?: string[] };
        replyText = data.reply ?? data.message ?? "Got it.";
        replySuggestions = Array.isArray(data.suggestions) ? data.suggestions.slice(0, 2) : [];
      }

      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "agent", text: replyText },
      ]);
      setSuggestions(replySuggestions);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "agent",
          text: "Unable to reach Relay. Check your connection and try again. \u{1F91D}",
        },
      ]);
      setSuggestions([]);
    } finally {
      setSending(false);
    }
  }, [sending, messages]);

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
    /* Relay drawer */
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
        <span style={{ fontSize: 20 }}>{"\u{1F91D}"}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
            Relay
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
            Quantik Intelligence Network
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
            <div style={{ fontSize: 28, marginBottom: 10 }}>{"\u{1F91D}"}</div>
            <div>
              Ask Relay anything about your positions, market signals, or trading strategy.
            </div>
          </div>
        )}

        {messages.map((msg) => (
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
                {"\u{1F91D}"}
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
        ))}

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
              {"\u{1F91D}"}
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Relay\u2026"
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
