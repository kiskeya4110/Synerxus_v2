import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Hook to detect if the app is running as an installed PWA (standalone mode),
 * not just on a narrow viewport. Use this for *framing* decisions
 * (PWAHeader vs web nav, bottom-nav vs footer) so that the web view in a
 * browser keeps the web frame regardless of how narrow the window is.
 *
 * Returns true when EITHER:
 *   - the page is launched in standalone display mode (PWA installed), OR
 *   - the URL path is under /pwa/ (explicit PWA route).
 */
function detectPWAMode(): boolean {
  if (typeof window === "undefined") return false;
  let inIframe = false;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }
  // Iframe contexts (Replit preview, embeds, etc.) are always treated as web view.
  if (inIframe) return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches
    || (window.navigator as any).standalone === true;
  return standalone;
}

export function useIsPWAMode() {
  const [isPWA, setIsPWA] = React.useState<boolean>(() => detectPWAMode());

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(display-mode: standalone)");
    const update = () => setIsPWA(detectPWAMode());
    mql.addEventListener?.("change", update);
    window.addEventListener("popstate", update);
    return () => {
      mql.removeEventListener?.("change", update);
      window.removeEventListener("popstate", update);
    };
  }, []);

  return isPWA;
}

/**
 * Hook to detect if the current viewport is mobile-sized.
 * Returns boolean indicating mobile state.
 * During initial detection (SSR/hydration), returns false.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

/**
 * Hook to detect viewport size with loading state.
 * Returns { isMobile, isLoading } where isLoading is true until detection completes.
 * Use this for PWA pages that need to redirect based on screen size.
 */
export function useViewportDetection() {
  const [state, setState] = React.useState<{
    isMobile: boolean | null;
    isLoading: boolean;
  }>({
    isMobile: null,
    isLoading: true,
  });

  React.useEffect(() => {
    const checkViewport = () => {
      const isMobileView = window.innerWidth < MOBILE_BREAKPOINT;
      setState({
        isMobile: isMobileView,
        isLoading: false,
      });
    };

    // Initial check
    checkViewport();

    // Listen for resize
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => checkViewport();
    mql.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);

    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  return state;
}
