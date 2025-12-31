// client/src/components/ui/lazy-chart.tsx
// Lazy-loaded recharts components - only loads when chart is rendered
// This prevents loading 411KB of chart code on pages that don't use charts

import { lazy, Suspense, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Chart loading skeleton
function ChartSkeleton({ height = 300, className = '' }: { height?: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-slate-50 rounded-lg ${className}`}
      style={{ height }}
    >
      <Skeleton className="w-full h-full rounded-lg" />
    </div>
  );
}

// Lazy load chart components
const LazyPieChartComponent = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.PieChart }))
);

const LazyBarChartComponent = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.BarChart }))
);

const LazyLineChartComponent = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.LineChart }))
);

const LazyAreaChartComponent = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.AreaChart }))
);

const LazyRadarChartComponent = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.RadarChart }))
);

const LazyResponsiveContainerComponent = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.ResponsiveContainer }))
);

// Create wrapper components with Suspense
function createLazyChartWrapper<P extends object>(
  LazyComponent: ComponentType<P>,
  displayName: string
) {
  const Wrapper = (props: P & { height?: number }) => {
    return (
      <Suspense fallback={<ChartSkeleton height={props.height || 300} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
  Wrapper.displayName = displayName;
  return Wrapper;
}

// Export lazy chart components
export const PieChartLazy = createLazyChartWrapper(LazyPieChartComponent, 'PieChartLazy');
export const BarChartLazy = createLazyChartWrapper(LazyBarChartComponent, 'BarChartLazy');
export const LineChartLazy = createLazyChartWrapper(LazyLineChartComponent, 'LineChartLazy');
export const AreaChartLazy = createLazyChartWrapper(LazyAreaChartComponent, 'AreaChartLazy');
export const RadarChartLazy = createLazyChartWrapper(LazyRadarChartComponent, 'RadarChartLazy');

// ResponsiveContainer with Suspense
export function ResponsiveContainerLazy(props: {
  width?: number | string;
  height?: number | string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Suspense fallback={<ChartSkeleton height={typeof props.height === 'number' ? props.height : 300} />}>
      <LazyResponsiveContainerComponent {...props} />
    </Suspense>
  );
}

// Export the skeleton for use in other components
export { ChartSkeleton };
