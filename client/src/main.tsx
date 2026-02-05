import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import App from "./App";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import ErrorBoundary from "@/components/error-boundary";
import "./index.css";
import "./service-worker-register";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SidebarProvider>
          <AuthProvider>
            <OnboardingProvider steps={[]}>
              <App />
            </OnboardingProvider>
          </AuthProvider>
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);
