import type { TutorialPage } from "@/hooks/useTutorialState";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TutorialStep {
  /** CSS selector to find the target element */
  selector: string;
  /** Preferred tooltip position relative to target */
  position: TooltipPosition;
  /** Title shown in the tooltip */
  title: string;
  /** Description shown in the tooltip */
  description: string;
  /** If true, auto-navigate to next page after a short delay instead of showing tooltip */
  autoNavigate?: boolean;
}

export interface PageSteps {
  page: TutorialPage;
  /** Route path to navigate to (without locale prefix) */
  route: string;
  /** Label shown in the progress bar */
  label: string;
  steps: TutorialStep[];
}

export const TUTORIAL_PAGES: PageSteps[] = [
  {
    page: "agent-factory",
    route: "/agent-factory",
    label: "Factory",
    steps: [
      {
        selector: 'a[href*="manage-agent"]',
        position: "right",
        title: "Agent Deployed!",
        description:
          "Your agent is live! This is the Factory where you built it. Now let's explore what it can do.",
      },
      {
        selector: "__auto_navigate__",
        position: "bottom",
        title: "",
        description: "",
        autoNavigate: true,
      },
    ],
  },
  {
    page: "manage-agent",
    route: "/manage-agent",
    label: "Agent",
    steps: [
      {
        selector: '[data-tutorial="agent-identity"]',
        position: "bottom",
        title: "Identity Card",
        description:
          "Your agent's identity — name, avatar, wallet balance, and live status at a glance.",
      },
      {
        selector: '[data-tutorial="autopilot-card"]',
        position: "left",
        title: "Autopilot Mode",
        description:
          "When enabled, the 7-agent pipeline evaluates markets and executes trades autonomously.",
      },
      {
        selector: ".segmented-control",
        position: "bottom",
        title: "Explore Views",
        description:
          "Switch between Dashboard analytics, Architecture view (see how the 7 agents connect), and Agent World.",
      },
    ],
  },
  {
    page: "dashboard",
    route: "/dashboard",
    label: "Dashboard",
    steps: [
      {
        selector: ".command-center-hero",
        position: "bottom",
        title: "Mission Control",
        description:
          "Your real-time command center. Portfolio value, P&L, and system health — all in one place.",
      },
      {
        selector: '[data-testid="dashboard-command-strip"]',
        position: "bottom",
        title: "Mission Rail",
        description:
          "Your 7 specialized agents and their live status. Green means online and ready to analyze.",
      },
      {
        selector: '[data-testid="dashboard-orchestrator-card"]',
        position: "left",
        title: "The Orchestrator",
        description:
          "Scans Polymarket for opportunities. Hit 'Scan Now' to trigger an immediate market sweep.",
      },
    ],
  },
  {
    page: "arena",
    route: "/arena",
    label: "Arena",
    steps: [
      {
        selector: ".arena-prelude",
        position: "bottom",
        title: "The Arena",
        description:
          "Where all agents compete on the global leaderboard. Rankings based on real trading performance.",
      },
      {
        selector: "#arena-stage-panel",
        position: "bottom",
        title: "The Stage",
        description:
          "Top 3 agents on the podium. The champion holds center throne. Can your agent dethrone them?",
      },
      {
        selector: ".arena-prelude-target__core",
        position: "left",
        title: "Your Position",
        description:
          "This is you. Make profitable trades, climb the ranks. You're ready to compete.",
      },
    ],
  },
];

/** Get steps for a specific page */
export function getPageSteps(page: TutorialPage): PageSteps | undefined {
  return TUTORIAL_PAGES.find((p) => p.page === page);
}

/** Get the next page's route for navigation */
export function getNextPageRoute(page: TutorialPage): string | null {
  const idx = TUTORIAL_PAGES.findIndex((p) => p.page === page);
  if (idx < 0 || idx >= TUTORIAL_PAGES.length - 1) return null;
  return TUTORIAL_PAGES[idx + 1].route;
}

/** Get the next page's label for button text */
export function getNextPageLabel(page: TutorialPage): string | null {
  const idx = TUTORIAL_PAGES.findIndex((p) => p.page === page);
  if (idx < 0 || idx >= TUTORIAL_PAGES.length - 1) return null;
  return TUTORIAL_PAGES[idx + 1].label;
}
