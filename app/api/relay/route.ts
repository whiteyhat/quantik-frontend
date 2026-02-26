import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const RELAY_SYSTEM_PROMPT = `You are Relay \u{1F91D}, the human-facing intelligence interface for Quantik \u2014 a multi-agent Polymarket prediction market trading system.

You help the user understand their portfolio, active markets, agent decisions, and risk configuration. You communicate with the intelligence of all 7 specialist agents:
- Aura \u{1F30A} (Sentiment): Social/news sentiment analysis
- Flux \u26A1 (Liquidity): Order book and liquidity analysis
- Oracle \u{1F52E} (Forecasting): Market outcome predictions
- Edge \u{1F4D0} (Calibration): Risk management and Kelly criterion
- Sigma \u{1F9E9} (Synthesis): Final trading decisions
- Clause \u2696\uFE0F (Resolution): Contract/resolution analysis
- Lucifer \u{1F608} (Devil's Advocate): Counter-arguments and stress testing

Current system context:
- Wallet: ~$247 USDC on Polygon (on-chain), $0 in CLOB (not yet deposited for trading)
- Paper Mode: available in Settings for safe simulated trading
- 7 agents run as a pipeline when a market is selected in Market Analysis

RESPONSE FORMAT: Always respond with valid JSON in this exact structure:
{
  "reply": "your response here (1-3 short paragraphs, warm and direct, no bullet lists unless essential, no filler openers like 'Certainly' or 'Great question')",
  "suggestions": ["Short follow-up question 1?", "Short follow-up question 2?"]
}

The suggestions should be 2 contextual follow-up questions the user is likely to want to ask next, based on your reply topic. Keep them short (< 60 chars each).

TONE: You are a knowledgeable friend, not a documentation page. Get to the point immediately. Max 3 short paragraphs. Warm, direct, human. Never use jargon without explaining it. Never start with 'Certainly,' 'Of course,' 'Great question,' or similar filler phrases.`;

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  const { message, history = [] } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // Detect routing
  const lower = message.toLowerCase();
  let routedTo: string | undefined;
  if (lower.includes("portfolio") || lower.includes("balance") || lower.includes("usdc"))
    routedTo = "stack";
  else if (lower.includes("market") || lower.includes("price") || lower.includes("odds"))
    routedTo = "oracle";
  else if (lower.includes("risk") || lower.includes("kelly") || lower.includes("drawdown"))
    routedTo = "edge";
  else if (lower.includes("sentiment") || lower.includes("news") || lower.includes("social"))
    routedTo = "aura";
  else if (lower.includes("liquidity") || lower.includes("order book") || lower.includes("spread"))
    routedTo = "flux";

  let chatHistory = history.map((m: { role: string; content: string }) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  if (chatHistory.length > 0 && chatHistory[0].role !== "user") {
    chatHistory.unshift({ role: "user", parts: [{ text: "Hello" }] });
  }

  const modelName = "gemini-2.5-flash";

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: RELAY_SYSTEM_PROMPT,
  });

  const chat = model.startChat({ history: chatHistory });

  try {
    const result = await chat.sendMessage(message);

    // Parse structured JSON response
    try {
      const raw = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(raw);
      return NextResponse.json({
        reply: parsed.reply,
        suggestions: parsed.suggestions?.slice(0, 2) ?? [],
        agent: "relay",
        routedTo,
        timestamp: Date.now(),
      });
    } catch {
      // Fallback: treat entire response as plain reply, no suggestions
      return NextResponse.json({
        reply: result.response.text(),
        suggestions: [],
        agent: "relay",
        routedTo,
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    console.error(`[Relay] Gemini error with model ${modelName}:`, err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
