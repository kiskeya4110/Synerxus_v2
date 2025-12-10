import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import EmployeeEngagementTab from "./employee-engagement-tab";
import Footer from "@/components/layout/footer";

export default function EmployeeEngagementTabPage() {
  const [, setLocation] = useLocation();
  const userId = localStorage.getItem("currentUserId");

  return (
    <div style={{ height: "100vh", backgroundColor: "#faf9f7", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: "#1e3a8a",
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
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "none",
            borderRadius: "8px",
            padding: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft style={{ width: "20px", height: "20px", color: "white" }} />
        </button>
        <div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              color: "white",
              margin: 0,
            }}
          >
            Employee Engagement Analytics
          </h1>
          <p style={{ fontSize: "12px", color: "#93c5fd", margin: "4px 0 0 0" }}>
            Track volunteer participation and performance metrics
          </p>
        </div>
      </div>

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
