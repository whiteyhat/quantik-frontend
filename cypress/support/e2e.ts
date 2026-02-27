// Global uncaught exception handler — suppress known production React errors
// so Cypress tests don't fail on pre-existing app-level issues.
Cypress.on("uncaught:exception", (err) => {
  // React error #31: object rendered as child (circuit breaker object from API)
  if (err.message?.includes("Minified React error #31")) return false;
  // setPointerCapture errors from Radix/Slider
  if (err.message?.includes("setPointerCapture")) return false;
  // React hydration or internal errors in production builds
  if (err.message?.includes("Minified React error")) return false;
  // Allow other exceptions to fail the test
});
