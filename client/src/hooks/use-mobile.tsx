import * as React from "react"

const MOBILE_BREAKPOINT = 768

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
      const newIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
      console.log('[useIsMobile] Width changed:', window.innerWidth, '< ', MOBILE_BREAKPOINT, '=', newIsMobile);
      setIsMobile(newIsMobile)
    }
    mql.addEventListener("change", onChange)
    const initialIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
    console.log('[useIsMobile] Initial:', window.innerWidth, '< ', MOBILE_BREAKPOINT, '=', initialIsMobile);
    setIsMobile(initialIsMobile)
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
