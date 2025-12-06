import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

/**
 * Custom hook for animating number counting
 * @param value - The target number to count to
 * @param duration - Animation duration in seconds (default: 1.5)
 * @returns The animated value
 */
export function useCounterAnimation(value: number, duration: number = 1.5) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [motionValue, isInView, value]);

  return { ref, value: springValue };
}
