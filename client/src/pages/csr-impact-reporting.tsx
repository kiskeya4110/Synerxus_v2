import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { BarChart3, TrendingUp, Users, DollarSign, Globe, CheckCircle, Home, ArrowLeft, Download, Share2 } from "lucide-react";
import { useState } from "react";

interface ImpactData {
  reportPeriod: string;
  engagementMetrics: {
    totalHours: number;
    activeEmployees: number;
    avgHoursPerEmployee: number;
    participationRate: number;
    hoursPerMonth: Record<string, number>;
  };
  impactMetrics: {
    directBeneficiaries: number;
    indirectBeneficiaries: number;
    estimatedLivesTouched: number;
    impactPerHour: number;
  };
  financialMetrics: {
    volunteerHourValue: number;
    estimatedCostIfPaidStaff: number;
    costPerBeneficiary: number;
    roi: number;
    programCost: number;
  };
  sdgMetrics: Array<{ goal: number; hours: number; percentage: number }>;
  projectMetrics: Array<any>;
  benchmarks: {
    avgHoursPerEmployeeBenchmark: number;
    participationRateBenchmark: number;
    costPerBeneficiaryBenchmark: number;
    yourMetrics: {
      hoursPerEmployee: number;
      participationRate: number;
      costPerBeneficiary: number;
    };
  };
  complianceStatus: {
    bCorpReady: boolean;
    griAligned: boolean;
    esGRating: number;
    complianceScores?: {
      bCorpScore: number;
      griScore: number;
      isoScore: number;
      sasbScore: number;
    };
    avgComplianceScore?: number;
  };
}

export function CSRImpactReporting() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedTab, setSelectedTab] = useState("executive");
  const [isExporting, setIsExporting] = useState(false);

  const userId = typeof window !== "undefined" ? localStorage.getItem("currentUserId") : null;
  
  const { data: impactData, isLoading } = useQuery<ImpactData>({
    queryKey: ["/api/csr/impact-reporting", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/impact-reporting?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch impact data");
      return response.json();
    },
    enabled: !!userId
  });

  const currentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const companyName = "Home Corporation";

  const exportToCSV = async () => {
    if (!impactData) return;
    setIsExporting(true);
    try {
      const headers = ["Metric", "Value"];
      const rows = [
        ["CSR Impact Report", ""],
        ["Company", companyName],
        ["Report Period", impactData.reportPeriod],
        ["Generated", currentDate],
        ["", ""],
        ["ENGAGEMENT METRICS", ""],
        ["Total Hours", impactData.engagementMetrics.totalHours],
        ["Active Employees", impactData.engagementMetrics.activeEmployees],
        ["Avg Hours/Employee", impactData.engagementMetrics.avgHoursPerEmployee],
        ["Participation Rate", `${impactData.engagementMetrics.participationRate}%`],
        ["", ""],
        ["IMPACT METRICS", ""],
        ["Direct Beneficiaries", impactData.impactMetrics.directBeneficiaries],
        ["Lives Touched", impactData.impactMetrics.estimatedLivesTouched],
        ["Impact per Hour", impactData.impactMetrics.impactPerHour],
        ["", ""],
        ["FINANCIAL METRICS", ""],
        ["Volunteer Hour Value", `$${impactData.financialMetrics.volunteerHourValue}`],
        ["Cost if Paid Staff", `$${impactData.financialMetrics.estimatedCostIfPaidStaff}`],
        ["ROI", `${impactData.financialMetrics.roi}%`],
        ["", ""],
        ["COMPLIANCE STATUS", ""],
        ["B-Corp Ready", impactData.complianceStatus.bCorpReady ? "Yes" : "No"],
        ["GRI Aligned", impactData.complianceStatus.griAligned ? "Yes" : "No"],
        ["B-Corp Score", impactData.complianceStatus.complianceScores?.bCorpScore || "N/A"],
        ["GRI Score", impactData.complianceStatus.complianceScores?.griScore || "N/A"],
        ["ISO Score", impactData.complianceStatus.complianceScores?.isoScore || "N/A"],
        ["SASB Score", impactData.complianceStatus.complianceScores?.sasbScore || "N/A"],
      ];

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `CSR_Impact_Report_${impactData.reportPeriod}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSV export failed:", error);
      alert("Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!impactData) return;
    setIsExporting(true);
    
    const pdfContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1e3a8a; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
            h2 { color: #1e3a8a; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            td { padding: 8px; border: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .header { background-color: #1e3a8a; color: white; font-weight: bold; }
            .metric { font-weight: bold; color: #111827; }
            .value { text-align: right; }
          </style>
        </head>
        <body>
          <h1>CSR Impact Report - ${companyName}</h1>
          <p><strong>Report Period:</strong> ${impactData.reportPeriod}</p>
          <p><strong>Generated:</strong> ${currentDate}</p>
          
          <h2>Engagement Metrics</h2>
          <table>
            <tr class="header"><td>Metric</td><td class="value">Value</td></tr>
            <tr><td class="metric">Total Hours</td><td class="value">${impactData.engagementMetrics.totalHours}</td></tr>
            <tr><td class="metric">Active Employees</td><td class="value">${impactData.engagementMetrics.activeEmployees}</td></tr>
            <tr><td class="metric">Avg Hours/Employee</td><td class="value">${impactData.engagementMetrics.avgHoursPerEmployee}</td></tr>
            <tr><td class="metric">Participation Rate</td><td class="value">${impactData.engagementMetrics.participationRate}%</td></tr>
          </table>

          <h2>Impact Metrics</h2>
          <table>
            <tr class="header"><td>Metric</td><td class="value">Value</td></tr>
            <tr><td class="metric">Direct Beneficiaries</td><td class="value">${impactData.impactMetrics.directBeneficiaries}</td></tr>
            <tr><td class="metric">Lives Touched</td><td class="value">${impactData.impactMetrics.estimatedLivesTouched}</td></tr>
            <tr><td class="metric">Impact per Hour</td><td class="value">${impactData.impactMetrics.impactPerHour}</td></tr>
          </table>

          <h2>Financial Metrics</h2>
          <table>
            <tr class="header"><td>Metric</td><td class="value">Value</td></tr>
            <tr><td class="metric">Volunteer Hour Value</td><td class="value">$${impactData.financialMetrics.volunteerHourValue}</td></tr>
            <tr><td class="metric">Cost if Paid Staff</td><td class="value">$${impactData.financialMetrics.estimatedCostIfPaidStaff}</td></tr>
            <tr><td class="metric">ROI</td><td class="value">${impactData.financialMetrics.roi}%</td></tr>
          </table>

          <h2>Compliance Status</h2>
          <table>
            <tr class="header"><td>Framework</td><td class="value">Score/Status</td></tr>
            <tr><td class="metric">B-Corp</td><td class="value">${impactData.complianceStatus.complianceScores?.bCorpScore || "N/A"}</td></tr>
            <tr><td class="metric">GRI</td><td class="value">${impactData.complianceStatus.complianceScores?.griScore || "N/A"}</td></tr>
            <tr><td class="metric">ISO 26000</td><td class="value">${impactData.complianceStatus.complianceScores?.isoScore || "N/A"}</td></tr>
            <tr><td class="metric">SASB</td><td class="value">${impactData.complianceStatus.complianceScores?.sasbScore || "N/A"}</td></tr>
          </table>
        </body>
      </html>
    `;

    try {
      const { jsPDF } = await import("jspdf");
      const html2Canvas = (await import("html2canvas")).default;
      
      // Create element with PDF content
      const element = document.createElement("div");
      element.innerHTML = pdfContent;
      element.style.padding = "20px";
      element.style.width = "800px";
      element.style.backgroundColor = "white";
      document.body.appendChild(element);
      
      // Convert to canvas then PDF
      const canvas = await html2Canvas(element, { scale: 2, backgroundColor: "#ffffff" });
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, width, height);
      pdf.save(`CSR_Impact_Report_${impactData.reportPeriod}.pdf`);
      document.body.removeChild(element);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Failed to export PDF. Using fallback...");
      // Fallback: download as HTML
      try {
        const blob = new Blob([pdfContent], { type: "text/html;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `CSR_Impact_Report_${impactData.reportPeriod}.html`;
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (fallbackError) {
        console.error("Fallback export failed:", fallbackError);
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>⏳</div>
          <p style={{ color: "#6b7280", fontSize: "16px" }}>Loading impact metrics...</p>
        </div>
      </div>
    );
  }

  const KPICard = ({ label, value, unit, icon, trend }: any) => (
    <div style={{
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "20px",
      border: "1px solid #e5e7eb",
      flex: "1",
      minWidth: "200px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>{label}</span>
        <div style={{ fontSize: "20px" }}>{icon}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "32px", fontWeight: "bold", color: "#1e3a8a" }}>{value}</span>
        <span style={{ fontSize: "14px", color: "#6b7280" }}>{unit}</span>
      </div>
      {trend && (
        <div style={{ fontSize: "12px", color: "#059669", display: "flex", alignItems: "center", gap: "4px" }}>
          <TrendingUp style={{ width: "14px", height: "14px" }} />
          {trend}
        </div>
      )}
    </div>
  );

  const Section = ({ title, children, icon }: any) => (
    <div style={{ marginBottom: "40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", paddingBottom: "16px", borderBottom: "2px solid #e5e7eb" }}>
        <span style={{ fontSize: "24px" }}>{icon}</span>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#111827", margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#ffffff" }}>
      {/* Header */}
      <header style={{
        backgroundColor: "#1e3a8a",
        color: "white",
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "64px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => navigate("/csr-dashboard")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "white", padding: "4px" }}
          >
            <ArrowLeft style={{ width: "20px", height: "20px" }} />
          </button>
          <span style={{ fontSize: "24px", fontWeight: "bold", color: "#f97316" }}>✦</span>
          <span style={{ fontSize: "18px", fontWeight: "600" }}>Impact Reporting</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "14px", color: "#d1d5db" }}>{currentDate}</span>
          <button 
            onClick={exportToPDF}
            disabled={isExporting}
            style={{
              backgroundColor: isExporting ? "#6b7280" : "#059669",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: isExporting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: "500",
              opacity: isExporting ? 0.7 : 1,
              transition: "all 0.2s"
            }}
            data-testid="export-pdf-button"
          >
            <Download style={{ width: "16px", height: "16px" }} />
            {isExporting ? "Exporting..." : "Export PDF"}
          </button>
          <button 
            onClick={exportToCSV}
            disabled={isExporting}
            style={{
              backgroundColor: isExporting ? "#6b7280" : "#1e3a8a",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: isExporting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: "500",
              opacity: isExporting ? 0.7 : 1,
              transition: "all 0.2s"
            }}
            data-testid="export-csv-button"
          >
            <Download style={{ width: "16px", height: "16px" }} />
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar - Dark Navy matching CSR Dashboard */}
        <aside style={{
          width: "20%",
          backgroundColor: "#1e3a8a",
          color: "white",
          padding: "24px",
          flexShrink: 0,
          overflowY: "auto"
        }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { id: "executive", label: "Executive Summary", icon: "📊" },
              { id: "impact", label: "Impact & Performance", icon: "🎯" },
              { id: "compliance", label: "SDG & Compliance", icon: "✅" },
              { id: "projects", label: "Projects & Benchmarks", icon: "📁" }
            ].map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  backgroundColor: selectedTab === tab.id ? "rgba(59, 130, 246, 0.2)" : "transparent",
                  color: selectedTab === tab.id ? "#60a5fa" : "#d1d5db",
                  border: selectedTab === tab.id ? "1px solid rgba(59, 130, 246, 0.3)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: selectedTab === tab.id ? "600" : "500",
                  fontSize: "14px"
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: "40px", overflowY: "auto", backgroundColor: "#ffffff" }}>
          {selectedTab === "executive" && (
            <div>
              <div style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#111827", marginBottom: "8px" }}>
                  CSR Impact Dashboard
                </h1>
                <p style={{ color: "#6b7280", fontSize: "16px" }}>
                  {companyName} • Report Period: {impactData?.reportPeriod}
                </p>
              </div>

              <Section title="Key Performance Indicators" icon="🎯">
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <KPICard
                    label="Total Volunteer Hours"
                    value={impactData?.engagementMetrics?.totalHours || 0}
                    unit="hrs"
                    icon="⏱️"
                    trend="+12% vs last month"
                  />
                  <KPICard
                    label="Active Employees"
                    value={impactData?.engagementMetrics?.activeEmployees || 0}
                    unit="team members"
                    icon="👥"
                  />
                  <KPICard
                    label="Lives Touched"
                    value={impactData?.impactMetrics?.estimatedLivesTouched || 0}
                    unit="people"
                    icon="❤️"
                  />
                  <KPICard
                    label="Economic Value"
                    value={`$${impactData?.financialMetrics?.volunteerHourValue || 0}`}
                    unit="generated"
                    icon="💰"
                  />
                  <KPICard
                    label="ROI"
                    value={`${impactData?.financialMetrics?.roi || 0}%`}
                    unit="return"
                    icon="📈"
                  />
                  <KPICard
                    label="ESG Rating"
                    value={impactData?.complianceStatus?.esGRating || 0}
                    unit="/ 100"
                    icon="✨"
                  />
                </div>
              </Section>

              <Section title="Engagement Trends & Benchmarking" icon="📈">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px", marginBottom: "24px" }}>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Monthly Activity</div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", height: "120px" }}>
                      {Object.entries(impactData?.engagementMetrics?.hoursPerMonth || {}).slice(-6).map(([month, hours]: any) => (
                        <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <div style={{
                            height: `${(hours / 100) * 80}px`,
                            backgroundColor: "#3b82f6",
                            borderRadius: "4px",
                            minHeight: "8px",
                            width: "100%"
                          }} />
                          <span style={{ fontSize: "10px", color: "#6b7280" }}>{month?.substring(0, 3)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateRows: "repeat(3, 1fr)", gap: "12px" }}>
                    <div style={{ backgroundColor: "#f0fdf4", padding: "16px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                      <div style={{ fontSize: "12px", color: "#166534", fontWeight: "600" }}>Participation Rate</div>
                      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#059669" }}>{impactData?.engagementMetrics?.participationRate || 0}% <span style={{ fontSize: "12px", color: "#9ca3af" }}>vs {impactData?.benchmarks?.participationRateBenchmark}%</span></div>
                    </div>
                    <div style={{ backgroundColor: "#f0f9ff", padding: "16px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                      <div style={{ fontSize: "12px", color: "#1e40af", fontWeight: "600" }}>Avg Hours/Employee</div>
                      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1e3a8a" }}>{impactData?.engagementMetrics?.avgHoursPerEmployee || 0} <span style={{ fontSize: "12px", color: "#9ca3af" }}>vs {impactData?.benchmarks?.avgHoursPerEmployeeBenchmark}</span></div>
                    </div>
                    <div style={{ backgroundColor: "#fef3c7", padding: "16px", borderRadius: "8px", border: "1px solid #fde68a" }}>
                      <div style={{ fontSize: "12px", color: "#92400e", fontWeight: "600" }}>Cost per Beneficiary</div>
                      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#b45309" }}>${impactData?.financialMetrics?.costPerBeneficiary || 0} <span style={{ fontSize: "12px", color: "#9ca3af" }}>vs ${impactData?.benchmarks?.costPerBeneficiaryBenchmark}</span></div>
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {selectedTab === "impact" && (
            <div>
              <Section title="Impact Reach & Financial Analysis" icon="🎯">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "24px" }}>
                  <div style={{ backgroundColor: "#f0fdf4", padding: "24px", borderRadius: "12px", border: "2px solid #10b981" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#166534", marginBottom: "12px" }}>Beneficiary Reach</h3>
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>Direct Beneficiaries</div>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#059669" }}>{impactData?.impactMetrics?.directBeneficiaries || 0}</div>
                    </div>
                    <div style={{ borderTop: "1px solid #bbf7d0", paddingTop: "12px" }}>
                      <div style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>Indirect Beneficiaries</div>
                      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981" }}>{impactData?.impactMetrics?.indirectBeneficiaries || 0}</div>
                    </div>
                  </div>
                  <div style={{ backgroundColor: "#f5f3ff", padding: "24px", borderRadius: "12px", border: "2px solid #8b5cf6" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#5b21b6", marginBottom: "12px" }}>Impact Efficiency</h3>
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "12px", color: "#5b21b6", marginBottom: "4px" }}>Lives Touched</div>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#8b5cf6" }}>{impactData?.impactMetrics?.estimatedLivesTouched || 0}</div>
                    </div>
                    <div style={{ borderTop: "1px solid #ddd6fe", paddingTop: "12px" }}>
                      <div style={{ fontSize: "12px", color: "#5b21b6", marginBottom: "4px" }}>Impact per Hour</div>
                      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#7c3aed" }}>{impactData?.impactMetrics?.impactPerHour || 0}</div>
                    </div>
                  </div>
                  <div style={{ backgroundColor: "#fef3c7", padding: "24px", borderRadius: "12px", border: "2px solid #f59e0b" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#92400e", marginBottom: "12px" }}>Financial Impact</h3>
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "12px", color: "#92400e", marginBottom: "4px" }}>Cost per Beneficiary</div>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#b45309" }}>${impactData?.financialMetrics?.costPerBeneficiary || 0}</div>
                    </div>
                    <div style={{ borderTop: "1px solid #fde68a", paddingTop: "12px" }}>
                      <div style={{ fontSize: "12px", color: "#92400e", marginBottom: "4px" }}>Program Cost</div>
                      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#d97706" }}>${impactData?.financialMetrics?.programCost || 0}</div>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Financial Metrics & ROI Analysis" icon="💰">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>Volunteer Hour Value</div>
                    <div style={{ fontSize: "36px", fontWeight: "bold", color: "#059669", marginBottom: "8px" }}>${impactData?.financialMetrics?.volunteerHourValue?.toLocaleString() || 0}</div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>Total economic contribution</div>
                  </div>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>Cost if Paid Staff</div>
                    <div style={{ fontSize: "36px", fontWeight: "bold", color: "#1e3a8a", marginBottom: "8px" }}>${impactData?.financialMetrics?.estimatedCostIfPaidStaff?.toLocaleString() || 0}</div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>Cost savings with volunteers</div>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {selectedTab === "compliance" && (
            <div>
              <Section title="SDG Alignment & Compliance Framework" icon="🌍">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "24px" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>SDG Contributions</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                      {impactData?.sdgMetrics?.slice(0, 6).map((sdg: any) => (
                        <div key={sdg.goal} style={{ backgroundColor: "#f3f4f6", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>SDG {sdg.goal}</div>
                          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1e3a8a", marginBottom: "4px" }}>{sdg.hours}h</div>
                          <div style={{ fontSize: "12px", color: "#059669", fontWeight: "600" }}>{sdg.percentage}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Compliance Scores</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                      <div style={{ backgroundColor: "#f0f9ff", padding: "16px", borderRadius: "8px", border: "2px solid #3b82f6" }}>
                        <div style={{ fontSize: "12px", color: "#1e40af", fontWeight: "600" }}>B-Corp</div>
                        <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a" }}>{impactData?.complianceStatus?.complianceScores?.bCorpScore || 0}/100</div>
                        <div style={{ fontSize: "11px", color: impactData?.complianceStatus?.bCorpReady ? "#059669" : "#991b1b" }}>{impactData?.complianceStatus?.bCorpReady ? "✅ Ready" : "⚠️ Below"}</div>
                      </div>
                      <div style={{ backgroundColor: "#f0fdf4", padding: "16px", borderRadius: "8px", border: "2px solid #10b981" }}>
                        <div style={{ fontSize: "12px", color: "#166534", fontWeight: "600" }}>GRI</div>
                        <div style={{ fontSize: "28px", fontWeight: "bold", color: "#059669" }}>{impactData?.complianceStatus?.complianceScores?.griScore || 0}/100</div>
                        <div style={{ fontSize: "11px", color: impactData?.complianceStatus?.griAligned ? "#059669" : "#991b1b" }}>{impactData?.complianceStatus?.griAligned ? "✅ Aligned" : "⚠️ Needs Work"}</div>
                      </div>
                      <div style={{ backgroundColor: "#fef3c7", padding: "16px", borderRadius: "8px", border: "2px solid #f59e0b" }}>
                        <div style={{ fontSize: "12px", color: "#92400e", fontWeight: "600" }}>ISO 26000</div>
                        <div style={{ fontSize: "28px", fontWeight: "bold", color: "#d97706" }}>{impactData?.complianceStatus?.complianceScores?.isoScore || 0}/100</div>
                        <div style={{ fontSize: "11px", color: "#92400e" }}>Community Responsibility</div>
                      </div>
                      <div style={{ backgroundColor: "#f5f3ff", padding: "16px", borderRadius: "8px", border: "2px solid #8b5cf6" }}>
                        <div style={{ fontSize: "12px", color: "#5b21b6", fontWeight: "600" }}>SASB</div>
                        <div style={{ fontSize: "28px", fontWeight: "bold", color: "#7c3aed" }}>{impactData?.complianceStatus?.complianceScores?.sasbScore || 0}/100</div>
                        <div style={{ fontSize: "11px", color: "#5b21b6" }}>Sustainability Accounting</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="ESG & Industry Standards" icon="✨">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", textAlign: "center" }}>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>Overall ESG Rating</div>
                    <div style={{ fontSize: "48px", fontWeight: "bold", color: "#f97316", marginBottom: "8px" }}>{impactData?.complianceStatus?.esGRating || 0}/100</div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>Stakeholder Confidence Indicator</div>
                  </div>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", textAlign: "center" }}>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>Average Compliance Score</div>
                    <div style={{ fontSize: "48px", fontWeight: "bold", color: "#059669", marginBottom: "8px" }}>{Math.round((
                      (impactData?.complianceStatus?.complianceScores?.bCorpScore || 0) +
                      (impactData?.complianceStatus?.complianceScores?.griScore || 0) +
                      (impactData?.complianceStatus?.complianceScores?.isoScore || 0) +
                      (impactData?.complianceStatus?.complianceScores?.sasbScore || 0)
                    ) / 4) || 0}/100</div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>Across all frameworks</div>
                  </div>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", textAlign: "center" }}>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>SDG Coverage</div>
                    <div style={{ fontSize: "48px", fontWeight: "bold", color: "#1e3a8a", marginBottom: "8px" }}>{impactData?.sdgMetrics?.length || 0}</div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>Goals aligned with activities</div>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {selectedTab === "projects" && (
            <div>
              <Section title="Project Performance & Benchmarking" icon="📁">
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb", overflowX: "auto" }}>
                {impactData?.projectMetrics && impactData.projectMetrics.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f3f4f6" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Project Name</th>
                        <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Hours</th>
                        <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Employees</th>
                        <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Avg/Employee</th>
                        <th style={{ padding: "12px", textAlign: "center", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {impactData.projectMetrics.map((project: any, idx: number) => {
                        const avgHours = project.employees > 0 ? Math.round(project.hours / project.employees) : 0;
                        const statusColor = 
                          project.status === "active" ? "#059669" :
                          project.status === "completed" ? "#3b82f6" :
                          project.status === "paused" ? "#f59e0b" : "#9ca3af";
                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: idx % 2 === 0 ? "#f9fafb" : "white" }}>
                            <td style={{ padding: "12px", color: "#111827", fontWeight: "500" }}>{project.name}</td>
                            <td style={{ padding: "12px", textAlign: "right", color: "#059669", fontWeight: "600" }}>{project.hours} hrs</td>
                            <td style={{ padding: "12px", textAlign: "right", color: "#374151", fontWeight: "500" }}>{project.employees}</td>
                            <td style={{ padding: "12px", textAlign: "right", color: "#6b7280", fontWeight: "500" }}>{avgHours} hrs</td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "4px 12px",
                                borderRadius: "12px",
                                backgroundColor: statusColor + "20",
                                color: statusColor,
                                fontSize: "12px",
                                fontWeight: "600",
                                textTransform: "capitalize"
                              }}>
                                {project.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                    No project data available yet
                  </div>
                )}
              </div>

              <div style={{ marginTop: "32px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Project Performance Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Total Projects</div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a" }}>{impactData?.projectMetrics?.length || 0}</div>
                  </div>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Combined Hours</div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#059669" }}>
                      {impactData?.projectMetrics?.reduce((sum: number, p: any) => sum + (p.hours || 0), 0) || 0}
                    </div>
                  </div>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Largest Project</div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#f59e0b" }}>
                      {(impactData?.projectMetrics && impactData.projectMetrics.length > 0 ? Math.max(...impactData.projectMetrics.map((p: any) => p.hours || 0)) : 0)} hrs
                    </div>
                  </div>
                </div>
              </div>
              </Section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
