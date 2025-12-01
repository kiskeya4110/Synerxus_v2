import { FolderOpen, Clock, Target, Users } from "lucide-react";

interface MobileMetricsProps {
  activeProjects?: number;
  totalHours?: number;
  sdgsAddressed?: number;
  livesTouched?: number;
}

export default function MobileBottomNav({ 
  activeProjects = 0, 
  totalHours = 0, 
  sdgsAddressed = 0, 
  livesTouched = 0 
}: MobileMetricsProps) {
  const metrics = [
    { label: "Active Projects", value: activeProjects, icon: FolderOpen, color: "#667eea" },
    { label: "Total Hours", value: totalHours, icon: Clock, color: "#764ba2" },
    { label: "SDGs Addressed", value: sdgsAddressed, icon: Target, color: "#f093fb" },
    { label: "Lives Touched", value: livesTouched, icon: Users, color: "#667eea" },
  ];

  return (
    <>
      <div className="h-24 md:hidden" />
      <nav
        className="fixed bottom-0 left-0 right-0 h-24 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,0px)] z-[1000] md:hidden"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          boxShadow: '0 -4px 20px rgba(102, 126, 234, 0.3)',
        }}
        data-testid="mobile-bottom-nav"
      >
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                flex: 1,
                padding: '8px',
              }}
            >
              <div
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                }}
              >
                <Icon size={24} style={{ color: '#ffffff', strokeWidth: 2.2 }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>
                  {metric.value}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: '500', marginTop: '2px' }}>
                  {metric.label}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </>
  );
}
