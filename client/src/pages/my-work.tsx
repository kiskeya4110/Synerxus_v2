import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { getAuthHeaders } from "@/lib/queryClient";
import { ArrowLeft, Plus, FileText } from "lucide-react";
import { useViewportDetection } from "@/hooks/use-mobile";
import VolunteerNav from "@/components/layout/volunteer-nav";
import Footer from "@/components/layout/footer";
import DashboardMobileNav from "@/components/dashboard/shared/DashboardMobileNav";
import { getSDGColor } from "@shared/sdg-goals";

/**
 * History Page (MVP) — Simple chronological list of submitted activity logs
 * with review status. No tabs, no charts, no search.
 */
export default function MyWork() {
  const [, navigate] = useLocation();
  const { isMobile, isLoading: isViewportLoading } = useViewportDetection();

  const userId = typeof window !== "undefined" ? localStorage.getItem("currentUserId") : null;

  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "rejected">("all");
  const [visibleCount, setVisibleCount] = useState(20);

  // Fetch all activity logs for this user
  const { data: allLogs = [], isLoading } = useQuery({
    queryKey: ["/api/logs", userId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/logs?user_id=${userId}`, {
        headers, credentials: "include"
      });
      if (!response.ok) return [];
      const logs = await response.json();
      return Array.isArray(logs) ? logs : [];
    },
    enabled: !!userId,
  });

  // Filter + sort newest first
  const filteredLogs = useMemo(() => {
    const statusMap: Record<string, string> = {
      pending: "pending",
      verified: "approved",
      rejected: "rejected",
    };
    const logs =
      filter === "all"
        ? [...allLogs]
        : allLogs.filter((l: any) => l.verificationStatus === statusMap[filter]);
    return logs.sort(
      (a: any, b: any) =>
        new Date(b.date || b.createdAt).getTime() -
        new Date(a.date || a.createdAt).getTime()
    );
  }, [allLogs, filter]);

  // Counts for filter pills
  const counts = useMemo(() => ({
    pending: allLogs.filter((l: any) => l.verificationStatus === "pending").length,
    verified: allLogs.filter((l: any) => l.verificationStatus === "approved").length,
    rejected: allLogs.filter((l: any) => l.verificationStatus === "rejected").length,
  }), [allLogs]);

  const handleFilterChange = (f: typeof filter) => {
    setFilter(f);
    setVisibleCount(20);
  };

  // Loading state
  if (isViewportLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // Not logged in
  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Please log in to view your history</p>
          <button
            onClick={() => navigate("/landing")}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Shared filter pills
  const filterPills = (compact: boolean) => (
    <div className="flex gap-2 flex-wrap">
      {(["all", "pending", "verified", "rejected"] as const).map((f) => (
        <button
          key={f}
          onClick={() => handleFilterChange(f)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === f
              ? "bg-emerald-600 text-white"
              : compact
                ? "bg-white text-stone-600 border border-stone-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          {f !== "all" && (
            <span className="ml-1.5 opacity-70">
              ({counts[f]})
            </span>
          )}
        </button>
      ))}
    </div>
  );

  // Shared log card renderer
  const renderLogCard = (log: any, compact: boolean) => {
    const logDate = new Date(log.date || log.createdAt);
    const status = log.verificationStatus || "pending";
    const sdgTags: number[] = log.sdgTags || log.project?.sdgGoals || [];
    const firstSdg = sdgTags.length > 0 ? sdgTags[0] : null;

    if (compact) {
      // Mobile card
      return (
        <div key={log.id} className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 space-y-2">
          {/* Row 1: Date + Hours + Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-stone-700">
              <span className="font-medium">
                {logDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              {log.hours != null && log.hours > 0 && (
                <>
                  <span className="text-stone-300">|</span>
                  <span>{log.hours} hrs</span>
                </>
              )}
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                status === "approved"
                  ? "bg-emerald-100 text-emerald-700"
                  : status === "rejected"
                    ? "bg-red-100 text-red-700"
                    : status === "incomplete"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-amber-100 text-amber-700"
              }`}
            >
              {status === "approved" ? "✓ Confirmed" : status === "rejected" ? "✗ Rejected" : status === "incomplete" ? "⚠ Needs Update" : "⏳ Pending"}
            </span>
          </div>

          {/* Row 2: Outcome + SDG */}
          <div className="flex items-center gap-2 flex-wrap">
            {(log.outcomes || log.outcomeQuantity) && (
              <span className="text-sm text-stone-700">
                {log.outcomes || "Outcome"}
                {log.outcomeQuantity ? ` (${log.outcomeQuantity})` : ""}
              </span>
            )}
            {firstSdg && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: getSDGColor(firstSdg) }}
              >
                SDG {firstSdg}
              </span>
            )}
          </div>

          {/* Row 3: Project/NGO name */}
          <p className="text-xs text-stone-500">{log.project?.name || "Unknown Project"}</p>

          {/* Rejection reason */}
          {status === "rejected" && log.rejectedReason && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              Reason: &ldquo;{log.rejectedReason}&rdquo;
            </p>
          )}
        </div>
      );
    }

    // Desktop row
    return (
      <div key={log.id} className="flex items-center gap-6 px-6 py-4 hover:bg-gray-50 transition-colors">
        {/* Date */}
        <div className="w-20 flex-shrink-0">
          <p className="text-sm font-semibold text-gray-900">
            {logDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>

        {/* Hours */}
        <div className="w-16 flex-shrink-0 text-center">
          <p className="text-sm font-medium text-gray-600">
            {log.hours != null && log.hours > 0 ? `${log.hours} hrs` : "—"}
          </p>
        </div>

        {/* Status */}
        <div className="w-24 flex-shrink-0">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              status === "approved"
                ? "bg-emerald-100 text-emerald-700"
                : status === "rejected"
                  ? "bg-red-100 text-red-700"
                  : status === "incomplete"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-amber-100 text-amber-700"
            }`}
          >
            {status === "approved" ? "✓ Confirmed" : status === "rejected" ? "✗ Rejected" : status === "incomplete" ? "⚠ Needs Update" : "⏳ Pending"}
          </span>
        </div>

        {/* Outcome + SDG + Project */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {(log.outcomes || log.outcomeQuantity) && (
              <span className="text-sm font-medium text-gray-900">
                {log.outcomes || "Outcome"}
                {log.outcomeQuantity ? ` (${log.outcomeQuantity})` : ""}
              </span>
            )}
            {firstSdg && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: getSDGColor(firstSdg) }}
              >
                SDG {firstSdg}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{log.project?.name || "Unknown Project"}</p>
          {status === "rejected" && log.rejectedReason && (
            <p className="text-xs text-red-600 mt-1">
              Reason: &ldquo;{log.rejectedReason}&rdquo;
            </p>
          )}
        </div>
      </div>
    );
  };

  // Empty state
  const emptyState = (compact: boolean) => (
    <div className={compact
      ? "bg-white rounded-xl border border-stone-200 shadow-sm p-8 text-center"
      : "bg-white rounded-xl border border-gray-200 p-12 text-center"
    }>
      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p className="text-sm font-medium text-gray-900 mb-1">
        {filter === "all"
          ? "No activity logged yet."
          : `No ${filter} records found.`}
      </p>
      {filter === "all" && (
        <>
          <p className="text-xs text-gray-500 mb-4">
            Submit your first activity to start building your contribution record.
          </p>
          <button
            onClick={() => navigate("/log-activity")}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4 inline mr-1" />
            Log Activity
          </button>
        </>
      )}
    </div>
  );

  // Mobile PWA view
  if (isMobile === true) {
    return (
      <div className="min-h-screen pwa-gradient-bg pb-20">
        {/* Header */}
        <header
          className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-stone-200"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-1.5 -ml-1 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
            <h1 className="text-lg font-bold text-stone-900">History</h1>
          </div>
        </header>

        {/* Spacer for fixed header */}
        <div className="flex-shrink-0" style={{ height: "calc(env(safe-area-inset-top, 0px) + 56px)" }} />

        <main className="px-4 py-4 space-y-4">
          {/* Filter pills */}
          {filterPills(true)}

          {/* Log list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            emptyState(true)
          ) : (
            <>
              <div className="space-y-3">
                {filteredLogs.slice(0, visibleCount).map((log: any) => renderLogCard(log, true))}
              </div>

              {filteredLogs.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount((prev) => prev + 20)}
                  className="w-full py-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-white rounded-xl border border-stone-200 shadow-sm"
                >
                  Load More ({filteredLogs.length - visibleCount} remaining)
                </button>
              )}
            </>
          )}
        </main>

        <DashboardMobileNav
          userType="volunteer"
          activeTab="history"
          onLogImpact={() => navigate("/log-activity")}
          onTabChange={(tab: string) => {
            if (tab === 'home') navigate('/dashboard');
            else if (tab === 'wallet') navigate('/dashboard');
            else if (tab === 'projects') navigate('/dashboard');
            else if (tab === 'history') { /* already here */ }
          }}
        />
      </div>
    );
  }

  // Desktop view
  return (
    <div className="min-h-screen bg-gray-50">
      <VolunteerNav />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">History</h1>
          </div>
        </div>

        {/* Filter pills */}
        {filterPills(false)}

        {/* Log list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : filteredLogs.length === 0 ? (
          emptyState(false)
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {filteredLogs.slice(0, visibleCount).map((log: any) => renderLogCard(log, false))}
              </div>
            </div>

            {filteredLogs.length > visibleCount && (
              <button
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="w-full py-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                Load More ({filteredLogs.length - visibleCount} remaining)
              </button>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
