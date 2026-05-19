import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import App from "./App";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import { ABTestingProvider } from "@/contexts/ab-testing-context";
import ErrorBoundary from "@/components/error-boundary";

export default function FullAppShell() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SidebarProvider>
            <AuthProvider>
              <ABTestingProvider>
                <OnboardingProvider steps={[]}>
                  <App />
                </OnboardingProvider>
              </ABTestingProvider>
            </AuthProvider>
          </SidebarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
