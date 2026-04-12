// ─── Service Detail Metadata ─────────────────────────────────────────────────
// Extracted from architectureData.ts to reduce bundle size of the main layout module.

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
    description: "Agent wallet management for secure key storage, transaction signing, and balance monitoring.",
    protocol: "Agent SDK",
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

  // ─── New Agent Service Details ──────────────────────────────────────────────

  "aura-fred": {
    description: "Federal Reserve Economic Data (FRED) API integration pulling macro indicators — GDP, unemployment (UNRATE), CPI (CPIAUCSL), Fed Funds rate, and the T10Y2Y yield curve recession indicator.",
    protocol: "REST API",
    endpoint: "api.stlouisfed.org/fred",
    sources: ["FRED Series API", "Federal Reserve", "St. Louis Fed"],
    feed: [
      { time: "12:04:20", message: "UNRATE: 3.7% (unchanged) — labor market stable" },
      { time: "12:02:10", message: "T10Y2Y: -0.12 — yield curve still inverted (recession signal)" },
      { time: "12:00:05", message: "FEDFUNDS: 5.33% — last rate decision unchanged" },
      { time: "11:58:30", message: "CPIAUCSL: +0.2% MoM — inflation cooling trend" },
    ],
    logs: [
      { time: "12:04:20", level: "info", message: "FRED batch fetch: 4 series in 890ms" },
      { time: "12:00:05", level: "info", message: "Cache refreshed — 30min TTL on macro series" },
      { time: "11:55:00", level: "warn", message: "BLS series delayed — fallback to cached data" },
    ],
  },
  "aura-metaculus": {
    description: "Metaculus prediction aggregation engine sourcing crowd wisdom probabilities from 30k+ forecasters on geopolitical, scientific, and economic questions.",
    protocol: "REST API",
    endpoint: "metaculus.com/api2/questions",
    sources: ["Metaculus Community", "Metaculus AI", "Expert Forecaster Pool"],
    feed: [
      { time: "12:05:10", message: "Fed rate cut Q2: Metaculus 62% vs Polymarket 58% — 4% divergence" },
      { time: "12:03:45", message: "BTC $150k by Dec: Metaculus 41% — crowd less bullish than markets" },
      { time: "12:01:22", message: "US recession 2026: 28% community median — declining trend" },
    ],
    logs: [
      { time: "12:05:10", level: "info", message: "Fetched 47 relevant questions in 1.2s" },
      { time: "12:03:45", level: "info", message: "Cross-platform divergence: 3 markets above 3% threshold" },
    ],
  },
  "aura-coindesk": {
    description: "CoinDesk news API for real-time crypto industry news, regulatory updates, and market-moving events with sentiment tagging.",
    protocol: "REST API",
    endpoint: "api.coindesk.com/v1",
    sources: ["CoinDesk Editorial", "CoinDesk Research", "CoinDesk Data"],
    feed: [
      { time: "12:04:55", message: "Breaking: Major exchange announces Polymarket integration" },
      { time: "12:02:30", message: "Analysis: Stablecoin supply hits ATH — bullish for prediction markets" },
      { time: "12:00:15", message: "Regulatory: EU MiCA framework update — crypto-positive signals" },
    ],
    logs: [
      { time: "12:04:55", level: "info", message: "New article ingested — sentiment: positive (0.78)" },
      { time: "12:02:30", level: "info", message: "Batch processed: 12 articles in 340ms" },
    ],
  },
  "aura-guardian": {
    description: "The Guardian Open Platform API providing mainstream news coverage for geopolitical sentiment analysis and macro event detection.",
    protocol: "REST API",
    endpoint: "content.guardianapis.com",
    sources: ["Guardian World", "Guardian Business", "Guardian Politics"],
    feed: [
      { time: "12:04:40", message: "UK election polling shift: Labour +4pts — market implications" },
      { time: "12:02:18", message: "Climate summit update: new carbon credit framework proposed" },
      { time: "11:59:55", message: "Trade tensions: US-China tariff negotiations stall" },
    ],
    logs: [
      { time: "12:04:40", level: "info", message: "Guardian fetch: 23 articles, 8 market-relevant" },
      { time: "12:02:18", level: "info", message: "Entity extraction: 12 named entities across 8 articles" },
    ],
  },
  "aura-nyt": {
    description: "New York Times Article Search API for US-focused political, economic, and cultural news with deep entity extraction.",
    protocol: "REST API",
    endpoint: "api.nytimes.com/svc/search",
    sources: ["NYT Politics", "NYT Business", "NYT DealBook"],
    feed: [
      { time: "12:05:05", message: "Presidential approval poll: 48% — steady, no market catalyst" },
      { time: "12:03:10", message: "Fed Chair speech preview: market expects dovish tone" },
      { time: "12:01:00", message: "Tech regulation bill advances — crypto exemption included" },
    ],
    logs: [
      { time: "12:05:05", level: "info", message: "NYT search: 15 articles matching active market keywords" },
      { time: "12:01:00", level: "info", message: "Rate limit: 8/10 requests used this minute" },
    ],
  },
  "oracle-gemini": {
    description: "Gemini AI model pool (gemini-3.1-pro-preview, gemini-2.5-flash, gemini-3.1-flash-lite) for probabilistic reasoning, thesis generation, and market interpretation.",
    protocol: "REST API",
    endpoint: "generativelanguage.googleapis.com",
    sources: ["Gemini 3.1 Pro", "Gemini 2.5 Flash", "Gemini Flash Lite"],
    feed: [
      { time: "12:05:35", message: "Gemini Pro analysis: BTC-150K probability 0.64 based on ETF momentum" },
      { time: "12:04:10", message: "Flash inference: fed-rate-cut confidence HIGH — dovish language detected" },
      { time: "12:02:50", message: "Multi-model consensus: 3/3 models bullish on crypto markets" },
    ],
    logs: [
      { time: "12:05:35", level: "info", message: "Gemini Pro inference: 3.2s, 1,247 tokens output" },
      { time: "12:04:10", level: "info", message: "Flash inference: 890ms — used for latency-sensitive checks" },
      { time: "12:02:50", level: "info", message: "Token usage: 12,847/1M daily quota (1.3%)" },
    ],
  },
  "oracle-backtester": {
    description: "Historical analogue backtester that finds past markets with similar price patterns, volume profiles, and resolution timelines to validate current signals.",
    protocol: "Internal SQLite",
    endpoint: "backtester.oracle.internal",
    sources: ["Historical Polymarket Archive", "Resolution Database", "Price Trajectory Store"],
    feed: [
      { time: "12:05:20", message: "Backtest: BTC-150K matches 2024-Q3 pattern — 72% resolved YES" },
      { time: "12:03:40", message: "Analogue found: fed-rate-cut similar to Dec-2024 cycle — 68% hit" },
      { time: "12:01:15", message: "Signal validation: 4/5 current signals pass historical backtest" },
    ],
    logs: [
      { time: "12:05:20", level: "info", message: "Scanned 2,847 historical markets in 450ms" },
      { time: "12:03:40", level: "info", message: "Analogue confidence: 0.87 cosine similarity" },
    ],
  },
  "edge-kelly": {
    description: "Kelly Criterion calculator determining optimal fractional bet size based on estimated edge, bankroll, and win probability from the Oracle pipeline.",
    protocol: "Internal Module",
    endpoint: "kelly.edge.internal",
    sources: ["Oracle Probabilities", "Edge Estimates", "Bankroll State"],
    feed: [
      { time: "12:05:40", message: "Kelly fraction: 0.12 for BTC-150K (edge: +0.04, prob: 0.62)" },
      { time: "12:04:15", message: "Half-Kelly applied: $250 position (full Kelly would be $500)" },
      { time: "12:02:55", message: "Negative edge detected on eth-flip: Kelly = 0 — skip trade" },
    ],
    logs: [
      { time: "12:05:40", level: "info", message: "Kelly calc: 47 markets evaluated in 12ms" },
      { time: "12:02:55", level: "warn", message: "Zero-Kelly markets: 12 out of 47 (no edge)" },
    ],
  },
  "edge-position": {
    description: "Correlation-adjusted position sizer that applies portfolio-level constraints, correlation penalties, and max-exposure checks to Kelly-derived sizes.",
    protocol: "Internal Module",
    endpoint: "position.edge.internal",
    sources: ["Kelly Calculator", "Correlation Matrix", "Portfolio State"],
    feed: [
      { time: "12:05:38", message: "Position adjusted: BTC-150K reduced 15% (correlation with ETH-10K: 0.82)" },
      { time: "12:04:12", message: "Max position cap applied: $500 → $400 (20% portfolio limit)" },
      { time: "12:02:48", message: "No correlation penalty for fed-rate-cut (uncorrelated to crypto)" },
    ],
    logs: [
      { time: "12:05:38", level: "info", message: "Correlation penalty: -15% on 2 positions" },
      { time: "12:04:12", level: "warn", message: "Position cap triggered — approaching max exposure" },
    ],
  },
  "lucifer-circuit": {
    description: "Three-state circuit breaker (ARMED → WARNING → TRIGGERED) that halts all trading when portfolio drawdown exceeds thresholds. Auto-rearms after cooldown.",
    protocol: "Internal + DB",
    endpoint: "circuit.lucifer.internal",
    sources: ["Drawdown Monitor", "P&L Tracker", "Portfolio State"],
    feed: [
      { time: "12:05:45", message: "Circuit breaker: ARMED — drawdown 2.1% (threshold: 10%)" },
      { time: "12:04:20", message: "Health check: all 3 breakers green (daily, weekly, total)" },
      { time: "12:02:00", message: "Historical: last trigger was 14 days ago (5min cooldown)" },
    ],
    logs: [
      { time: "12:05:45", level: "info", message: "Circuit state: ARMED | drawdown: 2.1% | threshold: 10%" },
      { time: "12:04:20", level: "info", message: "Breaker health: daily=OK, weekly=OK, total=OK" },
    ],
  },
  "lucifer-correlation": {
    description: "Real-time portfolio correlation engine tracking pairwise position correlations to prevent concentration risk and correlated drawdowns.",
    protocol: "Internal Module",
    endpoint: "correlation.lucifer.internal",
    sources: ["Price Covariance Matrix", "Position Tracker", "Historical Correlation DB"],
    feed: [
      { time: "12:05:42", message: "Portfolio correlation heat: avg 0.34 — healthy diversification" },
      { time: "12:04:18", message: "Alert: BTC-150K + ETH-10K correlation 0.87 — flagged for review" },
      { time: "12:02:30", message: "Sector breakdown: crypto 58%, macro 30%, politics 12%" },
    ],
    logs: [
      { time: "12:05:42", level: "info", message: "Correlation matrix: 3x3 positions recomputed in 8ms" },
      { time: "12:04:18", level: "warn", message: "High correlation pair detected: threshold 0.80 exceeded" },
    ],
  },
  "clause-resolution": {
    description: "Polymarket resolution monitor polling the Gamma API for market resolution status, outcome reporting, and settlement triggers.",
    protocol: "REST API",
    endpoint: "gamma-api.polymarket.com",
    sources: ["Gamma Markets API", "Gamma Events API", "UMA Oracle"],
    feed: [
      { time: "12:05:50", message: "Resolution check: 3 markets within 48h of deadline" },
      { time: "12:04:25", message: "Market resolved: us-debt-ceiling → YES — settlement pending" },
      { time: "12:02:40", message: "Oracle dispute: 1 market flagged for extended resolution" },
    ],
    logs: [
      { time: "12:05:50", level: "info", message: "Resolution poll: 47 active markets checked in 1.1s" },
      { time: "12:04:25", level: "info", message: "Resolution event: payout triggered for 2 positions" },
    ],
  },
  "clause-deadline": {
    description: "Time-to-resolution urgency tracker scoring markets by proximity to resolution date, affecting position sizing and risk tolerance.",
    protocol: "Internal Module",
    endpoint: "deadline.clause.internal",
    sources: ["Market Metadata", "Resolution Calendar", "Urgency Scorer"],
    feed: [
      { time: "12:05:48", message: "Urgency: fed-rate-cut → 12 days (MEDIUM) — normal sizing" },
      { time: "12:04:22", message: "Warning: btc-100k-march → 2 days (CRITICAL) — reduce exposure" },
      { time: "12:02:35", message: "Calendar: 8 markets resolving this week, 23 this month" },
    ],
    logs: [
      { time: "12:05:48", level: "info", message: "Urgency scores: 47 markets — 3 critical, 8 high" },
      { time: "12:04:22", level: "warn", message: "Critical deadline: position sizing reduced by 50%" },
    ],
  },
  "sigma-consensus": {
    description: "Multi-agent consensus aggregator that collects all 6 upstream agent recommendations and synthesizes a unified TRADE/HOLD/SKIP decision with confidence scores.",
    protocol: "Internal gRPC",
    endpoint: "consensus.sigma.internal",
    sources: ["Aura Output", "Flux Output", "Clause Output", "Oracle Output", "Edge Output", "Lucifer Output"],
    feed: [
      { time: "12:05:55", message: "Consensus: 5/6 agents BULLISH on BTC-150K — high confidence" },
      { time: "12:04:30", message: "Split decision: 3 TRADE / 2 HOLD / 1 VETO on eth-flip" },
      { time: "12:02:45", message: "Unanimous: all 6 agents SKIP on low-liquidity market" },
    ],
    logs: [
      { time: "12:05:55", level: "info", message: "Consensus computed: 47 markets in 230ms" },
      { time: "12:04:30", level: "warn", message: "Split decision — Lucifer VETO overrides majority" },
    ],
  },
  "sigma-execution": {
    description: "Bridge from Sigma's TRADE recommendation to the execution engine — handles order routing, timing, and confirmation before final trade placement.",
    protocol: "Internal API",
    endpoint: "exec-bridge.sigma.internal",
    sources: ["Sigma Decision Engine", "Trade Execution Service", "Order Router"],
    feed: [
      { time: "12:05:58", message: "Trade routed: BUY 200 YES @ 0.58 on BTC-150K → execution engine" },
      { time: "12:04:35", message: "Execution confirmed: order filled in 1.2s, 0.1% slippage" },
      { time: "12:02:50", message: "Trade skipped: eth-flip — Lucifer veto in effect" },
    ],
    logs: [
      { time: "12:05:58", level: "info", message: "Order routed to execution engine — awaiting fill" },
      { time: "12:04:35", level: "info", message: "Fill confirmed: 200 YES @ 0.58 — P&L tracking started" },
    ],
  },
  "flux-depth": {
    description: "Orderbook depth and imbalance analyzer measuring buy/sell pressure ratios, depth at price levels, and spread dynamics for liquidity assessment.",
    protocol: "Polymarket CLI",
    endpoint: "depth.flux.internal",
    sources: ["Polymarket Orderbook", "CLOB Depth Snapshots", "Imbalance Calculator"],
    feed: [
      { time: "12:05:52", message: "BTC-150K depth: $42k bid / $38k ask — 1.11 buy pressure ratio" },
      { time: "12:04:28", message: "Imbalance alert: fed-rate-cut sell-heavy (0.7 ratio) — thin bids" },
      { time: "12:02:15", message: "Spread analysis: 12 markets below 2c spread — healthy liquidity" },
    ],
    logs: [
      { time: "12:05:52", level: "info", message: "Depth snapshot: 47 markets, 12,847 orders analyzed" },
      { time: "12:04:28", level: "warn", message: "Low buy-side depth on 3 markets — sizing adjusted" },
    ],
  },

  // ─── Infrastructure Node Details ────────────────────────────────────────────

  "infra-telegram": {
    description: "Telegram Bot API integration for real-time trade alerts, position updates, and system notifications with inline keyboard actions.",
    protocol: "Telegram Bot API",
    endpoint: "api.telegram.org/bot",
    sources: ["Trade Events", "Alert Engine", "System Monitor"],
    feed: [
      { time: "12:05:30", message: "Alert sent: BTC-150K BUY 200 YES @ 0.58 — confirmed" },
      { time: "12:03:15", message: "Position update: P&L +$42.50 on fed-rate-cut (unrealized)" },
      { time: "12:01:00", message: "System alert: Autopilot scan completed — 2 opportunities" },
    ],
    logs: [
      { time: "12:05:30", level: "info", message: "Telegram message sent: chat_id OK, 200ms latency" },
      { time: "12:03:15", level: "info", message: "Inline keyboard rendered: 3 action buttons" },
    ],
  },
  "infra-scanner": {
    description: "BullMQ-scheduled market scanner running 5-minute cycles to discover trading opportunities, score markets, and feed the autopilot decision engine.",
    protocol: "BullMQ Scheduler",
    endpoint: "scanner.quantik.internal",
    sources: ["Polymarket Gamma API", "Pipeline Engine", "Market Cache"],
    feed: [
      { time: "12:05:00", message: "Scan cycle #2,847: 124 markets scanned, 3 opportunities found" },
      { time: "12:00:00", message: "Hot scan: real-time price update for 47 watched markets" },
      { time: "11:55:00", message: "Opportunity: BTC-150K edge +4% — queued for autopilot review" },
    ],
    logs: [
      { time: "12:05:00", level: "info", message: "Scanner cycle: 124 markets in 4.2s (5min cadence)" },
      { time: "12:00:00", level: "info", message: "Hot scanner: 47 markets updated in 1.1s (60s cadence)" },
    ],
  },
  "infra-autopilot": {
    description: "Autonomous trading policy engine that evaluates scanner results against configurable rules — cadence, cooldown, max trades/day, and position sizing envelope.",
    protocol: "Internal Policy Engine",
    endpoint: "autopilot.quantik.internal",
    sources: ["Scanner Results", "Autopilot Policy Config", "Trade History"],
    feed: [
      { time: "12:05:05", message: "Autopilot: APPROVED trade on BTC-150K (policy: 3/5 daily trades)" },
      { time: "12:04:00", message: "Cooldown active: next trade eligible in 14 minutes" },
      { time: "12:02:30", message: "Policy check: position size $250 within $500 max envelope" },
    ],
    logs: [
      { time: "12:05:05", level: "info", message: "Autopilot decision: TRADE — all policy checks passed" },
      { time: "12:04:00", level: "info", message: "Cooldown timer: 14min remaining (30min window)" },
    ],
  },
  "infra-byo-mcp": {
    description: "MCP (Model Context Protocol) tool server exposing 21+ Quantik tools to external BYO agents — read, trade, analysis, config, heartbeat, arena, and chat capabilities.",
    protocol: "MCP / HMAC-SHA256",
    endpoint: "mcp.quantik.internal",
    sources: ["Tool Manifest", "API Key Scope", "Webhook Bridge"],
    feed: [
      { time: "12:05:15", message: "BYO agent connected: agent-ext-001 — heartbeat OK" },
      { time: "12:03:50", message: "Tool call: read_market_data(btc-150k) — 200 OK, 45ms" },
      { time: "12:01:20", message: "Webhook delivered: trade_executed event → agent-ext-001" },
    ],
    logs: [
      { time: "12:05:15", level: "info", message: "BYO health: 1/1 agents connected, 0 circuit breaks" },
      { time: "12:03:50", level: "info", message: "Tool call: read scope — rate limit 58/100 per min" },
    ],
  },
  "infra-database": {
    description: "Dual-mode database layer — SQLite (local development) or PostgreSQL (production) storing pipeline runs, trades, risk configs, agent health, and market cache.",
    protocol: "SQLite / PostgreSQL",
    endpoint: "db.quantik.internal",
    sources: ["better-sqlite3", "pg Driver", "Migration Engine"],
    feed: [
      { time: "12:05:25", message: "Write: pipeline_run #4,231 — 7 agent steps logged" },
      { time: "12:04:10", message: "Query: 847 trades fetched for performance panel (12ms)" },
      { time: "12:02:45", message: "Cache refresh: markets_cache updated — 124 markets" },
    ],
    logs: [
      { time: "12:05:25", level: "info", message: "DB write: pipeline_runs + 7 steps in single transaction" },
      { time: "12:04:10", level: "info", message: "Query perf: trades SELECT in 12ms (indexed)" },
      { time: "12:00:00", level: "info", message: "Cache TTL: markets_cache refreshed (10min cycle)" },
    ],
  },
  "infra-redis": {
    description: "Redis (Upstash) for in-memory caching, BullMQ job queues (scanner, orchestrator, alerts), rate limiting, and real-time state coordination.",
    protocol: "Redis / IORedis",
    endpoint: "upstash.redis.internal",
    sources: ["Upstash Redis", "BullMQ Workers", "Rate Limiter"],
    feed: [
      { time: "12:05:20", message: "Jobs: scanner(active), orchestrator(waiting), alerts(idle)" },
      { time: "12:04:05", message: "Rate limit: 892/1000 requests this window — healthy" },
      { time: "12:02:30", message: "Cache hit: market_data key — saved 1.2s API call" },
    ],
    logs: [
      { time: "12:05:20", level: "info", message: "BullMQ: 3 queues active, 0 failed jobs" },
      { time: "12:04:05", level: "info", message: "Redis memory: 12.4MB used / 256MB limit" },
    ],
  },
  "infra-sentry": {
    description: "Sentry error monitoring with webhook integration for real-time error alerts, performance tracking, and issue aggregation across the Quantik backend.",
    protocol: "Sentry SDK + Webhook",
    endpoint: "sentry.io/quantik",
    sources: ["Sentry SDK", "Webhook Events", "Error Aggregator"],
    feed: [
      { time: "12:05:10", message: "Status: 0 unresolved errors in last 24h — system healthy" },
      { time: "12:03:30", message: "Performance: p95 API latency 340ms — within SLA" },
      { time: "12:01:45", message: "Issue resolved: rate-limit timeout on CoinDesk API (auto-retry)" },
    ],
    logs: [
      { time: "12:05:10", level: "info", message: "Sentry health: 0 errors, 2 warnings in 24h window" },
      { time: "12:01:45", level: "info", message: "Auto-resolved: CoinDesk timeout — retry succeeded" },
    ],
  },
  "infra-trade-exec": {
    description: "Trade execution engine supporting paper mode (simulated fills) and live Polymarket CLOB orders with slippage monitoring and fill confirmation.",
    protocol: "Polymarket CLI + REST",
    endpoint: "exec.quantik.internal",
    sources: ["Polymarket CLI", "Paper Trading Engine", "Fill Monitor"],
    feed: [
      { time: "12:05:55", message: "LIVE: BUY 200 YES @ 0.58 on BTC-150K — filled, 0.1% slippage" },
      { time: "12:04:30", message: "Paper trade: simulated SELL 100 NO @ 0.42 — logged P&L" },
      { time: "12:02:15", message: "Execution log: 3 trades today, avg fill time 1.4s" },
    ],
    logs: [
      { time: "12:05:55", level: "info", message: "Order filled: 200 YES @ 0.58 — confirmation stored" },
      { time: "12:04:30", level: "info", message: "Paper mode: trade simulated at mid-price (0 slippage)" },
    ],
  },
  "infra-socketio": {
    description: "Socket.IO real-time event bus delivering position updates, price ticks, agent alerts, and autopilot status to authenticated frontend clients.",
    protocol: "Socket.IO / WebSocket",
    endpoint: "ws.quantik.internal",
    sources: ["Position Engine", "Price Feed", "Agent Pipeline", "Autopilot"],
    feed: [
      { time: "12:05:45", message: "Emit: position_update — 3 active positions refreshed" },
      { time: "12:04:20", message: "Emit: agent_alert — pipeline complete, 7 agents done" },
      { time: "12:02:50", message: "Emit: price_update — 47 markets, batch tick" },
    ],
    logs: [
      { time: "12:05:45", level: "info", message: "Socket.IO: 1 client connected, 7 event types active" },
      { time: "12:04:20", level: "info", message: "Event emitted: agent_alert to room user_xxx" },
    ],
  },
  "infra-wallet": {
    description: "HD wallet generator and manager for Polygon — handles key generation, encrypted storage (AES-256-GCM), balance tracking, and USDC/CTF approvals.",
    protocol: "Ethers.js v6",
    endpoint: "wallet.quantik.internal",
    sources: ["HD Wallet Generator", "Polygon RPC", "AES-256-GCM Vault"],
    feed: [
      { time: "12:05:35", message: "Balance sync: 42,580.12 USDC | 125.5 POL — on-chain match" },
      { time: "12:04:15", message: "Approval check: USDC spending unlimited — no action needed" },
      { time: "12:02:40", message: "Key status: encrypted at rest, decrypted in-memory only" },
    ],
    logs: [
      { time: "12:05:35", level: "info", message: "Balance query: 2 tokens in 89ms (Polygon RPC)" },
      { time: "12:04:15", level: "info", message: "Approval verified: CTF Exchange allowance OK" },
    ],
  },
  "infra-gemini": {
    description: "Gemini AI model gateway routing requests across gemini-3.1-pro-preview, gemini-2.5-flash, and gemini-3.1-flash-lite for agent reasoning, chat, and analysis.",
    protocol: "REST API",
    endpoint: "generativelanguage.googleapis.com",
    sources: ["Gemini 3.1 Pro", "Gemini 2.5 Flash", "Gemini Flash Lite"],
    feed: [
      { time: "12:05:40", message: "Model pool: 3/3 models available — routing by latency tier" },
      { time: "12:04:10", message: "Pro request: Oracle reasoning — 3.1s, 1,247 tokens" },
      { time: "12:02:25", message: "Flash request: Lucifer risk check — 890ms, 342 tokens" },
    ],
    logs: [
      { time: "12:05:40", level: "info", message: "Gemini pool health: all models responding <5s" },
      { time: "12:04:10", level: "info", message: "Daily usage: 12,847 / 1,000,000 tokens (1.3%)" },
    ],
  },
  "infra-clerk": {
    description: "Clerk authentication middleware managing user sessions, JWT validation, and API key authentication for both frontend and BYO agent access.",
    protocol: "Clerk SDK / JWT",
    endpoint: "clerk.quantik.internal",
    sources: ["Clerk Dashboard", "JWT Validator", "Session Manager"],
    feed: [
      { time: "12:05:25", message: "Session active: user authenticated via Clerk — JWT valid" },
      { time: "12:04:00", message: "API key auth: BYO agent request validated — scoped access" },
      { time: "12:02:10", message: "Token refresh: JWT renewed — 15min expiry window" },
    ],
    logs: [
      { time: "12:05:25", level: "info", message: "Auth check: JWT valid, user session active" },
      { time: "12:04:00", level: "info", message: "API key: HMAC verified — scope: read,trade" },
    ],
  },
};
