"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTutorialState, type TutorialPage } from "@/hooks/useTutorialState";
import { TutorialSpotlight } from "./TutorialSpotlight";
import { TutorialTooltip } from "./TutorialTooltip";
import { TutorialProgressBar } from "./TutorialProgressBar";
import { getPageSteps, getNextPageLabel, TUTORIAL_PAGES } from "./tutorialSteps";

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

// ─── Element finder with polling ─────────────────────────────────────────────

function useTargetElement(selector: string | null, active: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [found, setFound] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);
  const elementRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!active || !selector || selector === "__auto_navigate__") {
      setRect(null);
      setFound(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15; // 15 × 200ms = 3s

    const updateRect = () => {
      if (elementRef.current) {
        const r = elementRef.current.getBoundingClientRect();
        setRect(r);
      }
    };

    const poll = () => {
      if (cancelled) return;
      const el = document.querySelector(selector);
      if (el) {
        elementRef.current = el;
        setFound(true);
        updateRect();

        // Scroll into view
        el.scrollIntoView({ behavior: "smooth", block: "center" });

        // Watch for resize/layout changes
        observerRef.current = new ResizeObserver(updateRect);
        observerRef.current.observe(el);

        // Also update on scroll
        window.addEventListener("scroll", updateRect, { passive: true });
        window.addEventListener("resize", updateRect, { passive: true });
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 200);
        } else {
          // Element not found — show tooltip without spotlight
          setFound(true);
          setRect(null);
        }
      }
    };

    // Small initial delay for page to settle
    const timeout = setTimeout(poll, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      observerRef.current?.disconnect();
      window.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
      elementRef.current = null;
      setRect(null);
      setFound(false);
    };
  }, [selector, active]);

  return { rect, found };
}

// ─── Main Overlay ────────────────────────────────────────────────────────────

export function TutorialOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isActive,
    currentPage,
    currentStep,
    pageIndex,
    nextStep,
    prevStep,
    skipTutorial,
  } = useTutorialState();

  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Portal target
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get current page's steps
  const pageSteps = currentPage ? getPageSteps(currentPage) : undefined;
  const steps = pageSteps?.steps ?? [];
  const step = steps[currentStep] ?? null;

  // Check if we're on the correct page
  const onCorrectPage = currentPage ? pathMatchesPage(pathname, currentPage) : false;

  // Should we show the tutorial?
  const showTutorial = isActive && onCorrectPage && step && !step.autoNavigate;

  // Target element
  const { rect, found } = useTargetElement(
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

  // Keyboard navigation
  useEffect(() => {
    if (!showTutorial) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentStep > 0) prevStep();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showTutorial, currentStep, steps.length]);

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
    // "complete" and "next-step" are handled by state update
  }, [currentPage, nextStep, steps.length, router]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) prevStep();
  }, [currentStep, prevStep]);

  const handleSkip = useCallback(() => {
    setExiting(true);
    // Small delay for exit animation
    setTimeout(() => {
      skipTutorial();
      setExiting(false);
    }, 300);
  }, [skipTutorial]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!mounted || !isActive || exiting) {
    if (mounted && exiting) {
      // Show exit animation
      return createPortal(
        <AnimatePresence>
          <TutorialSpotlight rect={null} visible={false} />
        </AnimatePresence>,
        document.body
      );
    }
    return null;
  }

  // Not on the correct page — show only progress bar as a gentle reminder
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

  // Auto-navigate step — don't show UI
  if (step?.autoNavigate) return null;

  // Waiting for element to be found
  if (!found) return null;

  const isLastPage = pageIndex === TUTORIAL_PAGES.length - 1;
  const isLastStep = currentStep === steps.length - 1;
  const isFinalStep = isLastPage && isLastStep;
  const nextPageLabel = currentPage ? getNextPageLabel(currentPage) : null;

  const spotlightRect = rect
    ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    : null;

  return createPortal(
    <>
      {/* Click-to-advance overlay — covers everything except the spotlight cutout */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          pointerEvents: "auto",
        }}
        onClick={(e) => {
          // Only advance if clicking the overlay (not tooltip or target)
          if (e.target === e.currentTarget) {
            handleNext();
          }
        }}
      />

      <AnimatePresence mode="wait">
        <TutorialSpotlight
          key={`spotlight-${currentPage}-${currentStep}`}
          rect={spotlightRect}
          visible={true}
        />
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step && (
          <TutorialTooltip
            key={`tooltip-${currentPage}-${currentStep}`}
            title={step.title}
            description={step.description}
            position={step.position}
            targetRect={spotlightRect}
            stepIndex={currentStep}
            totalSteps={steps.length}
            nextPageLabel={nextPageLabel}
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
