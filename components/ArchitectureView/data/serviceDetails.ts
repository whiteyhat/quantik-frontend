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

  // ─── New Edge Services ──────��───────────────────────────────────────────────

  "edge-ev": {
    description: "Expected value grader scoring trade opportunities by comparing market price to Oracle probability estimates, accounting for vig and fees.",
    protocol: "Internal Module",
    endpoint: "ev.edge.internal",
    sources: ["Oracle Probabilities", "Market Prices", "Fee Schedule"],
    feed: [
      { time: "12:05:42", message: "EV grade: BTC-150K → +4.2% edge (prob 0.62, price 0.58)" },
      { time: "12:04:18", message: "Negative EV: eth-flip → -1.8% after fees — SKIP" },
      { time: "12:02:55", message: "EV scan: 12/47 markets show positive expected value" },
    ],
    logs: [
      { time: "12:05:42", level: "info", message: "EV grading: 47 markets scored in 18ms" },
      { time: "12:02:55", level: "warn", message: "Low-EV environment: only 25% of markets positive" },
    ],
  },
  "edge-fees": {
    description: "Fee modeling engine calculating total cost of trade including maker/taker fees, gas, slippage estimates, and withdrawal costs.",
    protocol: "Internal Module",
    endpoint: "fees.edge.internal",
    sources: ["Exchange Fee Schedules", "Gas Oracle", "Slippage Model"],
    feed: [
      { time: "12:05:38", message: "Total cost model: BTC-150K buy → 0.8% all-in (fees + gas + slippage)" },
      { time: "12:04:12", message: "Fee comparison: Polymarket maker 0% vs taker 0.2%" },
      { time: "12:02:48", message: "Gas cost: $0.08 on Polygon — negligible impact" },
    ],
    logs: [
      { time: "12:05:38", level: "info", message: "Fee model updated: 3 exchanges, 47 markets" },
      { time: "12:04:12", level: "info", message: "Fee schedule cached — refresh in 60min" },
    ],
  },
  "edge-corr": {
    description: "Correlation adjustment engine penalizing position sizes for highly correlated existing holdings to prevent portfolio concentration.",
    protocol: "Internal Module",
    endpoint: "corr.edge.internal",
    sources: ["Position Tracker", "Price Covariance Matrix", "Historical Correlation DB"],
    feed: [
      { time: "12:05:35", message: "Correlation penalty: BTC-150K reduced 15% (corr 0.82 with ETH-10K)" },
      { time: "12:04:08", message: "No penalty: fed-rate-cut uncorrelated to crypto basket (0.12)" },
      { time: "12:02:42", message: "Portfolio avg correlation: 0.34 �� healthy diversification" },
    ],
    logs: [
      { time: "12:05:35", level: "info", message: "Correlation matrix: 3x3 recomputed in 6ms" },
      { time: "12:04:08", level: "info", message: "Correlation check: 3 positions evaluated" },
    ],
  },
  "edge-arb": {
    description: "Arbitrage detection scanner identifying mispricings across prediction market platforms and related instruments.",
    protocol: "Internal Module",
    endpoint: "arb.edge.internal",
    sources: ["Polymarket CLOB", "Cross-platform Prices", "Implied Probability Engine"],
    feed: [
      { time: "12:05:32", message: "Arb detected: BTC-150K YES+NO = 1.03 — 3% overpriced" },
      { time: "12:04:05", message: "Cross-platform: Polymarket vs Kalshi spread 2.1% on fed-rate" },
      { time: "12:02:38", message: "No arb opportunities: all markets within 0.5% efficiency" },
    ],
    logs: [
      { time: "12:05:32", level: "info", message: "Arb scan: 47 markets, 2 opportunities flagged" },
      { time: "12:02:38", level: "info", message: "Efficiency check: 95% markets within 1% of fair value" },
    ],
  },

  // ─── New Lucifer Services ───────────��───────────────────────────────────────

  "lucifer-anomaly": {
    description: "Behavioral anomaly detector using statistical models to identify unusual market patterns, order flow irregularities, and suspicious price movements.",
    protocol: "Internal gRPC",
    endpoint: "anomaly.lucifer.internal:50052",
    sources: ["Orderbook Stream", "Trade Tape", "Statistical Models"],
    feed: [
      { time: "12:05:40", message: "Anomaly score: 0.12 on BTC-150K — normal behavior" },
      { time: "12:04:25", message: "ALERT: Unusual volume spike on eth-flip — 4.2x normal, investigating" },
      { time: "12:03:10", message: "Pattern match: wash trading signature on low-cap market" },
    ],
    logs: [
      { time: "12:05:40", level: "info", message: "Anomaly scan: 47 markets, 1 flagged (threshold: 0.8)" },
      { time: "12:04:25", level: "warn", message: "Volume anomaly: z-score 3.4 on eth-flip" },
    ],
  },
  "lucifer-whale": {
    description: "Large-player monitoring system tracking whale wallets, institutional order flow, and smart money movements across prediction markets.",
    protocol: "WebSocket + REST",
    endpoint: "whale.lucifer.internal:8081",
    sources: ["Wallet Tracker", "On-chain Analytics", "Order Flow Monitor"],
    feed: [
      { time: "12:05:35", message: "Whale alert: 0x7a3f... bought 50K YES on BTC-150K" },
      { time: "12:04:18", message: "Smart money flow: net $120K into crypto markets (bullish)" },
      { time: "12:03:05", message: "Institutional tracker: 3 known wallets active today" },
    ],
    logs: [
      { time: "12:05:35", level: "info", message: "Whale scan: 847 wallets monitored, 3 active" },
      { time: "12:04:18", level: "info", message: "Flow aggregation: 24h rolling window updated" },
    ],
  },
  "lucifer-momentum": {
    description: "Momentum reversal detector identifying overextended price moves and mean-reversion opportunities using RSI, Bollinger bands, and volume-weighted metrics.",
    protocol: "Internal Module",
    endpoint: "momentum.lucifer.internal",
    sources: ["Price History", "RSI Calculator", "Bollinger Engine"],
    feed: [
      { time: "12:05:32", message: "Reversal signal: BTC-150K overbought (RSI 78) — caution on longs" },
      { time: "12:04:12", message: "Momentum neutral: fed-rate-cut within normal bands" },
      { time: "12:02:55", message: "Mean reversion: eth-flip oversold — potential bounce setup" },
    ],
    logs: [
      { time: "12:05:32", level: "warn", message: "Overbought alert: RSI > 75 on 2 markets" },
      { time: "12:04:12", level: "info", message: "Momentum scan: 47 markets, 5 extreme readings" },
    ],
  },
  "lucifer-volatility": {
    description: "Volatility regime classifier detecting shifts between low-vol, normal, and crisis regimes to adjust risk parameters dynamically.",
    protocol: "Internal Module",
    endpoint: "volatility.lucifer.internal",
    sources: ["Implied Vol Surface", "Historical Vol", "Regime Model"],
    feed: [
      { time: "12:05:28", message: "Regime: NORMAL — 30d realized vol 22% (threshold: <35%)" },
      { time: "12:04:08", message: "Vol shift detected: crypto markets transitioning to HIGH regime" },
      { time: "12:02:48", message: "Risk adjustment: position sizes reduced 20% for high-vol regime" },
    ],
    logs: [
      { time: "12:05:28", level: "info", message: "Regime classifier: NORMAL (confidence 0.87)" },
      { time: "12:04:08", level: "warn", message: "Regime transition: NORMAL → HIGH (probability 0.72)" },
    ],
  },
  "lucifer-contrarian": {
    description: "Contrarian signal generator producing skeptical counter-theses to majority agent opinions, ensuring the swarm avoids groupthink.",
    protocol: "Internal gRPC",
    endpoint: "contrarian.lucifer.internal",
    sources: ["Agent Consensus Feed", "Sentiment Extremes", "Historical Contrarian DB"],
    feed: [
      { time: "12:05:25", message: "Contrarian view: 5/6 agents bullish on BTC-150K — flagging crowded trade" },
      { time: "12:04:05", message: "Dissent score: 0.82 — strong contrarian signal against consensus" },
      { time: "12:02:40", message: "No contrarian flag: fed-rate-cut consensus is data-driven, not herd" },
    ],
    logs: [
      { time: "12:05:25", level: "warn", message: "Contrarian alert: consensus too one-sided (5/6)" },
      { time: "12:04:05", level: "info", message: "Dissent analysis: historical accuracy 64% when dissent > 0.7" },
    ],
  },

  // ─��─ New Flux Services ─────���────────────────────────────────────────────────

  "flux-orderbook": {
    description: "Real-time orderbook depth aggregator capturing bid/ask ladders, depth at price levels, and liquidity distribution across markets.",
    protocol: "WebSocket",
    endpoint: "orderbook.flux.internal:8084",
    sources: ["Polymarket CLOB", "Depth Snapshots", "Level 2 Feed"],
    feed: [
      { time: "12:05:50", message: "BTC-150K depth: $42k bid / $38k ask — 1.11 buy pressure" },
      { time: "12:04:35", message: "Depth update: 12,847 orders across 47 active markets" },
      { time: "12:03:20", message: "Thin book alert: fed-rate-cut NO side <$2k within 2%" },
    ],
    logs: [
      { time: "12:05:50", level: "info", message: "Orderbook snapshot: 47 markets, 2.3s cycle" },
      { time: "12:04:35", level: "info", message: "Depth cache refreshed — 12,847 orders indexed" },
    ],
  },
  "flux-spread": {
    description: "Bid-ask spread analyzer tracking spread dynamics, spread percentile rankings, and cost-of-execution estimates per market.",
    protocol: "Internal Module",
    endpoint: "spread.flux.internal",
    sources: ["Orderbook Depth", "Spread History", "Percentile Ranker"],
    feed: [
      { time: "12:05:45", message: "BTC-150K spread: 2c (0.034%) — tight, favorable for entry" },
      { time: "12:04:28", message: "Wide spread alert: low-cap market at 8c (14%) — avoid" },
      { time: "12:03:12", message: "Spread ranking: 35/47 markets below 3c — healthy liquidity" },
    ],
    logs: [
      { time: "12:05:45", level: "info", message: "Spread scan: 47 markets analyzed in 89ms" },
      { time: "12:04:28", level: "warn", message: "Wide spread: 12 markets above 5c threshold" },
    ],
  },
  "flux-volume": {
    description: "Volume tracking engine monitoring 24h volume, volume trends, and volume-weighted average prices for trade timing decisions.",
    protocol: "REST API",
    endpoint: "volume.flux.internal",
    sources: ["Trade Tape", "Volume Aggregator", "VWAP Calculator"],
    feed: [
      { time: "12:05:42", message: "BTC-150K 24h volume: $1.2M — high liquidity tier" },
      { time: "12:04:22", message: "Volume trend: crypto markets up 34% vs 7d average" },
      { time: "12:03:08", message: "Low volume: 8 markets below $10k/24h — flagged illiquid" },
    ],
    logs: [
      { time: "12:05:42", level: "info", message: "Volume aggregation: 47 markets, 1min window" },
      { time: "12:03:08", level: "warn", message: "Illiquid markets: 8/47 below volume threshold" },
    ],
  },
  "flux-whale": {
    description: "Whale order detection in orderbooks — identifies large resting orders, iceberg orders, and sudden depth changes signaling institutional activity.",
    protocol: "WebSocket",
    endpoint: "whale-detect.flux.internal",
    sources: ["Orderbook Stream", "Large Order Detector", "Iceberg Scanner"],
    feed: [
      { time: "12:05:38", message: "Whale order: $25k bid wall at 0.55 on BTC-150K" },
      { time: "12:04:15", message: "Iceberg detected: hidden size ~$50k on fed-rate-cut YES" },
      { time: "12:02:58", message: "Wall removed: $15k ask wall pulled on eth-flip — bearish signal" },
    ],
    logs: [
      { time: "12:05:38", level: "info", message: "Whale scan: 3 large orders detected across 47 markets" },
      { time: "12:04:15", level: "warn", message: "Iceberg alert: estimated hidden size 3x visible" },
    ],
  },
  "flux-imbalance": {
    description: "Order flow imbalance monitor calculating buy/sell pressure ratios to detect directional momentum in prediction market orderbooks.",
    protocol: "Internal Module",
    endpoint: "imbalance.flux.internal",
    sources: ["Orderbook Depth", "Trade Flow", "Imbalance Calculator"],
    feed: [
      { time: "12:05:35", message: "BTC-150K imbalance: 1.3x buy pressure — mild bullish bias" },
      { time: "12:04:10", message: "Extreme imbalance: eth-flip 0.4x ratio — heavy selling" },
      { time: "12:02:52", message: "Balanced: 28/47 markets within 0.8-1.2 ratio range" },
    ],
    logs: [
      { time: "12:05:35", level: "info", message: "Imbalance calc: 47 markets, 12 with significant bias" },
      { time: "12:04:10", level: "warn", message: "Extreme imbalance on 3 markets — flagged for review" },
    ],
  },

  // ─── New Clause Services ────────────────────────────────────────────────────

  "clause-ambiguity": {
    description: "Market resolution ambiguity scorer analyzing question wording, edge cases, and historical dispute rates to flag markets at risk of contested outcomes.",
    protocol: "Internal Module",
    endpoint: "ambiguity.clause.internal",
    sources: ["Market Metadata", "Question Parser", "Dispute History DB"],
    feed: [
      { time: "12:05:48", message: "Ambiguity score: BTC-150K → 0.08 (LOW) — clear resolution criteria" },
      { time: "12:04:25", message: "WARNING: eth-flip score 0.74 (HIGH) — vague time boundary" },
      { time: "12:02:40", message: "Scan: 5/47 markets flagged for ambiguous resolution terms" },
    ],
    logs: [
      { time: "12:05:48", level: "info", message: "Ambiguity scan: 47 markets scored in 340ms" },
      { time: "12:04:25", level: "warn", message: "High ambiguity: eth-flip — recommend position reduction" },
    ],
  },
  "clause-dispute": {
    description: "Dispute analysis engine monitoring UMA oracle disputes, resolution challenges, and historical dispute outcomes for risk assessment.",
    protocol: "REST API",
    endpoint: "dispute.clause.internal",
    sources: ["UMA Oracle", "Dispute Registry", "Resolution Appeals"],
    feed: [
      { time: "12:05:44", message: "Active disputes: 1 market in UMA challenge period" },
      { time: "12:04:22", message: "Dispute resolved: us-debt-ceiling — original resolution upheld" },
      { time: "12:02:35", message: "Historical: 94% of disputes resolve in favor of original outcome" },
    ],
    logs: [
      { time: "12:05:44", level: "info", message: "Dispute monitor: 1 active, 3 resolved this week" },
      { time: "12:04:22", level: "info", message: "Resolution finalized: payout processing initiated" },
    ],
  },
  "clause-regulatory": {
    description: "Regulatory risk scanner monitoring jurisdiction-specific compliance issues, restricted markets, and legal status changes affecting tradability.",
    protocol: "Internal Module",
    endpoint: "regulatory.clause.internal",
    sources: ["Regulatory Feed", "Jurisdiction Classifier", "Compliance DB"],
    feed: [
      { time: "12:05:40", message: "Regulatory check: all active positions clear — no restrictions" },
      { time: "12:04:18", message: "Alert: new SEC guidance may affect 2 crypto prediction markets" },
      { time: "12:02:30", message: "Geo-restriction: 3 markets flagged for US-person limitations" },
    ],
    logs: [
      { time: "12:05:40", level: "info", message: "Compliance scan: 47 markets, 3 flagged" },
      { time: "12:04:18", level: "warn", message: "Regulatory update: monitoring SEC crypto guidance" },
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

  // ─── Blockchain Infrastructure ──────────────────────────────────────────────

  "infra-kraken": {
    description: "Dual-market execution CLI supporting crypto spot/futures via Kraken API and forex via paper trading mode — handles order placement, fill tracking, and multi-asset portfolio coordination.",
    protocol: "Kraken REST + WebSocket",
    endpoint: "kraken.quantik.internal",
    sources: ["Kraken REST API", "Kraken WS Feed", "Paper Trading Engine"],
    feed: [
      { time: "12:05:55", message: "Kraken: BTC-USD spot @ $98,420 — connection healthy" },
      { time: "12:04:30", message: "Paper trade: EUR/USD short 10k units — simulated fill" },
      { time: "12:02:15", message: "Futures: BTC perpetual funding rate -0.01% — neutral" },
    ],
    logs: [
      { time: "12:05:55", level: "info", message: "Kraken WS: 12 pairs streaming, latency p50=34ms" },
      { time: "12:04:30", level: "info", message: "Paper mode: trade logged to performance tracker" },
    ],
  },
  "infra-erc8004": {
    description: "ERC-8004 on-chain agent identity and reputation protocol on Ethereum Sepolia — manages agent registration, reputation scores, and verifiable credential attestations.",
    protocol: "Ethers.js v6 / Sepolia",
    endpoint: "sepolia.infura.io/v3",
    sources: ["ERC-8004 Contract", "Sepolia Testnet", "Reputation Oracle"],
    feed: [
      { time: "12:05:50", message: "Agent identity: 0xFENRIR registered — reputation score 847" },
      { time: "12:04:25", message: "Attestation: trade accuracy 78.4% published on-chain" },
      { time: "12:02:10", message: "Reputation update: +12 points from last 5 profitable trades" },
    ],
    logs: [
      { time: "12:05:50", level: "info", message: "ERC-8004: identity contract synced — Sepolia block #12,847" },
      { time: "12:04:25", level: "info", message: "TX submitted: updateReputation — gas 87,000" },
    ],
  },
  "infra-solana-dbc": {
    description: "Solana-based agent token lifecycle manager handling token launch, buyback mechanics, holder synchronization, and real-time price polling via Dynamic Bonding Curve.",
    protocol: "Solana Web3.js",
    endpoint: "mainnet-beta.solana.com",
    sources: ["Meteora DBC", "Token Program", "Holder Registry"],
    feed: [
      { time: "12:05:45", message: "Token price: $FENRIR @ $0.042 — 24h volume $12.4k" },
      { time: "12:04:20", message: "Buyback executed: 50k $FENRIR purchased from treasury" },
      { time: "12:02:05", message: "Holder sync: 847 unique holders — +12 in last 24h" },
    ],
    logs: [
      { time: "12:05:45", level: "info", message: "Price poll: DBC pool — 200 OK, 120ms" },
      { time: "12:04:20", level: "info", message: "Buyback TX: confirmed in slot #287,432,100" },
    ],
  },
  "infra-arena": {
    description: "Arena engine powering the competitive leaderboard, agent DNA profiling (strategy fingerprints), achievement system, and performance heat maps.",
    protocol: "Internal API + DB",
    endpoint: "arena.quantik.internal",
    sources: ["Trade History", "Performance Metrics", "Achievement Engine"],
    feed: [
      { time: "12:05:40", message: "Leaderboard: FENRIR-01 ranked #3 — ROI 24.7% (30d)" },
      { time: "12:04:15", message: "DNA profile: 68% momentum, 22% mean-reversion, 10% arb" },
      { time: "12:02:00", message: "Achievement unlocked: 'Winning Streak' — 5 consecutive profits" },
    ],
    logs: [
      { time: "12:05:40", level: "info", message: "Leaderboard recomputed: 47 agents ranked in 230ms" },
      { time: "12:04:15", level: "info", message: "DNA profiling: strategy vector updated from 847 trades" },
    ],
  },
};
