// ─── Agent Dialogue Lines ──────────────────────────────────────────────────────
// Contextual speech bubble text for each agent, triggered by state changes.

export const AGENT_LINES: Record<string, {
  working: string[];
  done: string[];
  error: string[];
  idle: string[];
}> = {
  aura: {
    working: [
      "Scanning social feeds...",
      "Sentiment signals incoming...",
      "Reading the crowd...",
      "Twitter pulse detected...",
      "Aggregating opinions...",
      "Parsing Reddit threads...",
      "Discord chatter spiking...",
    ],
    done: ["Sentiment locked in.", "Social signal captured.", "Crowd mood: analyzed."],
    error: ["Feed timed out!", "Signal lost.", "API rate limited..."],
    idle: [
      "Watching the feeds...",
      "Quiet out there...",
      "Monitoring chatter...",
      "Any alpha today?",
      "Crowd is indecisive...",
      "Sentiment is neutral. Boring.",
      "Someone just posted a thread...",
      "Fear index looking stable.",
      "Hm, interesting narrative shift.",
      "Social volume is low today.",
      "Waiting for the next catalyst...",
      "Reddit is arguing again.",
      "CT is oddly quiet...",
      "Greed is creeping in.",
      "Everyone's bullish. Suspicious.",
      "I sense FUD forming...",
      "New influencer take incoming...",
      "Tracking a viral post...",
    ],
  },
  oracle: {
    working: [
      "Crunching market data...",
      "Computing probabilities...",
      "Fetching odds...",
      "Calibrating models...",
      "Running Monte Carlo...",
      "Bayesian update in progress...",
      "Normalizing distributions...",
    ],
    done: ["Probabilities computed.", "Odds are in.", "Market priced."],
    error: ["Data feed down!", "Model diverged.", "NaN detected..."],
    idle: [
      "Markets are restless...",
      "Watching the lines...",
      "Probability drift...",
      "Odds shifting...",
      "Recalibrating baseline...",
      "The models whisper...",
      "Priors need updating.",
      "Interesting variance spike.",
      "Expected value looks flat.",
      "Running background checks...",
      "Hmm, the numbers don't lie.",
      "68.2% confidence. Not enough.",
      "Price and probability diverging.",
      "Market is mispriced. Maybe.",
      "Double-checking my assumptions.",
      "Monte Carlo says hold...",
      "Posterior probability: updating.",
      "The math is beautiful today.",
    ],
  },
  flux: {
    working: [
      "Analyzing liquidity...",
      "Tracking volume flows...",
      "Order book scanning...",
      "Depth analysis running...",
      "Flow pattern detected...",
      "Whale movement spotted...",
      "Measuring bid-ask spread...",
    ],
    done: ["Volume mapped.", "Liquidity assessed.", "Flow analysis complete."],
    error: ["Volume spike error!", "Book depth lost.", "Flow interrupted."],
    idle: [
      "Watching the flow...",
      "Steady volume...",
      "Liquidity looks thin...",
      "Big order incoming?",
      "Order book is stacking up.",
      "Whale alert: nothing yet.",
      "Spread is widening...",
      "Volume dried up completely.",
      "Someone's accumulating quietly.",
      "The depth is asymmetric.",
      "Buy wall forming at support.",
      "Sell pressure building above.",
      "Market makers are asleep.",
      "Thin book. Dangerous territory.",
      "Flow just reversed direction.",
      "Tracking an unusual pattern...",
      "Volume profile looks healthy.",
      "Dark pool activity detected.",
    ],
  },
  clause: {
    working: [
      "Parsing contract terms...",
      "Resolution check...",
      "Clause analysis running...",
      "Verifying conditions...",
      "Scanning fine print...",
      "Cross-referencing precedents...",
      "Checking edge case triggers...",
    ],
    done: ["Terms verified.", "Contract parsed.", "Clauses clear."],
    error: ["Parse error!", "Ambiguous clause.", "Contract mismatch."],
    idle: [
      "Reviewing terms...",
      "All contracts valid...",
      "Standing by...",
      "Fine print check...",
      "This resolution criteria is clean.",
      "I found a loophole. Just kidding.",
      "Double-checking expiry dates.",
      "Resolution source: verified.",
      "No ambiguity in this one.",
      "Precedent analysis complete.",
      "The wording is crystal clear.",
      "These terms have a catch...",
      "Digging through contract history.",
      "One clause concerns me...",
      "All conditions are well-defined.",
      "I've seen worse contracts.",
      "Legal risk: minimal.",
      "Reading between the lines...",
    ],
  },
  edge: {
    working: [
      "Calculating risk...",
      "Edge computation...",
      "Kelly criterion running...",
      "Sizing the position...",
      "Risk-reward analysis...",
      "Drawdown simulation...",
      "Optimizing allocation...",
    ],
    done: ["Edge calculated.", "Risk assessed.", "Position sized."],
    error: ["Edge negative!", "Risk overflow.", "No viable size."],
    idle: [
      "Risk within bounds...",
      "Monitoring exposure...",
      "Edge is there...",
      "Numbers look good...",
      "Kelly says go small.",
      "Bankroll management is key.",
      "Portfolio heat: acceptable.",
      "Max drawdown scenario: stable.",
      "Position limits holding.",
      "Risk-reward ratio: favorable.",
      "Diversification check passed.",
      "Running stress tests...",
      "Volatility adjusted. All clear.",
      "One bad trade won't kill us.",
      "Conservative sizing today.",
      "The math favors patience.",
      "Correlation check: independent.",
      "Capital preservation first.",
    ],
  },
  lucifer: {
    working: [
      "Playing devil's advocate...",
      "Stress testing thesis...",
      "Contrarian check...",
      "Poking holes...",
      "Finding the flaws...",
      "Destroying your confidence...",
      "What if you're wrong?",
    ],
    done: ["Challenge complete.", "Thesis stress-tested.", "Contrarian pass."],
    error: ["Logic failure!", "Too many holes.", "Red flag raised."],
    idle: [
      "Sharpening my horns...",
      "Always watching...",
      "Trust but verify...",
      "What could go wrong?",
      "You're too confident.",
      "I see weakness in your thesis.",
      "The crowd is usually wrong.",
      "Have you considered the opposite?",
      "Overconfidence kills portfolios.",
      "Your bias is showing.",
      "I'll find the flaw. Always do.",
      "This feels like a trap...",
      "Nobody asked the hard question.",
      "What's the bear case here?",
      "I've seen this movie before.",
      "Everyone agrees? That's a red flag.",
      "The consensus is wrong again.",
      "Let me ruin your optimism...",
    ],
  },
  sigma: {
    working: [
      "Synthesizing all signals...",
      "Final decision logic...",
      "Weighing the evidence...",
      "Convergence check...",
      "Building consensus...",
      "Resolving signal conflicts...",
      "Rendering final verdict...",
    ],
    done: ["Decision rendered.", "Verdict is in.", "Signal synthesized."],
    error: ["Synthesis failed!", "No consensus.", "Conflicting signals."],
    idle: [
      "Awaiting signals...",
      "Ready to decide...",
      "All eyes on me...",
      "Patience...",
      "The final word is mine.",
      "Waiting for all agents to report.",
      "Balancing conflicting signals.",
      "Decision framework: loaded.",
      "I need more data before I act.",
      "The weight of responsibility...",
      "Every signal matters.",
      "One wrong call changes everything.",
      "Confidence threshold not met yet.",
      "Still processing. Don't rush me.",
      "The synthesis takes time.",
      "Almost ready. Almost.",
      "Seven voices. One decision.",
      "The pipeline awaits my word.",
    ],
  },
};

// Track last used index per agent+event to avoid immediate repeats
const lastUsedIndex: Record<string, number> = {};

/** Pick a random line for an agent + event type, avoiding immediate repeats */
export function getRandomLine(agentKey: string, event: "working" | "done" | "error" | "idle"): string | null {
  const lines = AGENT_LINES[agentKey]?.[event];
  if (!lines || lines.length === 0) return null;

  const key = `${agentKey}:${event}`;
  const lastIdx = lastUsedIndex[key] ?? -1;

  // Pick a different index than last time
  let idx: number;
  if (lines.length <= 1) {
    idx = 0;
  } else {
    do {
      idx = Math.floor(Math.random() * lines.length);
    } while (idx === lastIdx);
  }

  lastUsedIndex[key] = idx;
  return lines[idx];
}
