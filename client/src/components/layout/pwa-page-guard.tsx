import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useViewportDetection } from "@/hooks/use-mobile";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";

interface PWAPageGuardProps {
  children: ReactNode;
  /** Route to redirect to when viewport is desktop-sized */
  desktopRoute: string;
  /** Optional: Route to redirect non-organization users */
  nonOrgRoute?: string;
  /** Check if user is organization type */
  userType?: string | null;
}

/**
 * PWA Page Guard Component
 *
 * This component wraps PWA pages to:
 * 1. Show a loading state while detecting viewport size
 * 2. Redirect to desktop view if viewport is not mobile
 * 3. Redirect non-organization users if needed
 * 4. Prevent rendering of mobile-specific content on desktop
 *
 * Usage:
 * ```tsx
 * export default function MyPWAPage() {
 *   return (
 *     <PWAPageGuard desktopRoute="/my-desktop-page" userType={userType}>
 *       <YourPWAContent />
 *     </PWAPageGuard>
 *   );
 * }
 * ```
 */
export default function PWAPageGuard({
  children,
  desktopRoute,
  nonOrgRoute = "/volunteer-dashboard",
  userType,
}: PWAPageGuardProps) {
  const [, navigate] = useLocation();
  const { isMobile, isLoading } = useViewportDetection();

  // Redirect to desktop view when not on mobile
  useEffect(() => {
    if (!isLoading && !isMobile) {
      navigate(desktopRoute);
    }
  }, [isLoading, isMobile, desktopRoute, navigate]);

  // Redirect non-organization users
  useEffect(() => {
    if (userType && userType !== "organization") {
      navigate(nonOrgRoute);
    }
  }, [userType, nonOrgRoute, navigate]);

  // Show loading state while detecting viewport
  if (isLoading) {
    return (
      <div className="fixed inset-0 h-screen w-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <img
            src={logoUrl}
            alt="Synerxus"
            className="h-16 object-contain animate-pulse"
          />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // If not mobile, don't render content (redirect will happen)
  if (!isMobile) {
    return (
      <div className="fixed inset-0 h-screen w-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <img
            src={logoUrl}
            alt="Synerxus"
            className="h-16 object-contain"
          />
          <p className="text-sm text-slate-500">Redirecting to full view...</p>
        </div>
      </div>
    );
  }

  // Render PWA content
  return <>{children}</>;
}

/**
 * Loading skeleton for PWA pages
 * Use this for consistent loading states within PWA content
 */
export function PWALoadingSkeleton() {
  return (
    <div className="fixed inset-0 h-screen w-screen bg-[#faf9f7] flex flex-col overflow-hidden z-40 max-w-[428px] mx-auto">
      {/* Header skeleton */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          background: 'linear-gradient(to right, #fffbeb 0%, #fef3c7 30%, #fcd34d 70%, #f59e0b 100%)',
        }}
      >
        <div className="h-10 w-32 bg-white/30 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-white/30 rounded-full animate-pulse" />
          <div className="h-10 w-10 bg-white/30 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 animate-pulse">
              <div className="h-5 w-5 bg-slate-200 rounded mx-auto mb-2" />
              <div className="h-6 w-16 bg-slate-200 rounded mx-auto mb-1" />
              <div className="h-3 w-12 bg-slate-200 rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* List items skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-200 rounded" />
              </div>
              <div className="h-6 w-16 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom nav skeleton */}
      <div className="bg-white border-t border-slate-200 px-4 py-3">
        <div className="flex justify-around">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-6 w-6 bg-slate-200 rounded animate-pulse" />
              <div className="h-2 w-8 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
