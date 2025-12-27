/**
 * Skeleton Components for CSR Dashboard
 * Loading states for various dashboard sections
 */

import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const ChartSkeleton = memo(({ height = "h-64" }: { height?: string }) => (
  <div className={`${height} bg-slate-100 animate-pulse rounded-lg flex items-center justify-center`}>
    <div className="text-slate-400 text-sm">Loading chart...</div>
  </div>
));
ChartSkeleton.displayName = "ChartSkeleton";

export const MapSkeleton = memo(() => (
  <div className="h-64 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">
    <div className="text-slate-400 text-sm">Loading map...</div>
  </div>
));
MapSkeleton.displayName = "MapSkeleton";

export const TableSkeleton = memo(({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
));
TableSkeleton.displayName = "TableSkeleton";

export const CardSkeleton = memo(() => (
  <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-3 w-20" />
  </div>
));
CardSkeleton.displayName = "CardSkeleton";

export const StatCardSkeleton = memo(() => (
  <div className="p-4 bg-white rounded-lg border border-slate-200">
    <div className="flex items-center justify-between mb-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-5 w-5 rounded" />
    </div>
    <Skeleton className="h-8 w-16 mb-1" />
    <div className="flex items-center">
      <Skeleton className="h-3 w-10 mr-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
));
StatCardSkeleton.displayName = "StatCardSkeleton";

export const LeaderboardSkeleton = memo(({ entries = 5 }: { entries?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: entries }).map((_, i) => (
      <div
        key={i}
        className="flex items-center p-3 bg-slate-50 rounded-lg"
      >
        <Skeleton className="h-6 w-6 mr-3" />
        <Skeleton className="h-8 w-8 rounded-full mr-3" />
        <div className="flex-1">
          <Skeleton className="h-4 w-28 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
    ))}
  </div>
));
LeaderboardSkeleton.displayName = "LeaderboardSkeleton";

export const DashboardSkeleton = memo(() => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-10" />
      </div>
    </div>

    {/* Stats grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>

    {/* Main content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <Skeleton className="h-5 w-32 mb-4" />
        <ChartSkeleton height="h-48" />
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <Skeleton className="h-5 w-32 mb-4" />
        <TableSkeleton rows={4} />
      </div>
    </div>
  </div>
));
DashboardSkeleton.displayName = "DashboardSkeleton";

export default {
  ChartSkeleton,
  MapSkeleton,
  TableSkeleton,
  CardSkeleton,
  StatCardSkeleton,
  LeaderboardSkeleton,
  DashboardSkeleton,
};
