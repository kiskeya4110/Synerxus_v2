import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import EmployeeEngagementTab from "./employee-engagement-tab";
import Footer from "@/components/layout/footer";
import CSRMobileNav, { CSRMobileHeader } from "@/components/layout/csr-mobile-nav";

export default function EmployeeEngagementTabPage() {
  const [, setLocation] = useLocation();
  const userId = localStorage.getItem("currentUserId");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile PWA View
  if (isMobile) {
    return (
      <div className="h-screen bg-[#faf9f7] flex flex-col max-w-[428px] mx-auto overflow-hidden">
        <CSRMobileHeader
          title="Employee Engagement"
          showBackButton
          onBack={() => setLocation("/csr-dashboard")}
        />

        <main className="flex-1 overflow-y-auto pb-16 px-3 pt-3">
          <EmployeeEngagementTab userId={userId} />
          <Footer />
        </main>

        <CSRMobileNav activeTab="employees" />
      </div>
    );
  }

  // Desktop View
  return (
    <div style={{ height: "100vh", backgroundColor: "#faf9f7", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header - Lighter gradient for logo contrast */}
      <header
        style={{
          background: "linear-gradient(135deg, #3B82F6 0%, #38BDF8 50%, #7DD3FC 75%, #E0F2FE 100%)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setLocation("/csr-dashboard")}
          style={{
            backgroundColor: "rgba(30, 41, 59, 0.1)",
            border: "none",
            borderRadius: "8px",
            padding: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              color: "#1e293b",
              margin: 0,
            }}
          >
            Employee Engagement Analytics
          </h1>
          <p style={{ fontSize: "12px", color: "#475569", margin: "4px 0 0 0" }}>
            Track volunteer participation and performance metrics
          </p>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
          <EmployeeEngagementTab userId={userId} />
        </div>
        <Footer />
      </main>
    </div>
  );
}
