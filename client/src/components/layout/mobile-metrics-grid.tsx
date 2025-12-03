import { FolderOpen, Clock, Target, Users } from "lucide-react";

interface MobileMetricsGridProps {
  activeProjects?: number;
  totalHours?: number;
  sdgsAddressed?: number;
  livesTouched?: number;
  onActiveProjectsClick?: () => void;
  onTotalHoursClick?: () => void;
  onSdgsClick?: () => void;
  onLivesTouchedClick?: () => void;
}

export default function MobileMetricsGrid({ 
  activeProjects = 0, 
  totalHours = 0, 
  sdgsAddressed = 0, 
  livesTouched = 0,
  onActiveProjectsClick,
  onTotalHoursClick,
  onSdgsClick,
  onLivesTouchedClick,
}: MobileMetricsGridProps) {
  const metrics = [
    { label: "Active Projects", value: activeProjects, icon: FolderOpen, color: "#667eea", onClick: onActiveProjectsClick, testId: "mobile-metric-projects" },
    { label: "Total Hours", value: totalHours, icon: Clock, color: "#764ba2", onClick: onTotalHoursClick, testId: "mobile-metric-hours" },
    { label: "SDGs Addressed", value: sdgsAddressed, icon: Target, color: "#f093fb", onClick: onSdgsClick, testId: "mobile-metric-sdgs" },
    { label: "Lives Touched", value: livesTouched, icon: Users, color: "#667eea", onClick: onLivesTouchedClick, testId: "mobile-metric-lives" },
  ];

  return (
    <div className="md:hidden" style={{ padding: '10px', backgroundColor: '#f9fafb' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
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
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '8px 6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                border: `1px solid ${metric.color}20`,
                cursor: 'pointer',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: `${metric.color}30`,
                minHeight: '70px',
              }}
            >
              <div
                style={{
                  padding: '4px',
                  borderRadius: '6px',
                  backgroundColor: `${metric.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={14} style={{ color: metric.color, strokeWidth: 2.2 }} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937' }}>
                {metric.value}
              </div>
              <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: '500', textAlign: 'center', lineHeight: '1.1' }}>
                {metric.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
