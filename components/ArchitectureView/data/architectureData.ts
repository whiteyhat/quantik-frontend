import type { Node, Edge } from "@xyflow/react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MainNodeData {
  type: "main";
  emoji: string;
  label: string;
  code: string;
  status: string;
  [key: string]: unknown;
}

export interface SubAgentNodeData {
  type: "sub-agent";
  agentKey: string;
  emoji: string;
  label: string;
  role: string;
  accentColor: string;
  status: "idle" | "running" | "done" | "error";
  latencyMs?: number;
  [key: string]: unknown;
}

export interface ServiceNodeData {
  type: "service";
  label: string;
  icon: string;
  parentAgent: string;
  status: "connected" | "disconnected" | "streaming";
  [key: string]: unknown;
}

// ─── Agent Metadata ──────────────────────────────────────────────────────────

export const AGENT_META: Record<
  string,
  { emoji: string; label: string; role: string; color: string }
> = {
  aura: { emoji: "🔮", label: "Aura", role: "Sentiment Analysis", color: "#BF5AF2" },
  edge: { emoji: "⚡", label: "Edge", role: "Data Ingestion", color: "#FF9F0A" },
  oracle: { emoji: "🧿", label: "Oracle", role: "Probability Engine", color: "#007AFF" },
  lucifer: { emoji: "😈", label: "Lucifer", role: "Risk Veto Protocol", color: "#FF453A" },
  flux: { emoji: "🌊", label: "Flux", role: "Liquidity Router", color: "#30D158" },
  clause: { emoji: "📜", label: "Clause", role: "Smart Contracts", color: "#64D2FF" },
  sigma: { emoji: "🎯", label: "Sigma", role: "Final Decision", color: "#FFD60A" },
};

// ─── Service definitions per agent ───────────────────────────────────────────

export const SERVICES: Record<string, { id: string; label: string; icon: string }[]> = {
  aura: [
    { id: "aura-sentiment", label: "Sentiment Analyzer", icon: "📊" },
    { id: "aura-news", label: "News Scraper", icon: "📰" },
    { id: "aura-bloomberg", label: "Bloomberg Feed", icon: "💹" },
    { id: "aura-reuters", label: "Reuters API", icon: "🗞️" },
    { id: "aura-twitter", label: "Twitter Firehose", icon: "🐦" },
  ],
  edge: [
    { id: "edge-ingestion", label: "Data Ingestion", icon: "📥" },
    { id: "edge-onchain", label: "On-chain Indexer", icon: "⛓️" },
    { id: "edge-websockets", label: "WebSockets", icon: "🔌" },
    { id: "edge-rpc", label: "RPC Nodes", icon: "🖧" },
  ],
  oracle: [
    { id: "oracle-ensemble", label: "Ensemble Engine", icon: "🧠" },
    { id: "oracle-pattern", label: "Pattern Matcher", icon: "🔍" },
    { id: "oracle-llm", label: "LLM Engine", icon: "🤖" },
    { id: "oracle-vectordb", label: "Vector DB", icon: "💾" },
    { id: "oracle-historical", label: "Historical Models", icon: "📈" },
  ],
  lucifer: [
    { id: "lucifer-veto", label: "Risk Veto Protocol", icon: "🛡️" },
    { id: "lucifer-slippage", label: "Slippage Monitor", icon: "📉" },
    { id: "lucifer-wallet", label: "WDK Wallet", icon: "👛" },
    { id: "lucifer-bankroll", label: "Bankroll Guardian", icon: "🏦" },
    { id: "lucifer-exposure", label: "Exposure Limits", icon: "⚠️" },
  ],
  flux: [
    { id: "flux-router", label: "Liquidity Router", icon: "🔀" },
    { id: "flux-uniswap", label: "Uniswap V3", icon: "🦄" },
    { id: "flux-curve", label: "Curve Pools", icon: "〰️" },
    { id: "flux-1inch", label: "1inch Agg", icon: "🔗" },
  ],
  clause: [
    { id: "clause-contracts", label: "Smart Contracts", icon: "📝" },
    { id: "clause-solidity", label: "Solidity Verifier", icon: "✅" },
    { id: "clause-gas", label: "Gas Optimizer", icon: "⛽" },
  ],
  sigma: [
    { id: "sigma-statarb", label: "StatArb Core", icon: "📐" },
    { id: "sigma-meanrev", label: "Mean Reversion", icon: "↩️" },
    { id: "sigma-pairs", label: "Pairs Matrix", icon: "🔢" },
    { id: "sigma-zscore", label: "Z-Score Calc", icon: "📏" },
  ],
};

// ─── Layout helpers ──────────────────────────────────────────────────────────

const CENTER = { x: 600, y: 500 };
const AGENT_RADIUS = 300;
const SERVICE_RADIUS = 220;

// 7 agents arranged clockwise starting from top
const AGENT_ANGLES: Record<string, number> = {
  aura: -90,       // top
  oracle: -38,     // top-right
  flux: 14,        // right
  sigma: 65,       // bottom-right
  clause: 116,     // bottom
  lucifer: 167,    // bottom-left
  edge: 218,       // left
};

function polarToXY(cx: number, cy: number, angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

// ─── Build Nodes ─────────────────────────────────────────────────────────────

export function getInitialNodes(): Node[] {
  const nodes: Node[] = [];

  // Main agent node
  nodes.push({
    id: "fenrir",
    type: "agentNode",
    position: { x: CENTER.x - 90, y: CENTER.y - 90 },
    data: {
      type: "main",
      emoji: "🐺",
      label: "FENRIR-01",
      code: "Q-AGENT-X742",
      status: "active",
    } satisfies MainNodeData,
    draggable: true,
  });

  // Polymarket node (special, connected to multiple agents)
  nodes.push({
    id: "polymarket",
    type: "serviceNode",
    position: { x: CENTER.x - 60, y: CENTER.y - 350 },
    data: {
      type: "service",
      label: "Polymarket CLOB",
      icon: "🟣",
      parentAgent: "shared",
      status: "streaming",
    } satisfies ServiceNodeData,
    draggable: true,
  });

  // Sub-agent nodes + their service nodes
  for (const [agentKey, angle] of Object.entries(AGENT_ANGLES)) {
    const meta = AGENT_META[agentKey];
    const pos = polarToXY(CENTER.x, CENTER.y, angle, AGENT_RADIUS);

    nodes.push({
      id: agentKey,
      type: "subAgentNode",
      position: { x: pos.x - 70, y: pos.y - 50 },
      data: {
        type: "sub-agent",
        agentKey,
        emoji: meta.emoji,
        label: meta.label,
        role: meta.role,
        accentColor: meta.color,
        status: "idle",
      } satisfies SubAgentNodeData,
      draggable: true,
    });

    // Service nodes fanning out from agent
    const services = SERVICES[agentKey] || [];
    const fanSpread = Math.min(40, 120 / Math.max(services.length - 1, 1));
    const startAngle = angle - (fanSpread * (services.length - 1)) / 2;

    services.forEach((svc, i) => {
      const svcAngle = startAngle + i * fanSpread;
      const svcPos = polarToXY(pos.x, pos.y, svcAngle, SERVICE_RADIUS);

      nodes.push({
        id: svc.id,
        type: "serviceNode",
        position: { x: svcPos.x - 60, y: svcPos.y - 25 },
        data: {
          type: "service",
          label: svc.label,
          icon: svc.icon,
          parentAgent: agentKey,
          status: "connected",
        } satisfies ServiceNodeData,
        draggable: true,
      });
    });
  }

  return nodes;
}

// ─── Build Edges ─────────────────────────────────────────────────────────────

export function getInitialEdges(): Edge[] {
  const edges: Edge[] = [];

  // Main -> sub-agents
  for (const agentKey of Object.keys(AGENT_ANGLES)) {
    edges.push({
      id: `fenrir-${agentKey}`,
      source: "fenrir",
      target: agentKey,
      type: "animatedDataEdge",
      data: { intensity: "high" },
    });
  }

  // Sub-agents -> services
  for (const [agentKey, services] of Object.entries(SERVICES)) {
    for (const svc of services) {
      edges.push({
        id: `${agentKey}-${svc.id}`,
        source: agentKey,
        target: svc.id,
        type: "animatedDataEdge",
        data: { intensity: "low" },
      });
    }
  }

  // Polymarket connections (to edge and oracle)
  edges.push({
    id: "polymarket-edge",
    source: "polymarket",
    target: "edge",
    type: "animatedDataEdge",
    data: { intensity: "medium" },
  });
  edges.push({
    id: "polymarket-oracle",
    source: "polymarket",
    target: "oracle",
    type: "animatedDataEdge",
    data: { intensity: "medium" },
  });
  edges.push({
    id: "polymarket-sigma",
    source: "polymarket",
    target: "sigma",
    type: "animatedDataEdge",
    data: { intensity: "medium" },
  });

  return edges;
}

// ─── Service Detail Metadata ─────────────────────────────────────────────────

export interface ServiceDetailInfo {
  description: string;
  protocol: string;
  endpoint: string;
  sources: string[];
  feed: { time: string; message: string }[];
  logs: { time: string; level: "info" | "warn" | "error"; message: string }[];
}

export const SERVICE_DETAILS: Record<string, ServiceDetailInfo> = {
  "aura-sentiment": {
    description: "NLP-powered sentiment scoring engine processing 50k+ documents/day across financial news and social media.",
    protocol: "gRPC",
    endpoint: "sentiment.aura.internal:443",
    sources: ["Twitter/X Firehose", "Reddit r/polymarket", "Discord signals", "Telegram groups"],
    feed: [
      { time: "12:04:31", message: "Sentiment score +0.72 — bullish shift detected on BTC markets" },
      { time: "12:03:18", message: "Echo chamber alert: 89% positive bias in crypto Twitter" },
      { time: "12:01:45", message: "Contrarian signal: insider selling despite positive sentiment" },
      { time: "11:58:22", message: "News velocity spike: 3.2x normal for ETH-related topics" },
      { time: "11:55:09", message: "Sentiment neutral 0.02 on Fed rate markets" },
    ],
    logs: [
      { time: "12:04:31", level: "info", message: "Batch processed: 847 documents in 1.2s" },
      { time: "12:03:02", level: "warn", message: "Twitter rate limit approaching (89% quota)" },
      { time: "12:01:45", level: "info", message: "Model inference: BERT-sentiment v3.2 loaded" },
      { time: "11:58:22", level: "info", message: "Pipeline healthy — latency p99: 340ms" },
    ],
  },
  "aura-news": {
    description: "Real-time news aggregation and classification engine with entity extraction and event detection.",
    protocol: "WebSocket",
    endpoint: "news.aura.internal:8080",
    sources: ["AP News Wire", "Bloomberg Terminal", "CoinDesk", "The Block"],
    feed: [
      { time: "12:05:01", message: "Breaking: SEC announces new crypto ETF framework" },
      { time: "12:02:14", message: "Fed minutes signal potential rate pause in Q2" },
      { time: "11:59:33", message: "Polymarket volume surges on presidential debate markets" },
    ],
    logs: [
      { time: "12:05:01", level: "info", message: "New article classified: regulatory/crypto" },
      { time: "12:02:14", level: "info", message: "Entity extracted: Federal Reserve, interest rates" },
      { time: "11:58:00", level: "warn", message: "CoinDesk feed delayed by 12s" },
    ],
  },
  "aura-bloomberg": {
    description: "Bloomberg Terminal API integration for institutional-grade financial data and breaking news alerts.",
    protocol: "FIX 4.4",
    endpoint: "bbg-feed.aura.internal:9090",
    sources: ["Bloomberg Terminal API", "Bloomberg Market Data", "Bloomberg Intelligence"],
    feed: [
      { time: "12:04:55", message: "BCOM index update: +0.4% — commodities rally" },
      { time: "12:03:10", message: "Treasury yields: 10Y at 4.32%, down 3bps" },
      { time: "12:01:00", message: "Earnings alert: NVDA beats estimates by 12%" },
    ],
    logs: [
      { time: "12:04:55", level: "info", message: "Market data tick received: 2,341 instruments" },
      { time: "12:00:00", level: "info", message: "Session heartbeat OK — connection stable" },
    ],
  },
  "aura-reuters": {
    description: "Reuters Elektron feed for global macro news, FX rates, and geopolitical event detection.",
    protocol: "RSSL/OMM",
    endpoint: "reuters.aura.internal:14002",
    sources: ["Reuters Eikon", "Reuters Elektron", "Refinitiv Data Platform"],
    feed: [
      { time: "12:04:12", message: "EUR/USD: 1.0842 — ECB speech moving markets" },
      { time: "12:02:30", message: "Geopolitical risk index elevated: Middle East tensions" },
    ],
    logs: [
      { time: "12:04:12", level: "info", message: "FX tick processed: 12 currency pairs" },
      { time: "12:00:00", level: "info", message: "Feed subscription renewed — 847 RICs active" },
    ],
  },
  "aura-twitter": {
    description: "X/Twitter Firehose integration processing 100k+ tweets/hour for real-time sentiment and trend detection.",
    protocol: "Streaming API v2",
    endpoint: "x-stream.aura.internal:443",
    sources: ["X/Twitter Firehose", "Crypto Twitter KOLs", "Political commentators"],
    feed: [
      { time: "12:05:22", message: "Trending: #Bitcoin — 42k mentions in last hour" },
      { time: "12:03:45", message: "KOL alert: @CryptoWhale posted bearish thesis" },
      { time: "12:01:11", message: "Volume spike: Polymarket mentions up 280%" },
    ],
    logs: [
      { time: "12:05:22", level: "info", message: "Processed 12,847 tweets in batch window" },
      { time: "12:03:00", level: "warn", message: "Rate limit: 450/500 requests used this window" },
    ],
  },
  "edge-ingestion": {
    description: "Multi-source data ingestion pipeline with schema validation, deduplication, and normalization.",
    protocol: "Apache Kafka",
    endpoint: "kafka.edge.internal:9092",
    sources: ["Polymarket CLOB", "Binance WebSocket", "Coinbase Pro", "Uniswap Subgraph"],
    feed: [
      { time: "12:05:30", message: "Ingested 4,231 events from 8 sources in last minute" },
      { time: "12:04:15", message: "Schema validation: 99.97% pass rate" },
      { time: "12:03:00", message: "Dedup engine caught 23 duplicate orderbook events" },
    ],
    logs: [
      { time: "12:05:30", level: "info", message: "Kafka consumer lag: 12 messages (healthy)" },
      { time: "12:04:00", level: "info", message: "Partition rebalance complete — 6 partitions active" },
    ],
  },
  "edge-onchain": {
    description: "On-chain indexer tracking smart contract events, token transfers, and DeFi protocol state across EVM chains.",
    protocol: "GraphQL / Subgraph",
    endpoint: "indexer.edge.internal:8000",
    sources: ["Ethereum Mainnet", "Polygon", "The Graph Protocol", "Alchemy"],
    feed: [
      { time: "12:05:10", message: "Block #19,234,567 indexed — 142 relevant events" },
      { time: "12:04:22", message: "Large transfer detected: 500k USDC to Polymarket" },
      { time: "12:03:05", message: "Contract event: new market created on Polymarket CTF" },
    ],
    logs: [
      { time: "12:05:10", level: "info", message: "Block sync: head - 2 blocks (4s behind)" },
      { time: "12:02:00", level: "info", message: "Indexed 1,247 events across 3 chains" },
    ],
  },
  "edge-websockets": {
    description: "Persistent WebSocket connections to exchanges and prediction markets for real-time orderbook and trade data.",
    protocol: "WebSocket (wss://)",
    endpoint: "ws-pool.edge.internal:443",
    sources: ["Polymarket WS", "Binance WS", "Coinbase WS", "dYdX WS"],
    feed: [
      { time: "12:05:45", message: "Orderbook update: BTC-150K-JUN26 spread tightened to 2c" },
      { time: "12:05:12", message: "Trade: 5,000 YES @ 0.58 on fed-rate-cut-q2" },
      { time: "12:04:33", message: "Connection pool: 24/24 active, 0 reconnecting" },
    ],
    logs: [
      { time: "12:05:45", level: "info", message: "Messages/sec: 1,247 across 24 connections" },
      { time: "12:04:00", level: "info", message: "Heartbeat OK — all connections healthy" },
    ],
  },
  "edge-rpc": {
    description: "Load-balanced RPC node pool for blockchain state queries, gas estimation, and transaction submission.",
    protocol: "JSON-RPC 2.0",
    endpoint: "rpc-lb.edge.internal:8545",
    sources: ["Alchemy RPC", "Infura", "QuickNode", "Self-hosted Geth"],
    feed: [
      { time: "12:05:55", message: "Gas price: 12 gwei — optimal for transactions" },
      { time: "12:04:40", message: "RPC latency: p50=45ms, p99=120ms" },
      { time: "12:03:22", message: "Node rotation: switched primary to Alchemy" },
    ],
    logs: [
      { time: "12:05:55", level: "info", message: "RPC pool health: 4/4 nodes responding" },
      { time: "12:03:22", level: "warn", message: "QuickNode latency spike — rotating to backup" },
    ],
  },
  "oracle-ensemble": {
    description: "Ensemble ML engine combining multiple probability models with Bayesian weighting and confidence calibration.",
    protocol: "Internal gRPC",
    endpoint: "ensemble.oracle.internal:50051",
    sources: ["XGBoost Model", "Neural Network", "Bayesian Model", "Historical Baseline"],
    feed: [
      { time: "12:05:20", message: "BTC-150K: ensemble probability 0.62 (market: 0.58)" },
      { time: "12:04:08", message: "Model agreement: 4/4 bullish on fed-rate-cut" },
      { time: "12:03:15", message: "Calibration drift: -0.02 — within acceptable range" },
    ],
    logs: [
      { time: "12:05:20", level: "info", message: "Inference batch: 47 markets in 890ms" },
      { time: "12:04:00", level: "info", message: "Model weights updated — XGBoost: 0.35, NN: 0.30" },
    ],
  },
  "oracle-pattern": {
    description: "Historical pattern matcher identifying similar market conditions, resolution patterns, and price trajectories.",
    protocol: "REST API",
    endpoint: "patterns.oracle.internal:8080",
    sources: ["Historical Polymarket Data", "Metaculus Archive", "PredictIt History"],
    feed: [
      { time: "12:04:50", message: "Pattern match: 87% similar to 2024-Q3 Fed markets" },
      { time: "12:03:30", message: "Resolution pattern: 72% of similar markets resolved YES" },
    ],
    logs: [
      { time: "12:04:50", level: "info", message: "Pattern search: 12,847 historical markets scanned" },
      { time: "12:03:00", level: "info", message: "Index updated with 23 new resolved markets" },
    ],
  },
  "oracle-llm": {
    description: "Large Language Model reasoning engine for qualitative analysis, thesis generation, and news interpretation.",
    protocol: "REST / SSE",
    endpoint: "llm.oracle.internal:8090",
    sources: ["Claude API", "GPT-4 Turbo", "Gemini Pro", "Fine-tuned Llama"],
    feed: [
      { time: "12:05:15", message: "LLM thesis: BTC likely to break $150k based on ETF inflows" },
      { time: "12:04:02", message: "News reasoning: Fed speech dovish — supports rate cut" },
    ],
    logs: [
      { time: "12:05:15", level: "info", message: "Inference: Claude 3.5 — 2.1s latency, 847 tokens" },
      { time: "12:04:02", level: "info", message: "Consensus: 3/4 LLMs agree on bullish thesis" },
    ],
  },
  "oracle-vectordb": {
    description: "Vector database for semantic search across news articles, research papers, and historical market analysis.",
    protocol: "gRPC",
    endpoint: "vectors.oracle.internal:6334",
    sources: ["Pinecone", "Weaviate Cluster", "Embedded News Corpus"],
    feed: [
      { time: "12:04:45", message: "Similarity search: 23 relevant articles found (cosine > 0.85)" },
      { time: "12:03:20", message: "Index size: 2.4M vectors, 847k documents" },
    ],
    logs: [
      { time: "12:04:45", level: "info", message: "Query latency: 12ms for top-20 retrieval" },
      { time: "12:00:00", level: "info", message: "Nightly reindex complete — 12,847 new embeddings" },
    ],
  },
  "oracle-historical": {
    description: "Time-series database storing historical probability curves, volume profiles, and resolution outcomes.",
    protocol: "InfluxDB Line Protocol",
    endpoint: "tsdb.oracle.internal:8086",
    sources: ["InfluxDB Cluster", "Polymarket Archive", "Internal Trade History"],
    feed: [
      { time: "12:05:00", message: "Probability curve update: BTC-150K shifted +4% in 24h" },
      { time: "12:03:40", message: "Volume profile: unusual accumulation at 0.55-0.60 range" },
    ],
    logs: [
      { time: "12:05:00", level: "info", message: "Write batch: 4,231 data points in 45ms" },
      { time: "12:00:00", level: "info", message: "Retention policy: 90-day data — 12.4GB stored" },
    ],
  },
  "lucifer-veto": {
    description: "Risk veto protocol that can block trades failing stress tests, correlation checks, and drawdown limits.",
    protocol: "Internal RPC",
    endpoint: "veto.lucifer.internal:50052",
    sources: ["Risk Engine", "Correlation Matrix", "Drawdown Monitor"],
    feed: [
      { time: "12:05:40", message: "Trade approved: BTC-150K — passes all 7 risk checks" },
      { time: "12:04:25", message: "VETO: eth-flip-sol — correlation too high with existing positions" },
      { time: "12:03:10", message: "Stress test passed: portfolio VaR within limits" },
    ],
    logs: [
      { time: "12:05:40", level: "info", message: "Risk check: 7/7 passed in 23ms" },
      { time: "12:04:25", level: "warn", message: "Trade vetoed — reason: correlation_exceeded (0.87)" },
    ],
  },
  "lucifer-slippage": {
    description: "Real-time slippage monitor tracking execution quality, market impact, and orderbook depth.",
    protocol: "WebSocket",
    endpoint: "slippage.lucifer.internal:8081",
    sources: ["Orderbook Depth Monitor", "Execution Quality Tracker", "Market Impact Model"],
    feed: [
      { time: "12:05:35", message: "Estimated slippage: 0.3% for $500 order on BTC-150K" },
      { time: "12:04:18", message: "Market depth alert: thin liquidity on fed-rate-cut NO side" },
    ],
    logs: [
      { time: "12:05:35", level: "info", message: "Slippage model updated — 847 orderbook snapshots" },
      { time: "12:04:18", level: "warn", message: "Low depth alert: <$2k within 2% of mid" },
    ],
  },
  "lucifer-wallet": {
    description: "WDK wallet management for secure key storage, transaction signing, and balance monitoring.",
    protocol: "WDK SDK",
    endpoint: "wallet.lucifer.internal:443",
    sources: ["Hardware Security Module", "Multi-sig Controller", "Balance Tracker"],
    feed: [
      { time: "12:05:25", message: "Balance: 42,580.12 USDC | 125.5 POL" },
      { time: "12:04:10", message: "Transaction signed: approve USDC spend for Polymarket" },
    ],
    logs: [
      { time: "12:05:25", level: "info", message: "Balance sync complete — matches on-chain" },
      { time: "12:04:10", level: "info", message: "TX signed: 0x7a3f...2b1c (gas: 21,000)" },
    ],
  },
  "lucifer-bankroll": {
    description: "Bankroll management system enforcing Kelly criterion sizing, max exposure, and capital allocation rules.",
    protocol: "Internal API",
    endpoint: "bankroll.lucifer.internal:8082",
    sources: ["Kelly Calculator", "Exposure Monitor", "Capital Allocator"],
    feed: [
      { time: "12:05:18", message: "Kelly utilization: 42% — room for 2 more positions" },
      { time: "12:04:05", message: "Max position check: $500 within 20% capital limit" },
    ],
    logs: [
      { time: "12:05:18", level: "info", message: "Portfolio rebalance: optimal Kelly = 0.25x" },
      { time: "12:04:05", level: "info", message: "Capital allocation: 58% free, 42% deployed" },
    ],
  },
  "lucifer-exposure": {
    description: "Exposure limit engine tracking correlated positions, sector concentration, and tail risk scenarios.",
    protocol: "Internal API",
    endpoint: "exposure.lucifer.internal:8083",
    sources: ["Correlation Engine", "Sector Classifier", "Tail Risk Monitor"],
    feed: [
      { time: "12:05:12", message: "Total exposure: $3,240 across 3 positions (7.6% of capital)" },
      { time: "12:04:00", message: "Sector concentration: crypto 65%, macro 35%" },
    ],
    logs: [
      { time: "12:05:12", level: "info", message: "Exposure matrix updated — 3 active positions" },
      { time: "12:04:00", level: "info", message: "Tail risk VaR (99%): -$1,247 — within limits" },
    ],
  },
  "flux-router": {
    description: "Intelligent liquidity router finding optimal execution paths across DEXs and CEXs for minimal slippage.",
    protocol: "REST API",
    endpoint: "router.flux.internal:8084",
    sources: ["Uniswap V3", "Curve Finance", "1inch Aggregator", "0x Protocol"],
    feed: [
      { time: "12:05:50", message: "Optimal route: Polymarket CLOB direct — 0.1% slippage" },
      { time: "12:04:35", message: "Route comparison: 3 paths analyzed, best saves 0.4%" },
    ],
    logs: [
      { time: "12:05:50", level: "info", message: "Route optimization: 3 paths in 45ms" },
      { time: "12:04:35", level: "info", message: "Gas comparison: L1=$2.40, L2=$0.08" },
    ],
  },
  "flux-uniswap": {
    description: "Uniswap V3 integration for concentrated liquidity positions and token swaps on Ethereum and Polygon.",
    protocol: "Ethers.js / Contract ABI",
    endpoint: "uniswap.flux.internal:8085",
    sources: ["Uniswap V3 Router", "Uniswap Subgraph", "Pool Analytics"],
    feed: [
      { time: "12:05:42", message: "USDC/POL pool: TVL $12.4M, fee tier 0.3%" },
      { time: "12:04:28", message: "Price impact estimate: 0.02% for $500 swap" },
    ],
    logs: [
      { time: "12:05:42", level: "info", message: "Pool state synced — 247 active positions" },
      { time: "12:04:28", level: "info", message: "Quote: 500 USDC -> 1,247.5 POL" },
    ],
  },
  "flux-curve": {
    description: "Curve Finance integration for stablecoin swaps with minimal slippage via specialized AMM curves.",
    protocol: "Web3.js / Vyper ABI",
    endpoint: "curve.flux.internal:8086",
    sources: ["Curve 3pool", "Curve stETH", "Curve Factory Pools"],
    feed: [
      { time: "12:05:38", message: "3pool balance: USDC 33.2%, USDT 33.5%, DAI 33.3%" },
      { time: "12:04:20", message: "Stablecoin swap: 0.01% slippage for $10k trade" },
    ],
    logs: [
      { time: "12:05:38", level: "info", message: "Pool imbalance check: within 1% — healthy" },
      { time: "12:04:20", level: "info", message: "Gauge rewards: 2.4% APY on 3pool" },
    ],
  },
  "flux-1inch": {
    description: "1inch Aggregator for cross-DEX routing, finding the best swap rates across 200+ liquidity sources.",
    protocol: "REST API v5",
    endpoint: "1inch.flux.internal:8087",
    sources: ["1inch Fusion", "1inch Limit Orders", "1inch Aggregation Protocol"],
    feed: [
      { time: "12:05:32", message: "Best rate: USDC->MATIC via Uniswap+SushiSwap split" },
      { time: "12:04:15", message: "Gas savings: fusion mode saves 40% vs direct swap" },
    ],
    logs: [
      { time: "12:05:32", level: "info", message: "Route query: 247 sources checked in 120ms" },
      { time: "12:04:15", level: "info", message: "Fusion order submitted — waiting for resolver" },
    ],
  },
  "clause-contracts": {
    description: "Smart contract interaction layer for Polymarket CTF contracts, approvals, and position management.",
    protocol: "Ethers.js v6",
    endpoint: "contracts.clause.internal:8088",
    sources: ["Polymarket CTF Exchange", "ERC-1155 Tokens", "Conditional Tokens Framework"],
    feed: [
      { time: "12:05:48", message: "Contract call: buyOutcomeTokens — 500 USDC for YES tokens" },
      { time: "12:04:30", message: "Approval check: USDC allowance sufficient (unlimited)" },
      { time: "12:03:15", message: "Position query: 3 active conditional token positions" },
    ],
    logs: [
      { time: "12:05:48", level: "info", message: "TX submitted: 0x8b2f...4a1d — gas 142,000" },
      { time: "12:04:30", level: "info", message: "Allowance verified — no approval needed" },
    ],
  },
  "clause-solidity": {
    description: "Solidity contract verification ensuring interaction targets are verified, audited, and non-malicious.",
    protocol: "Etherscan API",
    endpoint: "verify.clause.internal:8089",
    sources: ["Etherscan Verified Contracts", "OpenZeppelin Audit DB", "DeFi Safety Scores"],
    feed: [
      { time: "12:05:44", message: "Contract verified: Polymarket CTF Exchange — audit score 95/100" },
      { time: "12:04:22", message: "Bytecode match: on-chain matches published source" },
    ],
    logs: [
      { time: "12:05:44", level: "info", message: "Verification cache hit — contract known safe" },
      { time: "12:04:22", level: "info", message: "ABI decoded: 12 public functions, 3 events" },
    ],
  },
  "clause-gas": {
    description: "Gas optimization engine for transaction batching, timing, and EIP-1559 fee estimation.",
    protocol: "Internal API",
    endpoint: "gas.clause.internal:8090",
    sources: ["Gas Oracle", "Flashbots Protect", "EIP-1559 Estimator"],
    feed: [
      { time: "12:05:52", message: "Current gas: base 12 gwei, priority 1.5 gwei — LOW" },
      { time: "12:04:38", message: "Optimal window: next 10 min (gas trending down)" },
    ],
    logs: [
      { time: "12:05:52", level: "info", message: "Gas forecast: 15% drop expected in next 30min" },
      { time: "12:04:38", level: "info", message: "Flashbots bundle: saves estimated 20% on gas" },
    ],
  },
  "sigma-statarb": {
    description: "Statistical arbitrage core engine identifying mispricings between correlated prediction markets.",
    protocol: "Internal gRPC",
    endpoint: "statarb.sigma.internal:50053",
    sources: ["Pair Correlation Matrix", "Cointegration Tests", "Spread Monitor"],
    feed: [
      { time: "12:05:58", message: "Arb opportunity: BTC-150K vs BTC-120K spread widened to 8%" },
      { time: "12:04:42", message: "Cointegration test: 3 market pairs meet threshold" },
    ],
    logs: [
      { time: "12:05:58", level: "info", message: "Scan complete: 1,247 pairs checked in 230ms" },
      { time: "12:04:42", level: "info", message: "Signal strength: 2.3 sigma — actionable" },
    ],
  },
  "sigma-meanrev": {
    description: "Mean reversion strategy engine detecting overbought/oversold conditions in prediction market probabilities.",
    protocol: "Internal API",
    endpoint: "meanrev.sigma.internal:8091",
    sources: ["Bollinger Bands", "RSI Calculator", "Volume-Weighted Mean"],
    feed: [
      { time: "12:05:54", message: "Oversold: fed-rate-cut dropped to 0.35 (mean: 0.52)" },
      { time: "12:04:38", message: "Reversion signal: 78% probability of bounce within 48h" },
    ],
    logs: [
      { time: "12:05:54", level: "info", message: "Mean calc: 30-day rolling avg = 0.52, current = 0.35" },
      { time: "12:04:38", level: "info", message: "Z-score: -2.1 — strong reversion signal" },
    ],
  },
  "sigma-pairs": {
    description: "Pairs matrix maintaining correlation coefficients between all active prediction markets.",
    protocol: "Internal API",
    endpoint: "pairs.sigma.internal:8092",
    sources: ["Price History DB", "Correlation Calculator", "Market Metadata"],
    feed: [
      { time: "12:05:46", message: "Matrix update: 47 markets, 1,081 pair correlations" },
      { time: "12:04:32", message: "High correlation: BTC-150K <> ETH-10K = 0.89" },
    ],
    logs: [
      { time: "12:05:46", level: "info", message: "Matrix recomputed: 47x47 in 120ms" },
      { time: "12:04:32", level: "info", message: "New pair detected: correlation > 0.8 threshold" },
    ],
  },
  "sigma-zscore": {
    description: "Z-score calculator for standardizing price movements and generating statistical trade signals.",
    protocol: "Internal API",
    endpoint: "zscore.sigma.internal:8093",
    sources: ["Price Normalizer", "Standard Deviation Engine", "Signal Threshold Config"],
    feed: [
      { time: "12:05:42", message: "Z-score alert: BTC-150K at +1.8 sigma — approaching overbought" },
      { time: "12:04:28", message: "Signal: fed-rate-cut at -2.1 sigma — strong buy zone" },
    ],
    logs: [
      { time: "12:05:42", level: "info", message: "Batch z-scores: 47 markets updated in 15ms" },
      { time: "12:04:28", level: "info", message: "Threshold breach: 2 markets above |2.0| sigma" },
    ],
  },
  "polymarket": {
    description: "Polymarket CLOB (Central Limit Order Book) — primary prediction market exchange for trading outcomes.",
    protocol: "REST + WebSocket",
    endpoint: "clob.polymarket.com",
    sources: ["Polymarket CLOB API", "Conditional Token Framework", "Polygon Network"],
    feed: [
      { time: "12:06:00", message: "BTC-150K: YES 0.58 / NO 0.42 | Vol: $2.4M 24h" },
      { time: "12:05:30", message: "New order: BUY 200 YES @ 0.57 — filled instantly" },
      { time: "12:05:00", message: "Market update: 847 active markets, $124M total volume" },
      { time: "12:04:30", message: "Liquidity event: $50k added to fed-rate-cut orderbook" },
    ],
    logs: [
      { time: "12:06:00", level: "info", message: "Orderbook sync: 12 markets, 2,341 orders" },
      { time: "12:05:30", level: "info", message: "Order executed: 200 YES @ 0.57 — 0 slippage" },
      { time: "12:05:00", level: "info", message: "WebSocket: 847 subscriptions active" },
    ],
  },
};
