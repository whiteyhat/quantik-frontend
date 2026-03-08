// ─── Agent Lore & Descriptions ──────────────────────────────────────────────
// Rich metadata for each agent, shown in the detail popup.

export interface AgentLore {
  title: string;
  description: string;
  personality: string[];
  specialty: string;
  pipelinePhase: string;
  pipelineStep: number;       // 1-7
  icon: string;
  activityText: {
    idle: string;
    running: string;
    done: string;
    error: string;
  };
}

export const AGENT_LORE: Record<string, AgentLore> = {
  aura: {
    title: "Sentiment Oracle",
    description:
      "AURA scans the pulse of social media, news feeds, and community sentiment in real-time. She reads the crowd's emotional state to detect fear, greed, and momentum shifts before they show up in price action.",
    personality: ["Empathic", "Intuitive", "Alert"],
    specialty: "Social sentiment & crowd psychology",
    pipelinePhase: "Parallel Phase 1",
    pipelineStep: 1,
    icon: "👁",
    activityText: {
      idle: "Monitoring social feeds passively, waiting for pipeline activation.",
      running: "Scanning Twitter, Reddit, Discord, and news APIs for sentiment signals.",
      done: "Sentiment analysis complete — crowd mood and momentum indicators locked in.",
      error: "Feed aggregation failed — API rate limits or connectivity issues detected.",
    },
  },

  flux: {
    title: "Liquidity Analyst",
    description:
      "FLUX dives deep into order books, volume flows, and liquidity depth. He maps where the money is moving, detects whale activity, and identifies thin markets where slippage could eat your edge.",
    personality: ["Analytical", "Precise", "Data-driven"],
    specialty: "Liquidity depth & volume flow analysis",
    pipelinePhase: "Parallel Phase 1",
    pipelineStep: 2,
    icon: "💧",
    activityText: {
      idle: "Watching order book depth and volume flow patterns.",
      running: "Analyzing liquidity pools, tracking volume spikes and whale orders.",
      done: "Liquidity map complete — volume patterns and depth analysis delivered.",
      error: "Order book data stream interrupted — exchange API timeout.",
    },
  },

  clause: {
    title: "Contract Auditor",
    description:
      "CLAUSE is the legal mind of the pipeline. She parses Polymarket resolution criteria, identifies ambiguous clauses, and flags contracts where the outcome could be disputed or misinterpreted.",
    personality: ["Meticulous", "Cautious", "Thorough"],
    specialty: "Resolution criteria & contract risk parsing",
    pipelinePhase: "Parallel Phase 1",
    pipelineStep: 3,
    icon: "📜",
    activityText: {
      idle: "Standing by, monitoring contract terms for changes.",
      running: "Parsing resolution criteria, checking for ambiguities and edge cases.",
      done: "Contract audit complete — resolution risk and clause analysis ready.",
      error: "Parse error — contract structure mismatch or undefined terms.",
    },
  },

  oracle: {
    title: "Probability Engine",
    description:
      "ORACLE is the mathematical core. He ingests all market data, runs Monte Carlo simulations, and computes calibrated probability estimates. His numbers are the foundation every downstream agent relies on.",
    personality: ["Mathematical", "Rigorous", "Objective"],
    specialty: "Probability computation & model calibration",
    pipelinePhase: "Sequential Step 4",
    pipelineStep: 4,
    icon: "🔮",
    activityText: {
      idle: "Models idle, awaiting parallel phase completion.",
      running: "Running Monte Carlo simulations, calibrating probability models.",
      done: "Probabilities computed — calibrated estimates delivered to EDGE.",
      error: "Model divergence — numerical instability or data feed corruption.",
    },
  },

  edge: {
    title: "Position Sizer",
    description:
      "EDGE calculates optimal position sizes using Kelly criterion and custom risk models. He weighs the probability edge against downside risk to determine exactly how much capital to deploy.",
    personality: ["Disciplined", "Risk-aware", "Decisive"],
    specialty: "Kelly criterion & risk-adjusted position sizing",
    pipelinePhase: "Sequential Step 5",
    pipelineStep: 5,
    icon: "⚖️",
    activityText: {
      idle: "Risk parameters loaded, awaiting Oracle's probability output.",
      running: "Computing Kelly fraction, running drawdown simulations.",
      done: "Position sized — risk-reward ratio and optimal stake calculated.",
      error: "Negative edge detected — no viable position size within risk limits.",
    },
  },

  lucifer: {
    title: "Devil's Advocate",
    description:
      "LUCIFER exists to break your thesis. He stress-tests every assumption, finds the holes in your logic, and plays devil's advocate so you don't walk into a trap. If he can't break it, the thesis is strong.",
    personality: ["Contrarian", "Ruthless", "Skeptical"],
    specialty: "Thesis stress-testing & contrarian analysis",
    pipelinePhase: "Sequential Step 6",
    pipelineStep: 6,
    icon: "😈",
    activityText: {
      idle: "Sharpening arguments, waiting for a thesis to tear apart.",
      running: "Stress-testing thesis from every angle, probing for weaknesses.",
      done: "Challenge complete — thesis either hardened or flagged with red flags.",
      error: "Logic failure — too many contradictions to reconcile.",
    },
  },

  sigma: {
    title: "Final Synthesizer",
    description:
      "SIGMA is the commander. He weighs every signal from all 6 agents, resolves conflicts, and renders the final GO/NO-GO decision. His word is the last before capital moves.",
    personality: ["Strategic", "Balanced", "Authoritative"],
    specialty: "Multi-signal synthesis & trade decision",
    pipelinePhase: "Final Step 7",
    pipelineStep: 7,
    icon: "Σ",
    activityText: {
      idle: "Awaiting all agent signals for final synthesis.",
      running: "Weighing all signals, resolving conflicts, computing final verdict.",
      done: "Verdict rendered — trade decision synthesized from all 7 agents.",
      error: "Synthesis failed — conflicting signals could not be reconciled.",
    },
  },
};

/** Get lore for an agent, returns undefined for non-agent rooms */
export function getAgentLore(agentKey: string): AgentLore | undefined {
  return AGENT_LORE[agentKey];
}

/** Room descriptions for non-agent rooms */
export const ROOM_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  hatchery: {
    title: "Command Center",
    description: "The HATCHERY is where new pipeline runs are spawned. Your main agent starts here and returns after each execution cycle.",
  },
  stack: {
    title: "Treasury Vault",
    description: "The STACK monitors live price feeds, tracks portfolio positions, and safeguards the capital allocation. Gold sparkles when prices update.",
  },
  victory: {
    title: "Execution Chamber",
    description: "The VICTORY room is where successful trades are celebrated. When all agents agree and a trade executes, confetti fills this room.",
  },
};
