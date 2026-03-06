"use client";

import {
  type AuraResult,
  type OracleResult,
  type EdgeResult,
  type ClauseResult,
  type FluxResult,
  type LuciferResult,
} from "@/lib/api";

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/* ── Shared sub-components ─────────────────────────────────────────────────── */

// Strip lightweight markdown for plain display (no external lib needed)
function stripMd(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/^[-*+]\s/gm, "• ")
    .trim();
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        display: "block",
        marginBottom: 4,
      }}
    >
      {children}
    </span>
  );
}

function Metric({ value, color, size = 14 }: { value: string; color?: string; size?: number }) {
  return (
    <span
      className="font-mono-data"
      style={{ fontSize: size, fontWeight: 700, color: color ?? "var(--text-primary)" }}
    >
      {value}
    </span>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 8,
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </span>
  );
}

function Row({ children, gap = 16 }: { children: React.ReactNode; gap?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap, flexWrap: "wrap" }}>
      {children}
    </div>
  );
}

function Section({ children, mb = 14 }: { children: React.ReactNode; mb?: number }) {
  return <div style={{ marginBottom: mb }}>{children}</div>;
}

/* ── Aura Panel ────────────────────────────────────────────────────────────── */

export function AuraPanel({ data }: { data: AuraResult }) {
  const score = num(data.sentiment_score);
  const isPositive = score >= 0;
  const barWidth = Math.min(Math.abs(score) * 100, 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Sentiment delta bar */}
      <Section>
        <Label>Sentiment Delta</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: "rgba(255,255,255,0.06)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                [isPositive ? "left" : "right"]: "50%",
                width: `${barWidth / 2}%`,
                height: "100%",
                borderRadius: 4,
                background: isPositive ? "var(--ios-green)" : "var(--ios-red)",
                transition: "width 300ms ease",
              }}
            />
          </div>
          <Metric
            value={`${isPositive ? "+" : ""}${score.toFixed(2)}`}
            color={isPositive ? "var(--ios-green)" : "var(--ios-red)"}
          />
        </div>
      </Section>

      {/* Echo chamber */}
      <Section>
        <Row>
          <div>
            <Label>Echo Chamber</Label>
            <Chip
              label={data.echo_chamber ? "WARNING" : "CLEAR"}
              color={data.echo_chamber ? "var(--ios-orange)" : "var(--ios-green)"}
            />
          </div>
          {data.echo_chamber_strength !== undefined && (
            <div>
              <Label>Echo Strength</Label>
              <Metric value={`${num(data.echo_chamber_strength).toFixed(2)}`} color="var(--ios-orange)" />
            </div>
          )}
        </Row>
      </Section>

      {/* News source pills */}
      {data.newsArticles && data.newsArticles.length > 0 && (
        <Section mb={0}>
          <Label>Sentiment Sources</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
            {data.newsArticles.map((article, i) => (
              <a
                key={i}
                href={article.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  textDecoration: "none",
                  cursor: article.url ? "pointer" : "default",
                }}
                onMouseEnter={(e) => {
                  if (article.url) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(10,132,255,0.10)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)";
                }}
              >
                {article.source && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "var(--ios-blue)",
                    background: "rgba(10,132,255,0.12)", border: "1px solid rgba(10,132,255,0.20)",
                    padding: "1px 7px", borderRadius: 6, whiteSpace: "nowrap",
                    fontFamily: '"SF Mono","JetBrains Mono",monospace', flexShrink: 0,
                  }}>
                    {article.source}
                  </span>
                )}
                <span style={{
                  fontSize: 12, color: "rgba(255,255,255,0.70)", lineHeight: 1.4,
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                }}>
                  {article.title}
                </span>
                {article.url && (
                  <span style={{ fontSize: 11, color: "rgba(10,132,255,0.60)", flexShrink: 0 }}>↗</span>
                )}
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ── Oracle Panel ──────────────────────────────────────────────────────────── */

export function OraclePanel({ data }: { data: OracleResult }) {
  const prob = num(data.prob_estimate);
  const market = num(data.market_implied);
  const edgeDelta = prob - market;
  const conf = num(data.confidence);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Model P(YES) vs Market */}
      <Section>
        <Row gap={24}>
          <div>
            <Label>Model P(YES)</Label>
            <Metric value={`${Math.round(prob * 100)}%`} color="var(--ios-blue)" size={20} />
          </div>
          <div>
            <Label>Market Price</Label>
            <Metric value={`${Math.round(market * 100)}%`} />
          </div>
          <div>
            <Label>Edge Delta</Label>
            <Metric
              value={`${edgeDelta > 0 ? "+" : ""}${(edgeDelta * 100).toFixed(1)}%`}
              color={Math.abs(edgeDelta) > 0.05 ? "var(--ios-green)" : "var(--text-secondary)"}
              size={16}
            />
          </div>
        </Row>
      </Section>

      {/* Confidence */}
      <Section>
        <Label>Confidence</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="confidence-bar" style={{ width: 100 }}>
            <div className="confidence-bar-fill" style={{ width: `${conf}%`, background: "var(--ios-blue)" }} />
          </div>
          <Metric value={`${conf}%`} color="var(--ios-blue)" />
        </div>
      </Section>
    </div>
  );
}

/* ── Edge Panel ────────────────────────────────────────────────────────────── */

export function EdgePanel({ data }: { data: EdgeResult }) {
  const ev = num(data.net_ev);
  const kelly = num(data.kelly);
  const recSize = num(data.recommended_size);

  const gradeColors: Record<string, string> = {
    A: "var(--ios-green)",
    B: "var(--ios-blue)",
    C: "var(--text-secondary)",
    PASS: "var(--ios-red)",
  };
  const gradeColor = gradeColors[data.ev_grade] ?? "var(--text-tertiary)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* EV Grade + Net EV */}
      <Section>
        <Row gap={24}>
          <div>
            <Label>EV Grade</Label>
            <Chip label={data.ev_grade} color={gradeColor} />
          </div>
          <div>
            <Label>Net EV</Label>
            <Metric
              value={`${ev > 0 ? "+" : ""}${ev.toFixed(1)}%`}
              color={ev > 0 ? "var(--ios-green)" : "var(--ios-red)"}
              size={20}
            />
          </div>
        </Row>
      </Section>

      {/* Kelly sizing */}
      <Section>
        <Row gap={24}>
          <div>
            <Label>Kelly %</Label>
            <Metric value={`${kelly.toFixed(1)}%`} />
          </div>
          <div>
            <Label>Rec. Size</Label>
            <Metric value={`${recSize.toFixed(1)}% bankroll`} color="var(--ios-blue)" />
          </div>
        </Row>
      </Section>
    </div>
  );
}

/* ── Clause Panel ──────────────────────────────────────────────────────────── */

export function ClausePanel({ data }: { data: ClauseResult }) {
  const riskColors: Record<string, string> = {
    LOW: "var(--ios-green)",
    MED: "var(--ios-orange)",
    HIGH: "var(--ios-red)",
  };
  const riskColor = riskColors[data.resolution_risk] ?? "var(--text-tertiary)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Section>
        <Label>Resolution Risk</Label>
        <Chip label={data.resolution_risk} color={riskColor} />
      </Section>

      {data.technicality_risks && data.technicality_risks.length > 0 && (
        <Section>
          <Label>Technicality Risks</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.technicality_risks.map((risk, i) => (
              <div
                key={i}
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  lineHeight: 1.4,
                }}
              >
                {stripMd(risk)}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ── Flux Panel ────────────────────────────────────────────────────────────── */

export function FluxPanel({ data }: { data: FluxResult }) {
  const spread = num(data.spread);
  const depth = num(data.depth_score);

  const gradeColors: Record<string, string> = {
    A: "var(--ios-green)",
    B: "var(--ios-blue)",
    C: "var(--ios-orange)",
    D: "var(--ios-red)",
  };
  const gradeColor = gradeColors[data.liquidity_grade] ?? "var(--text-tertiary)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Section>
        <Row gap={24}>
          <div>
            <Label>Liquidity Grade</Label>
            <Chip label={data.liquidity_grade} color={gradeColor} />
          </div>
          <div>
            <Label>Spread</Label>
            <Metric value={`${spread.toFixed(1)}\u00A2`} />
          </div>
          <div>
            <Label>Whale Signals</Label>
            <Metric value={`${data.whale_signals ?? 0}`} color="var(--ios-purple)" />
          </div>
        </Row>
      </Section>

      {depth > 0 && (
        <Section>
          <Label>Depth Score</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="confidence-bar" style={{ width: 100 }}>
              <div
                className="confidence-bar-fill"
                style={{ width: `${Math.min(depth * 100, 100)}%`, background: gradeColor }}
              />
            </div>
            <Metric value={`${(depth * 100).toFixed(0)}%`} color={gradeColor} />
          </div>
        </Section>
      )}
    </div>
  );
}

/* ── Lucifer Panel ─────────────────────────────────────────────────────────── */

export function LuciferPanel({ data }: { data: LuciferResult }) {
  const daScore = num(data.devils_advocate_score);
  const isVeto = daScore > 0.7;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* DA Score + Veto */}
      <Section>
        <Row gap={16}>
          <div>
            <Label>DA Score</Label>
            <Metric
              value={daScore.toFixed(2)}
              color={isVeto ? "var(--ios-red)" : "var(--ios-purple)"}
              size={20}
            />
          </div>
          {isVeto && <Chip label="VETO" color="var(--ios-red)" />}
        </Row>
      </Section>

      {/* Bias flags */}
      {data.bias_flags && data.bias_flags.length > 0 && (
        <Section>
          <Label>Bias Flags</Label>
          <Row gap={8}>
            {data.bias_flags.map((flag, i) => (
              <Chip key={i} label={flag} color="var(--ios-orange)" />
            ))}
          </Row>
        </Section>
      )}

      {/* Counter thesis */}
      {data.counter_thesis && (
        <Section mb={0}>
          <Label>Counter Thesis</Label>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              margin: 0,
              lineHeight: 1.5,
              fontStyle: "italic",
            }}
          >
            &ldquo;{stripMd(data.counter_thesis ?? "")}&rdquo;
          </p>
        </Section>
      )}
    </div>
  );
}
