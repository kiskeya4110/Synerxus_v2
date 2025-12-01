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
          backgroundColor: '#667eea',
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
          backgroundColor: '#f0f0f0', 
          borderRadius: '8px', 
          overflow: 'hidden'
        }}>
          <div
            style={{
              height: '100%',
              width: `${percentage}%`,
              background: 'linear-gradient(90deg, #764ba2, #f093fb)',
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
              background: `hsl(${280 + (i * 15)}, 80%, 60%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: 'white'
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
              backgroundColor: '#ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#666'
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
              color: '#667eea',
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
      color: "#667eea",
      visualization: getProjectVisualization(activeProjects)
    },
    { 
      label: "Total Hours", 
      value: totalHours, 
      color: "#764ba2",
      visualization: getHoursVisualization(totalHours)
    },
    { 
      label: "SDGs Addressed", 
      value: sdgsAddressed, 
      color: "#f093fb",
      visualization: getSdgVisualization(sdgsAddressed)
    },
    { 
      label: "Lives Touched", 
      value: livesTouched, 
      color: "#667eea",
      visualization: getLivesTouachedVisualization(livesTouched)
    },
  ];

  return (
    <div className="md:hidden" style={{ 
      padding: '16px', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {metrics.map((metric, index) => (
          <div
            key={index}
            style={{
              backgroundColor: 'white',
              borderRadius: '14px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              border: `1px solid ${metric.color}20`,
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
            <div style={{ fontSize: '22px', fontWeight: '800', color: metric.color, textAlign: 'center' }}>
              {metric.value.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', textAlign: 'center', lineHeight: '1.2' }}>
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
