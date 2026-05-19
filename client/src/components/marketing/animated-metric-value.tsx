import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type AnimatedMetricValueProps = {
  value: string;
  active?: boolean;
  duration?: number;
  repeatDelay?: number;
};

type ParsedMetric = {
  prefix: string;
  target: number;
  suffix: string;
  fractionDigits: number;
};

function parseMetricValue(value: string): ParsedMetric | null {
  const match = value.match(/^([^0-9+-]*)([+-]?\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!match) return null;

  const numericText = match[2];
  const target = Number(numericText.replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;

  return {
    prefix: match[1],
    target,
    suffix: match[3],
    fractionDigits: numericText.includes(".") ? numericText.split(".")[1].length : 0,
  };
}

function formatMetricValue(value: number, parsed: ParsedMetric) {
  const formattedNumber = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: parsed.fractionDigits,
    maximumFractionDigits: parsed.fractionDigits,
  }).format(value);

  return `${parsed.prefix}${formattedNumber}${parsed.suffix}`;
}

export function AnimatedMetricValue({
  value,
  active = true,
  duration = 1.8,
  repeatDelay = 0.9,
}: AnimatedMetricValueProps) {
  const shouldReduceMotion = useReducedMotion();
  const parsed = useMemo(() => parseMetricValue(value), [value]);
  const counter = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(value);

  useMotionValueEvent(counter, "change", (latest) => {
    if (!parsed) return;
    setDisplayValue(formatMetricValue(latest, parsed));
  });

  useEffect(() => {
    if (!parsed || !active || shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    counter.set(0);
    setDisplayValue(formatMetricValue(0, parsed));

    const controls = animate(counter, parsed.target, {
      duration,
      ease: "easeOut",
      repeat: Infinity,
      repeatDelay,
      repeatType: "loop",
    });

    return () => controls.stop();
  }, [active, counter, duration, parsed, repeatDelay, shouldReduceMotion, value]);

  return <>{displayValue}</>;
}
