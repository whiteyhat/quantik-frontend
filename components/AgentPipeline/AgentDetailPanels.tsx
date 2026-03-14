"use client";

import { useTranslations } from "next-intl";
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

// Sanitize HTML to only allow safe inline tags (strong, em, br)
function sanitizeHtml(text: string): string {
  return text
    .replace(/<(?!\/?(?:strong|em|br)\b)[^>]*>/gi, "")
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
  const t = useTranslations("agentPipeline");
  const score = num(data.sentiment_score);
  const isPositive = score >= 0;
  const barWidth = Math.min(Math.abs(score) * 100, 100);
  const sourceStatus = data.sourceStatus ?? {};
  const allSources = Object.keys(sourceStatus).filter((s) => s !== "news" && s !== "telegram");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Summary */}
      {data.summary && (
        <Section>
          <Label>{t("panels.summary")}</Label>
          <p style={{
            fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.55,
            margin: 0, padding: "6px 10px", borderRadius: 8,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            {data.summary}
          </p>
        </Section>
      )}

      {/* Sentiment delta bar */}
      <Section>
        <Label>{t("panels.sentimentDelta")}</Label>
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
            <Label>{t("panels.echoChamber")}</Label>
            <Chip
              label={data.echo_chamber ? t("panels.echoChamberWarning") : t("panels.echoChamberClear")}
              color={data.echo_chamber ? "var(--ios-orange)" : "var(--ios-green)"}
            />
          </div>
          {data.echo_chamber_strength !== undefined && (
            <div>
              <Label>{t("panels.echoStrength")}</Label>
              <Metric value={`${num(data.echo_chamber_strength).toFixed(2)}`} color="var(--ios-orange)" />
            </div>
          )}
        </Row>
      </Section>

      {/* News source pills */}
      {data.newsArticles && data.newsArticles.length > 0 && (
        <Section>
          <Label>{t("panels.sentimentSources")}</Label>
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
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "var(--ios-blue)",
                  background: "rgba(10,132,255,0.12)", border: "1px solid rgba(10,132,255,0.20)",
                  padding: "1px 7px", borderRadius: 6, whiteSpace: "nowrap",
                  fontFamily: '"SF Mono","JetBrains Mono",monospace', flexShrink: 0,
                }}>
                  {article.source || "News"}
                </span>
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

      {/* Data sources status */}
      {allSources.length > 0 && (
        <Section mb={0}>
          <Label>{t("panels.dataSources")}</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {allSources.map((s) => {
              const st = sourceStatus[s] ?? "unavailable";
              const color = st === "ok" ? "var(--ios-green)" : st === "timeout" ? "var(--ios-orange)" : "var(--text-tertiary)";
              return (
                <span
                  key={s}
                  style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
                    padding: "2px 8px", borderRadius: 6,
                    fontFamily: '"SF Mono","JetBrains Mono",monospace',
                    color,
                    background: `color-mix(in srgb, ${color} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
                  }}
                >
                  {st === "ok" ? "●" : st === "timeout" ? "◌" : "○"} {s}
                </span>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ── Oracle Panel ──────────────────────────────────────────────────────────── */

export function OraclePanel({ data }: { data: OracleResult }) {
  const t = useTranslations("agentPipeline");
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
            <Label>{t("panels.modelProb")}</Label>
            <Metric value={`${Math.round(prob * 100)}%`} color="var(--ios-blue)" size={20} />
          </div>
          <div>
            <Label>{t("panels.marketPrice")}</Label>
            <Metric value={`${Math.round(market * 100)}%`} />
          </div>
          <div>
            <Label>{t("panels.edgeDelta")}</Label>
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
        <Label>{t("panels.confidence")}</Label>
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
  const t = useTranslations("agentPipeline");
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
            <Label>{t("panels.evGrade")}</Label>
            <Chip label={data.ev_grade} color={gradeColor} />
          </div>
          <div>
            <Label>{t("panels.netEv")}</Label>
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
            <Label>{t("panels.kellyPct")}</Label>
            <Metric value={`${kelly.toFixed(1)}%`} />
          </div>
          <div>
            <Label>{t("panels.recSize")}</Label>
            <Metric value={`${recSize.toFixed(1)}% ${t("panels.bankroll")}`} color="var(--ios-blue)" />
          </div>
        </Row>
      </Section>
    </div>
  );
}

/* ── Clause Panel ──────────────────────────────────────────────────────────── */

export function ClausePanel({ data }: { data: ClauseResult }) {
  const t = useTranslations("agentPipeline");
  const riskColors: Record<string, string> = {
    LOW: "var(--ios-green)",
    MED: "var(--ios-orange)",
    HIGH: "var(--ios-red)",
  };
  const riskColor = riskColors[data.resolution_risk] ?? "var(--text-tertiary)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Section>
        <Label>{t("panels.resolutionRisk")}</Label>
        <Chip label={data.resolution_risk} color={riskColor} />
      </Section>

      {data.technicality_risks && data.technicality_risks.length > 0 && (
        <Section>
          <Label>{t("panels.technicalityRisks")}</Label>
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
  const t = useTranslations("agentPipeline");
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
            <Label>{t("panels.liquidityGrade")}</Label>
            <Chip label={data.liquidity_grade} color={gradeColor} />
          </div>
          <div>
            <Label>{t("spread")}</Label>
            <Metric value={`${spread.toFixed(1)}\u00A2`} />
          </div>
          <div>
            <Label>{t("panels.whaleSignals")}</Label>
            <Metric value={`${data.whale_signals ?? 0}`} color="var(--ios-purple)" />
          </div>
        </Row>
      </Section>

      {depth > 0 && (
        <Section>
          <Label>{t("panels.depthScore")}</Label>
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
  const t = useTranslations("agentPipeline");
  const daScore = num(data.devils_advocate_score);
  const isVeto = daScore > 0.7;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* DA Score + Veto */}
      <Section>
        <Row gap={16}>
          <div>
            <Label>{t("panels.daScore")}</Label>
            <Metric
              value={daScore.toFixed(2)}
              color={isVeto ? "var(--ios-red)" : "var(--ios-purple)"}
              size={20}
            />
          </div>
          {isVeto && <Chip label={t("verdictVeto")} color="var(--ios-red)" />}
        </Row>
      </Section>

      {/* Bias flags */}
      {data.bias_flags && data.bias_flags.length > 0 && (
        <Section>
          <Label>{t("panels.biasFlags")}</Label>
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
          <Label>{t("panels.counterThesis")}</Label>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              margin: 0,
              lineHeight: 1.5,
              fontStyle: "italic",
            }}
            dangerouslySetInnerHTML={{
              __html: `\u201C${sanitizeHtml(data.counter_thesis)}\u201D`,
            }}
          />
        </Section>
      )}
    </div>
  );
}
