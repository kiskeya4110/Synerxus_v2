/**
 * Skeleton Preset Components
 *
 * Pre-built skeleton layouts for common UI patterns.
 * Uses the base Skeleton component with optimized shimmer animation.
 *
 * Usage:
 * - DashboardSkeleton: For main dashboard pages
 * - CardListSkeleton: For card-based list views
 * - TableSkeleton: For data tables
 * - ProfileSkeleton: For user profiles
 * - StatsSkeleton: For statistics cards
 */

import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

// =============================================================================
// DASHBOARD SKELETONS
// =============================================================================

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartSkeleton />
        <ActivityListSkeleton count={5} />
      </div>

      {/* Secondary Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ContentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="flex items-end justify-between h-64 space-x-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${Math.random() * 60 + 40}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// LIST SKELETONS
// =============================================================================

export function CardListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ContentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ContentCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start space-x-4">
        <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>
    </div>
  );
}

export function ActivityListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <Skeleton className="h-5 w-32 mb-4" />
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <ActivityItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ActivityItemSkeleton() {
  return (
    <div className="flex items-center space-x-4 py-2">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

// =============================================================================
// TABLE SKELETONS
// =============================================================================

export function TableSkeleton({
  columns = 5,
  rows = 10,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Table Header */}
      <div className="bg-muted/50 p-4 border-b">
        <div className="flex items-center space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("h-4", i === 0 ? "w-32" : "flex-1")}
            />
          ))}
        </div>
      </div>

      {/* Table Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="flex items-center space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className={cn(
                    "h-4",
                    colIndex === 0 ? "w-32" : "flex-1"
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// PROFILE SKELETONS
// =============================================================================

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center space-x-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex space-x-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Profile Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Profile Content */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

// =============================================================================
// PROJECT/OPPORTUNITY SKELETONS
// =============================================================================

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Image placeholder */}
      <Skeleton className="h-40 w-full" />

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-16 rounded-full" />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      </div>
    </div>
  );
}

export function OpportunityListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <OpportunityItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function OpportunityItemSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center space-x-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex space-x-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-12 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-9 w-24 rounded" />
      </div>
    </div>
  );
}

// =============================================================================
// MESSAGE SKELETONS
// =============================================================================

export function MessageListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <MessageItemSkeleton key={i} isOwn={i % 3 === 0} />
      ))}
    </div>
  );
}

export function MessageItemSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-lg p-3",
          isOwn ? "bg-primary/10" : "bg-muted"
        )}
      >
        <Skeleton className={cn("h-4", isOwn ? "w-48" : "w-64")} />
        <Skeleton className="h-3 w-20 mt-2" />
      </div>
    </div>
  );
}

// =============================================================================
// NOTIFICATION SKELETONS
// =============================================================================

export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationItemSkeleton key={i} />
      ))}
    </div>
  );
}

export function NotificationItemSkeleton() {
  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

// =============================================================================
// FORM SKELETONS
// =============================================================================

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <div className="flex justify-end space-x-3 pt-4">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  );
}

// =============================================================================
// PAGE LAYOUT SKELETONS
// =============================================================================

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between pb-6 border-b">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex space-x-3">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Logo */}
      <Skeleton className="h-10 w-32 mb-8" />

      {/* Nav items */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}

      {/* Footer */}
      <div className="absolute bottom-4 left-4 right-4">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default {
  DashboardSkeleton,
  StatCardSkeleton,
  ChartSkeleton,
  CardListSkeleton,
  ContentCardSkeleton,
  ActivityListSkeleton,
  ActivityItemSkeleton,
  TableSkeleton,
  ProfileSkeleton,
  ProjectCardSkeleton,
  OpportunityListSkeleton,
  OpportunityItemSkeleton,
  MessageListSkeleton,
  MessageItemSkeleton,
  NotificationListSkeleton,
  NotificationItemSkeleton,
  FormSkeleton,
  PageHeaderSkeleton,
  SidebarSkeleton,
};
