import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

interface SidebarContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Always start closed (autohide mode) - users can toggle it open
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Memoize callbacks to prevent unnecessary re-renders
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Memoize the context value to prevent child re-renders when parent re-renders
  const value = useMemo(() => ({
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
  }), [sidebarOpen, toggleSidebar]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebarContext must be used within a SidebarProvider");
  }
  return context;
}
