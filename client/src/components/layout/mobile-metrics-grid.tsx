import { FolderOpen, Clock, Target, Users, TrendingUp, Award, CheckCircle, Zap } from "lucide-react";
import { formatDecimal } from "@/lib/format-utils";
import { useAIUDisplay } from "@/hooks/use-feature-flags";

interface MobileMetricsGridProps {
  activeProjects?: number;
  totalProjects?: number;
  completedProjects?: number;
  totalHours?: number;
  sdgsAddressed?: number;
  aiuEarned?: number;
  activeVolunteers?: number;
  livesImpacted?: number;
  onActiveProjectsClick?: () => void;
  onTotalHoursClick?: () => void;
  onSdgsClick?: () => void;
  onAiuClick?: () => void;
}

export default function MobileMetricsGrid({
  activeProjects = 0,
  totalProjects = 0,
  completedProjects = 0,
  totalHours = 0,
  sdgsAddressed = 0,
  aiuEarned = 0,
  activeVolunteers = 0,
  livesImpacted = 0,
  onActiveProjectsClick,
  onTotalHoursClick,
  onSdgsClick,
  onAiuClick,
}: MobileMetricsGridProps) {
  const isAIUEnabled = useAIUDisplay();

  // Calculate industry-standard KPIs
  const successRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
  const sdgCoverage = Math.round((sdgsAddressed / 17) * 100);
  const impactPerHour = totalHours > 0 ? Math.round((livesImpacted / totalHours) * 10) / 10 : 0;
  const avgHoursPerVolunteer = activeVolunteers > 0 ? Math.round(totalHours / activeVolunteers) : 0;

  const metrics = [
    {
      label: "Impact ROI",
      value: `${impactPerHour}/hr`,
      subValue: `${livesImpacted.toLocaleString()} lives`,
      icon: TrendingUp,
      color: "#10b981",
      onClick: onAiuClick,
      testId: "mobile-metric-roi",
      tooltip: "Lives impacted per volunteer hour"
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      subValue: `${completedProjects}/${totalProjects}`,
      icon: CheckCircle,
      color: "#8b5cf6",
      onClick: onActiveProjectsClick,
      testId: "mobile-metric-success",
      tooltip: "Project completion rate"
    },
    {
      label: "SDG Coverage",
      value: `${sdgCoverage}%`,
      subValue: `${sdgsAddressed} of 17`,
      icon: Target,
      color: "#f59e0b",
      onClick: onSdgsClick,
      testId: "mobile-metric-sdgs",
      tooltip: "UN SDGs addressed"
    },
    {
      label: isAIUEnabled ? "AIU Score" : "Impact Score",
      value: typeof aiuEarned === 'number' ? formatDecimal(aiuEarned) : aiuEarned,
      subValue: `${totalHours.toLocaleString()}h total`,
      icon: Award,
      color: "#0ea5e9",
      onClick: onTotalHoursClick,
      testId: "mobile-metric-impact",
      tooltip: isAIUEnabled ? "Attributable Impact Units" : "Verified social impact score"
    },
  ];

  return (
    <div className="md:hidden" style={{ padding: '10px', backgroundColor: '#f9fafb' }}>
      <div className="max-w-7xl mx-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <button
              key={index}
              type="button"
              onClick={metric.onClick}
              onTouchEnd={(e) => { if (metric.onClick) { e.preventDefault(); metric.onClick(); } }}
              aria-label={`${metric.label}: ${metric.value}`}
              data-testid={metric.testId}
              title={metric.tooltip || metric.label}
              style={{
                backgroundColor: 'white',
                borderRadius: '10px',
                padding: '8px 4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                border: `1.5px solid ${metric.color}25`,
                cursor: 'pointer',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: `${metric.color}30`,
                minHeight: '76px',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  padding: '5px',
                  borderRadius: '8px',
                  backgroundColor: `${metric.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={14} style={{ color: metric.color, strokeWidth: 2.2 }} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1f2937', lineHeight: 1.1 }}>
                {metric.value}
              </div>
              <div style={{ fontSize: '8px', color: '#9ca3af', fontWeight: '500', textAlign: 'center', lineHeight: '1.1' }}>
                {metric.subValue}
              </div>
              <div style={{ fontSize: '8px', color: metric.color, fontWeight: '600', textAlign: 'center', lineHeight: '1.1' }}>
                {metric.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
