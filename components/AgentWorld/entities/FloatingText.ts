import Phaser from "phaser";

// ─── Floating Text Entity ─────────────────────────────────────────────────────
// Displays pipeline result data as pixel-art text that floats up and fades out.

export interface FloatingTextConfig {
  text: string;
  x: number;
  y: number;
  color?: string;
  duration?: number;
  fontSize?: string;
}

export class FloatingText {
  private textObj: Phaser.GameObjects.Text;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, config: FloatingTextConfig) {
    this.scene = scene;

    const {
      text,
      x,
      y,
      color = "#ffffff",
      duration = 3000,
      fontSize = "5px",
    } = config;

    this.textObj = scene.add.text(x, y, text, {
      fontSize,
      fontFamily: '"Press Start 2P", monospace',
      color,
      resolution: 2,
      stroke: "#000000",
      strokeThickness: 2,
      align: "center",
    });
    this.textObj.setOrigin(0.5);
    this.textObj.setDepth(20);

    // Float up and fade
    scene.tweens.add({
      targets: this.textObj,
      y: y - 24,
      alpha: 0,
      duration,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.textObj.destroy();
      },
    });
  }

  destroy(): void {
    this.textObj.destroy();
  }
}

// ─── Agent Result Formatters ──────────────────────────────────────────────────
// Format pipeline agent results into display text + color.

export interface FormattedResult {
  text: string;
  color: string;
}

export function formatAgentResult(agentKey: string, data: unknown): FormattedResult {
  if (!data || typeof data !== "object") {
    return { text: "DONE", color: "#ffffff" };
  }

  const d = data as Record<string, unknown>;

  switch (agentKey) {
    case "aura": {
      const delta = typeof d.sentimentDelta === "number" ? d.sentimentDelta : 0;
      const dir = d.shiftDirection || "NEUTRAL";
      const sign = delta >= 0 ? "+" : "";
      const color = delta > 0 ? "#30d158" : delta < 0 ? "#ff453a" : "#ffffff";
      return { text: `Sentiment: ${sign}${delta.toFixed(2)} ${dir}`, color };
    }

    case "oracle": {
      const prob = typeof d.calibrated_prob === "number" ? d.calibrated_prob : 0;
      return { text: `P(YES): ${(prob * 100).toFixed(0)}%`, color: "#0a84ff" };
    }

    case "flux": {
      const grade = d.liquidity_grade || "?";
      const gradeColors: Record<string, string> = { A: "#30d158", B: "#0a84ff", C: "#ff9f0a", D: "#ff453a" };
      return { text: `Liquidity: ${grade}`, color: gradeColors[grade as string] || "#ffffff" };
    }

    case "edge": {
      const ev = typeof d.net_ev === "number" ? d.net_ev : 0;
      const kelly = typeof d.fractional_kelly === "number" ? d.fractional_kelly : 0;
      const sign = ev >= 0 ? "+" : "";
      return { text: `EV:${sign}$${ev.toFixed(0)} K:${kelly.toFixed(2)}`, color: "#ff9f0a" };
    }

    case "clause": {
      const risk = d.riskLevel || "?";
      const riskColors: Record<string, string> = { LOW: "#30d158", MEDIUM: "#ff9f0a", HIGH: "#ff453a" };
      return { text: `Risk: ${risk}`, color: riskColors[risk as string] || "#ffffff" };
    }

    case "lucifer": {
      const pass = d.pass === true;
      const score = typeof d.devils_advocate_score === "number" ? d.devils_advocate_score : 0;
      return {
        text: `DA:${score.toFixed(1)} ${pass ? "PASS" : "BLOCK"}`,
        color: pass ? "#30d158" : "#ff453a",
      };
    }

    case "sigma": {
      const decision = d.decision || "PASS";
      const conf = typeof d.confidence === "number" ? d.confidence : 0;
      const color = decision === "BET_YES" ? "#30d158" : decision === "BET_NO" ? "#ff453a" : "#888888";
      return { text: `${decision} @${conf}%`, color };
    }

    default:
      return { text: "DONE", color: "#ffffff" };
  }
}
