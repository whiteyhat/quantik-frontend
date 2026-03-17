import type { TutorialPage } from "@/hooks/useTutorialState";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TutorialStep {
  /** CSS selector to find the target element (use data-tutorial attributes exclusively) */
  selector: string;
  /** Preferred tooltip position relative to target */
  position: TooltipPosition;
  /** i18n key for the tooltip title (under "tutorial" namespace) */
  titleKey: string;
  /** i18n key for the tooltip description (under "tutorial" namespace) */
  descKey: string;
  /** If true, auto-navigate to next page after a short delay */
  autoNavigate?: boolean;
}

export interface PageSteps {
  page: TutorialPage;
  /** Route path to navigate to (without locale prefix) */
  route: string;
  /** i18n key for the progress bar label */
  labelKey: string;
  steps: TutorialStep[];
}

export const TUTORIAL_PAGES: PageSteps[] = [
  {
    page: "agent-factory",
    route: "/agent-factory",
    labelKey: "pageFactory",
    steps: [
      {
        selector: '[data-tutorial="nav-manage-agent"]',
        position: "right",
        titleKey: "factoryDeployedTitle",
        descKey: "factoryDeployedDesc",
      },
      {
        selector: "__auto_navigate__",
        position: "bottom",
        titleKey: "",
        descKey: "",
        autoNavigate: true,
      },
    ],
  },
  {
    page: "manage-agent",
    route: "/manage-agent",
    labelKey: "pageAgent",
    steps: [
      {
        selector: '[data-tutorial="agent-identity"]',
        position: "bottom",
        titleKey: "identityTitle",
        descKey: "identityDesc",
      },
      {
        selector: '[data-tutorial="autopilot-card"]',
        position: "left",
        titleKey: "autopilotTitle",
        descKey: "autopilotDesc",
      },
      {
        selector: '[data-tutorial="view-tabs"]',
        position: "bottom",
        titleKey: "viewTabsTitle",
        descKey: "viewTabsDesc",
      },
    ],
  },
  {
    page: "dashboard",
    route: "/dashboard",
    labelKey: "pageDashboard",
    steps: [
      {
        selector: '[data-tutorial="mission-control"]',
        position: "bottom",
        titleKey: "missionControlTitle",
        descKey: "missionControlDesc",
      },
      {
        selector: '[data-tutorial="mission-rail"]',
        position: "bottom",
        titleKey: "missionRailTitle",
        descKey: "missionRailDesc",
      },
      {
        selector: '[data-tutorial="orchestrator"]',
        position: "left",
        titleKey: "orchestratorTitle",
        descKey: "orchestratorDesc",
      },
    ],
  },
  {
    page: "arena",
    route: "/arena",
    labelKey: "pageArena",
    steps: [
      {
        selector: '[data-tutorial="arena-prelude"]',
        position: "bottom",
        titleKey: "arenaTitle",
        descKey: "arenaDesc",
      },
      {
        selector: '[data-tutorial="arena-stage"]',
        position: "bottom",
        titleKey: "arenaStageTitle",
        descKey: "arenaStageDesc",
      },
      {
        selector: '[data-tutorial="arena-position"]',
        position: "left",
        titleKey: "arenaPositionTitle",
        descKey: "arenaPositionDesc",
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

/** Get the next page's label key for button text */
export function getNextPageLabelKey(page: TutorialPage): string | null {
  const idx = TUTORIAL_PAGES.findIndex((p) => p.page === page);
  if (idx < 0 || idx >= TUTORIAL_PAGES.length - 1) return null;
  return TUTORIAL_PAGES[idx + 1].labelKey;
}
