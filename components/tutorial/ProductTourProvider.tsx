"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  NextStep,
  NextStepProvider,
  useNextStep,
  type NavigationAdapter,
  type Tour,
} from "nextstepjs";
import { useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocalStorageFlag } from "@/hooks/useLocalStorageFlag";
import {
  clearProductTourResume,
  completeCreateWizardTour,
  completeFactoryTour,
  completeProductTour,
  type OnboardingTourName,
  useOnboardingTourState,
} from "@/hooks/useOnboardingTourState";
import { useQuantikStore } from "@/store/useQuantikStore";

import { ProductTourCard } from "./ProductTourCard";

const FACTORY_SELECTOR = "#tour-factory-shell";
const WIZARD_NAME_SELECTOR = "#tour-wizard-name";
const PRODUCT_SELECTOR = "#tour-agent-identity";

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function hasBlockingDialog() {
  return Boolean(document.querySelector('[role="dialog"]:not([data-product-tour-card="true"])'));
}

async function waitForSelector(selector: string, attempts = 30, delayMs = 160) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (!hasBlockingDialog() && document.querySelector(selector)) {
      return true;
    }
    await wait(delayMs);
  }

  return false;
}

function useLocalizedTourAdapter(): NavigationAdapter {
  const router = useRouter();
  const pathname = usePathname();

  return useMemo(
    () => ({
      push: (path: string) => {
        router.push(path);
      },
      getCurrentPath: () => pathname,
    }),
    [pathname, router]
  );
}

function buildTours(
  t: ReturnType<typeof useTranslations>
): Tour[] {
  const shared = {
    showControls: true,
    showSkip: true,
    pointerPadding: 12,
    pointerRadius: 18,
  } as const;

  return [
    {
      tour: "factory-first-run",
      steps: [
        {
          ...shared,
          icon: "🧭",
          title: t("factoryIntroTitle"),
          content: t("factoryIntroDesc"),
          selector: FACTORY_SELECTOR,
          side: "bottom",
        },
        {
          ...shared,
          icon: "🧪",
          title: t("factoryCreateTitle"),
          content: t("factoryCreateDesc"),
          selector: "#tour-factory-create",
          side: "right",
        },
        {
          ...shared,
          icon: "🦞",
          title: t("factoryByoTitle"),
          content: t("factoryByoDesc"),
          selector: "#tour-factory-byo",
          side: "left",
        },
      ],
    },
    {
      tour: "create-wizard",
      steps: [
        {
          ...shared,
          icon: "🏷️",
          title: t("wizardNameTitle"),
          content: t("wizardNameDesc"),
          selector: "#tour-wizard-name",
          side: "bottom",
        },
        {
          ...shared,
          icon: "🧬",
          title: t("wizardPersonalityTitle"),
          content: t("wizardPersonalityDesc"),
          selector: "#tour-wizard-personality",
          side: "right",
        },
        {
          ...shared,
          icon: "➡️",
          title: t("wizardNextTitle"),
          content: t("wizardNextDesc"),
          selector: "#tour-wizard-next",
          side: "top",
        },
      ],
    },
    {
      tour: "product-tour",
      steps: [
        {
          ...shared,
          icon: "🪪",
          title: t("identityTitle"),
          content: t("identityDesc"),
          selector: PRODUCT_SELECTOR,
          side: "bottom",
        },
        {
          ...shared,
          icon: "⚡",
          title: t("autopilotTitle"),
          content: t("autopilotDesc"),
          selector: "#tour-autopilot-card",
          side: "left",
        },
        {
          ...shared,
          icon: "🗂️",
          title: t("viewTabsTitle"),
          content: t("viewTabsDesc"),
          selector: "#tour-view-tabs",
          side: "bottom",
          nextRoute: "/dashboard",
        },
        {
          ...shared,
          icon: "🎛️",
          title: t("missionControlTitle"),
          content: t("missionControlDesc"),
          selector: "#tour-mission-control",
          side: "bottom",
          prevRoute: "/manage-agent",
        },
        {
          ...shared,
          icon: "🛰️",
          title: t("missionRailTitle"),
          content: t("missionRailDesc"),
          selector: "#tour-mission-rail",
          side: "bottom",
        },
        {
          ...shared,
          icon: "🎯",
          title: t("orchestratorTitle"),
          content: t("orchestratorDesc"),
          selector: "#tour-orchestrator",
          side: "left",
          nextRoute: "/arena",
        },
        {
          ...shared,
          icon: "⚔️",
          title: t("arenaTitle"),
          content: t("arenaDesc"),
          selector: "#tour-arena-prelude",
          side: "bottom",
          prevRoute: "/dashboard",
        },
        {
          ...shared,
          icon: "🏆",
          title: t("arenaStageTitle"),
          content: t("arenaStageDesc"),
          selector: "#tour-arena-stage",
          side: "bottom",
        },
        {
          ...shared,
          icon: "📈",
          title: t("arenaPositionTitle"),
          content: t("arenaPositionDesc"),
          selector: "#tour-arena-position",
          side: "left",
        },
      ],
    },
  ];
}

function ProductTourRuntime({ children }: { children: ReactNode }) {
  const t = useTranslations("tutorial");
  const pathname = usePathname();
  const router = useRouter();
  const hasSeenOnboarding = useLocalStorageFlag("hasSeenOnboarding");
  const tourState = useOnboardingTourState();
  const myAgent = useQuantikStore((s) => s.myAgent);
  const myAgentLoading = useQuantikStore((s) => s.myAgentLoading);
  const {
    currentTour,
    isNextStepVisible,
    startNextStep,
  } = useNextStep();
  const pendingStartRef = useRef<OnboardingTourName | null>(null);
  const tours = useMemo(() => buildTours(t), [t]);

  const startTour = useCallback(
    async (tourName: OnboardingTourName, selector: string, beforeStart?: () => void) => {
      if (pendingStartRef.current || isNextStepVisible || currentTour) return;

      pendingStartRef.current = tourName;
      const ready = await waitForSelector(selector);
      if (!ready) {
        pendingStartRef.current = null;
        return;
      }

      beforeStart?.();
      startNextStep(tourName);
      pendingStartRef.current = null;
    },
    [currentTour, isNextStepVisible, startNextStep]
  );

  useEffect(() => {
    if (!hasSeenOnboarding) return;
    if (pathname !== "/agent-factory") return;
    if (tourState.factoryTourCompleted) return;
    void startTour("factory-first-run", FACTORY_SELECTOR);
  }, [hasSeenOnboarding, pathname, startTour, tourState.factoryTourCompleted]);

  // Listen for create-wizard tour trigger from agent factory page
  useEffect(() => {
    if (pathname !== "/agent-factory") return;
    if (tourState.createWizardTourCompleted) return;

    const handler = () => {
      void startTour("create-wizard", WIZARD_NAME_SELECTOR);
    };

    window.addEventListener("quantik:wizard-step-entered", handler);
    return () => window.removeEventListener("quantik:wizard-step-entered", handler);
  }, [pathname, startTour, tourState.createWizardTourCompleted]);

  useEffect(() => {
    if (pathname !== "/manage-agent") return;
    if (myAgentLoading || !myAgent) return;
    if (!tourState.resumeProductTourAfterDeploy || tourState.productTourCompleted) return;

    void startTour("product-tour", PRODUCT_SELECTOR, clearProductTourResume);
  }, [
    myAgent,
    myAgentLoading,
    pathname,
    startTour,
    tourState.productTourCompleted,
    tourState.resumeProductTourAfterDeploy,
  ]);

  const handleComplete = useCallback(
    (tourName: string | null) => {
      if (tourName === "factory-first-run") {
        completeFactoryTour();

        if (myAgent && tourState.resumeProductTourAfterDeploy && pathname === "/agent-factory") {
          router.push("/manage-agent");
        }
        return;
      }

      if (tourName === "create-wizard") {
        completeCreateWizardTour();
        return;
      }

      if (tourName === "product-tour") {
        completeProductTour();
      }
    },
    [myAgent, pathname, router, tourState.resumeProductTourAfterDeploy]
  );

  const handleSkip = useCallback((_: number, tourName: string | null) => {
    if (tourName === "factory-first-run") {
      completeFactoryTour();
      return;
    }

    if (tourName === "create-wizard") {
      completeCreateWizardTour();
      return;
    }

    if (tourName === "product-tour") {
      completeProductTour();
    }
  }, []);

  return (
    <NextStep
      steps={tours}
      cardComponent={ProductTourCard}
      navigationAdapter={useLocalizedTourAdapter}
      shadowRgb="3, 6, 18"
      shadowOpacity="0.84"
      overlayZIndex={10020}
      displayArrow={true}
      clickThroughOverlay={false}
      disableConsoleLogs={true}
      scrollToTop={false}
      onComplete={handleComplete}
      onSkip={handleSkip}
    >
      {children}
    </NextStep>
  );
}

export function ProductTourProvider({ children }: { children: ReactNode }) {
  return (
    <NextStepProvider>
      <ProductTourRuntime>{children}</ProductTourRuntime>
    </NextStepProvider>
  );
}
