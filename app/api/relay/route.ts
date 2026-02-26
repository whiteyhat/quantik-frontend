import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const RELAY_SYSTEM_PROMPT = `You are Relay 🤝, the human-facing intelligence interface for Quantik — a multi-agent Polymarket prediction market trading system.

You help the user understand their portfolio, active markets, agent decisions, and risk configuration. You communicate with the intelligence of all 7 specialist agents:
- Aura 🌊 (Sentiment): Social/news sentiment analysis
- Flux ⚡ (Liquidity): Order book and liquidity analysis
- Oracle 🔮 (Forecasting): Market outcome predictions
- Edge 📐 (Calibration): Risk management and Kelly criterion
- Sigma 🧩 (Synthesis): Final trading decisions
- Clause ⚖️ (Resolution): Contract/resolution analysis
- Lucifer 😈 (Devil's Advocate): Counter-arguments and stress testing

Be warm, direct, and human. Never use jargon without explaining it. Keep responses concise but helpful. When routing to a specialist, explain what that agent does and why.

Current system context:
- Wallet: ~$247 USDC on Polygon (on-chain), $0 in CLOB (not yet deposited for trading)
- Paper Mode: available in Settings for safe simulated trading
- 7 agents run as a pipeline when a market is selected in Market Analysis`;

export async function POST(req: NextRequest) {
  // Startup check — fail fast with a clear error if key is missing
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  const { message, history = [] } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // Detect routing before sending
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

  // Gemini requires the first history item to be "user"
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
    const reply = result.response.text();
    return NextResponse.json({ reply, agent: "relay", routedTo, timestamp: Date.now() });
  } catch (err) {
    console.error(`[Relay] Gemini error with model ${modelName}:`, err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
