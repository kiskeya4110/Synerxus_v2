import { FolderOpen, Clock, Target, Users } from "lucide-react";

interface MobileMetricsGridProps {
  activeProjects?: number;
  totalHours?: number;
  sdgsAddressed?: number;
  livesTouched?: number;
}

export default function MobileMetricsGrid({ 
  activeProjects = 0, 
  totalHours = 0, 
  sdgsAddressed = 0, 
  livesTouched = 0 
}: MobileMetricsGridProps) {
  // Visual representation of metrics
  const getProjectVisualization = (value: number) => {
    const boxes = Math.min(Math.ceil(value / 2), 6); // Max 6 boxes
    return Array.from({ length: boxes }).map((_, i) => (
      <div
        key={i}
        style={{
          width: '24px',
          height: '24px',
          backgroundColor: 'white',
          borderRadius: '6px',
          opacity: 0.8 + (i * 0.02)
        }}
      />
    ));
  };

  const getHoursVisualization = (value: number) => {
    const maxValue = 1000;
    const percentage = Math.min((value / maxValue) * 100, 100);
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
        <div style={{ 
          width: '100%', 
          height: '40px', 
          backgroundColor: 'rgba(255,255,255,0.3)', 
          borderRadius: '8px', 
          overflow: 'hidden'
        }}>
          <div
            style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: 'rgba(255,255,255,0.8)',
              borderRadius: '8px',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>
    );
  };

  const getSdgVisualization = (value: number) => {
    const circles = Math.min(value, 5);
    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {Array.from({ length: circles }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#f093fb'
            }}
          >
            {i + 1}
          </div>
        ))}
        {value > 5 && (
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#f093fb'
            }}
          >
            +{value - 5}
          </div>
        )}
      </div>
    );
  };

  const getLivesTouachedVisualization = (value: number) => {
    const personCount = Math.min(Math.ceil(value / 100), 6);
    return (
      <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
        {Array.from({ length: personCount }).map((_, i) => (
          <Users
            key={i}
            size={28}
            style={{
              color: 'white',
              opacity: 0.7 + (i * 0.05),
              strokeWidth: 2.5
            }}
          />
        ))}
      </div>
    );
  };

  const metrics = [
    { 
      label: "Active Projects", 
      value: activeProjects, 
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      visualization: getProjectVisualization(activeProjects)
    },
    { 
      label: "Total Hours", 
      value: totalHours, 
      gradient: 'linear-gradient(135deg, #764ba2 0%, #f093fb 100%)',
      visualization: getHoursVisualization(totalHours)
    },
    { 
      label: "SDGs Addressed", 
      value: sdgsAddressed, 
      gradient: 'linear-gradient(135deg, #f093fb 0%, #667eea 100%)',
      visualization: getSdgVisualization(sdgsAddressed)
    },
    { 
      label: "Lives Touched", 
      value: livesTouched, 
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      visualization: getLivesTouachedVisualization(livesTouched)
    },
  ];

  return (
    <div className="md:hidden" style={{ 
      padding: '16px', 
      backgroundColor: '#f9fafb',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {metrics.map((metric, index) => (
          <div
            key={index}
            style={{
              background: metric.gradient,
              borderRadius: '14px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              border: 'none',
            }}
          >
            <div style={{ 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              minHeight: '48px',
              alignItems: 'center'
            }}>
              {metric.visualization}
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', textAlign: 'center' }}>
              {metric.value.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', fontWeight: '600', textAlign: 'center', lineHeight: '1.2' }}>
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
