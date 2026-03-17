"use client";

import { useEffect, useState, useCallback, useRef, Component, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useHydrated } from "@/hooks/useHydrated";
import { useTutorialState, type TutorialPage } from "@/hooks/useTutorialState";
import { TutorialSpotlight } from "./TutorialSpotlight";
import { TutorialTooltip } from "./TutorialTooltip";
import { TutorialProgressBar } from "./TutorialProgressBar";
import { getPageSteps, getNextPageLabelKey, TUTORIAL_PAGES } from "./tutorialSteps";
import JSConfetti from "js-confetti";

// ─── Error Boundary ──────────────────────────────────────────────────────────
// Prevents tutorial bugs from crashing the dashboard

interface ErrorBoundaryState { hasError: boolean }

class TutorialErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[Tutorial] Error caught, disabling tutorial:", error.message);
    // Silently skip tutorial on error
    try {
      const raw = window.localStorage.getItem("quantik_tutorial");
      if (raw) {
        const state = JSON.parse(raw);
        state.status = "skipped";
        window.localStorage.setItem("quantik_tutorial", JSON.stringify(state));
      }
    } catch { /* ignore */ }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ─── Route matching ──────────────────────────────────────────────────────────

function pathMatchesPage(pathname: string, page: TutorialPage): boolean {
  switch (page) {
    case "agent-factory":
      return pathname.startsWith("/agent-factory");
    case "manage-agent":
      return pathname.startsWith("/manage-agent");
    case "dashboard":
      return pathname === "/dashboard" || pathname === "/";
    case "arena":
      return pathname.startsWith("/arena");
    default:
      return false;
  }
}

// ─── Debounced rect updater ──────────────────────────────────────────────────

function createDebouncedRectUpdater(
  elementRef: React.MutableRefObject<Element | null>,
  setRect: (r: DOMRect | null) => void
) {
  let rafId = 0;
  const update = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      if (elementRef.current) {
        setRect(elementRef.current.getBoundingClientRect());
      }
    });
  };
  const cancel = () => cancelAnimationFrame(rafId);
  return { update, cancel };
}

// ─── Element finder with polling + MutationObserver ──────────────────────────

function useTargetElement(selector: string | null, active: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [found, setFound] = useState(false);
  const [searching, setSearching] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const elementRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!active || !selector || selector === "__auto_navigate__") {
      setRect(null);
      setFound(false);
      setSearching(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15;
    setSearching(true);

    const { update: debouncedUpdate, cancel: cancelDebounce } =
      createDebouncedRectUpdater(elementRef, setRect);

    const attachObservers = (el: Element) => {
      // ResizeObserver for size changes
      observerRef.current = new ResizeObserver(debouncedUpdate);
      observerRef.current.observe(el);

      // MutationObserver for DOM reflows that move the element
      mutationObserverRef.current = new MutationObserver(debouncedUpdate);
      mutationObserverRef.current.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
      });

      window.addEventListener("scroll", debouncedUpdate, { passive: true });
      window.addEventListener("resize", debouncedUpdate, { passive: true });
    };

    const poll = () => {
      if (cancelled) return;
      const el = document.querySelector(selector);
      if (el) {
        elementRef.current = el;
        setFound(true);
        setSearching(false);
        setRect(el.getBoundingClientRect());

        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Re-measure after scroll settles
        setTimeout(debouncedUpdate, 400);

        attachObservers(el);
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 200);
        } else {
          setFound(true);
          setSearching(false);
          setRect(null);
        }
      }
    };

    const timeout = setTimeout(poll, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cancelDebounce();
      observerRef.current?.disconnect();
      mutationObserverRef.current?.disconnect();
      window.removeEventListener("scroll", debouncedUpdate);
      window.removeEventListener("resize", debouncedUpdate);
      elementRef.current = null;
      setRect(null);
      setFound(false);
      setSearching(false);
    };
  }, [selector, active]);

  return { rect, found, searching };
}

// ─── Check if a blocking modal is open ───────────────────────────────────────

function useModalBlocking() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const check = () => {
      // Check for panic modal or any dialog/modal with high z-index
      const panicModal = document.querySelector('[data-panic-modal="true"]');
      const dialogs = document.querySelectorAll('[role="dialog"]:not([data-tutorial-dialog])');
      setBlocked(!!(panicModal || dialogs.length > 0));
    };

    // Check periodically and on DOM changes
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    check();

    return () => observer.disconnect();
  }, []);

  return blocked;
}

// ─── Main Overlay ────────────────────────────────────────────────────────────

function TutorialOverlayInner() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const modalBlocked = useModalBlocking();
  const {
    isActive,
    currentPage,
    currentStep,
    pageIndex,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
  } = useTutorialState();

  const [exiting, setExiting] = useState(false);

  // Refs for handlers to avoid stale closures in keyboard listener
  const handlersRef = useRef({
    next: () => {},
    back: () => {},
    skip: () => {},
  });

  // Get current page's steps
  const pageSteps = currentPage ? getPageSteps(currentPage) : undefined;
  const steps = pageSteps?.steps ?? [];
  const step = steps[currentStep] ?? null;

  // Check if we're on the correct page
  const onCorrectPage = currentPage ? pathMatchesPage(pathname, currentPage) : false;

  // Should we show the tutorial?
  const showTutorial = isActive && onCorrectPage && step && !step.autoNavigate && !modalBlocked;

  // Target element
  const { rect, found, searching } = useTargetElement(
    showTutorial ? step?.selector ?? null : null,
    showTutorial ?? false
  );

  // Auto-navigate handler
  useEffect(() => {
    if (!isActive || !onCorrectPage || !step?.autoNavigate || !currentPage) return;

    const nextPageData = TUTORIAL_PAGES[pageIndex + 1];
    if (!nextPageData) return;

    const timer = setTimeout(() => {
      const result = nextStep(steps.length);
      if (result?.action === "next-page" && result.page) {
        router.push(nextPageData.route);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [isActive, onCorrectPage, step, currentPage, pageIndex, nextStep, steps.length, router]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    if (!currentPage) return;
    const result = nextStep(steps.length);

    if (result?.action === "next-page" && result.page) {
      const nextPageData = TUTORIAL_PAGES.find((p) => p.page === result.page);
      if (nextPageData) {
        router.push(nextPageData.route);
      }
    }

    if (result?.action === "complete") {
      // Fire confetti on tutorial completion
      try {
        const confetti = new JSConfetti();
        confetti.addConfetti({
          emojis: ["🎉", "🚀", "⚡"],
          emojiSize: 50,
          confettiNumber: 30,
        });
      } catch { /* ignore */ }
    }
  }, [currentPage, nextStep, steps.length, router]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) prevStep();
  }, [currentStep, prevStep]);

  const handleSkip = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      skipTutorial();
      setExiting(false);
    }, 300);
  }, [skipTutorial]);

  // Keep refs updated (avoids stale closure in keyboard handler)
  handlersRef.current = { next: handleNext, back: handleBack, skip: handleSkip };

  // Keyboard navigation — uses refs to avoid stale closures
  useEffect(() => {
    if (!showTutorial) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        handlersRef.current.next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlersRef.current.back();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handlersRef.current.skip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showTutorial]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!hydrated || !isActive || exiting) {
    if (hydrated && exiting) {
      return createPortal(
        <AnimatePresence>
          <TutorialSpotlight rect={null} visible={false} onOverlayClick={() => {}} />
        </AnimatePresence>,
        document.body
      );
    }
    return null;
  }

  // Paused by modal
  if (modalBlocked) return null;

  // Not on the correct page — show only progress bar
  if (!onCorrectPage) {
    return createPortal(
      <AnimatePresence>
        <TutorialProgressBar
          pageIndex={pageIndex}
          currentStep={currentStep}
          totalSteps={steps.length || 1}
          onSkip={handleSkip}
        />
      </AnimatePresence>,
      document.body
    );
  }

  // Auto-navigate step
  if (step?.autoNavigate) return null;

  // Loading state while searching for element
  if (searching && !found) {
    return createPortal(
      <AnimatePresence>
        <TutorialProgressBar
          pageIndex={pageIndex}
          currentStep={currentStep}
          totalSteps={steps.length}
          onSkip={handleSkip}
        />
      </AnimatePresence>,
      document.body
    );
  }

  // Still waiting
  if (!found) return null;

  const isLastPage = pageIndex === TUTORIAL_PAGES.length - 1;
  const isLastStep = currentStep === steps.length - 1;
  const isFinalStep = isLastPage && isLastStep;
  const nextPageLabelKey = currentPage ? getNextPageLabelKey(currentPage) : null;

  const spotlightRect = rect
    ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    : null;

  return createPortal(
    <>
      <AnimatePresence mode="wait">
        <TutorialSpotlight
          key={`spotlight-${currentPage}-${currentStep}`}
          rect={spotlightRect}
          visible={true}
          onOverlayClick={handleNext}
        />
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step && (
          <TutorialTooltip
            key={`tooltip-${currentPage}-${currentStep}`}
            titleKey={step.titleKey}
            descKey={step.descKey}
            position={step.position}
            targetRect={spotlightRect}
            stepIndex={currentStep}
            totalSteps={steps.length}
            nextPageLabelKey={nextPageLabelKey}
            isFinalStep={isFinalStep}
            canGoBack={currentStep > 0}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        <TutorialProgressBar
          pageIndex={pageIndex}
          currentStep={currentStep}
          totalSteps={steps.length}
          onSkip={handleSkip}
        />
      </AnimatePresence>
    </>,
    document.body
  );
}

// ─── Exported with Error Boundary ────────────────────────────────────────────

export function TutorialOverlay() {
  return (
    <TutorialErrorBoundary>
      <TutorialOverlayInner />
    </TutorialErrorBoundary>
  );
}
