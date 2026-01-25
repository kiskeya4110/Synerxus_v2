import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import {
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  Target,
  Download,
  FileText,
  Building2,
  ChevronRight,
  Award,
  Globe,
  Leaf,
  Heart,
  Scale,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, MetricCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { EmptyState, LoadingState } from "@/components/ui/empty-state";
import { PageHeader, Section, SectionHeader, Grid, Divider } from "@/components/ui/section";
import Logo from "@/components/ui/logo";

// Hooks
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// Shared utilities
import { getSDGName, getSDGColor } from "@shared/sdg-goals";

// CSR Nav Component
function CSRNav() {
  const [location, navigate] = useLocation();
  const { signOut } = useAuth();
  const userId = localStorage.getItem("currentUserId");

  const { data: csrPartner } = useQuery({
    queryKey: ["/api/csr/partners", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/csr/partners?userId=${userId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!userId,
  });

  const companyName = csrPartner?.companyName || "Corporate Partner";
  const companyLogo = csrPartner?.logoUrl || null;
  const companyInitial = companyName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-7xl mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Logo size="sm" variant="full" />

            {/* Desktop Nav Items */}
            <div className="hidden lg:flex items-center gap-1">
              {[
                { href: "/csr-dashboard", label: "Dashboard", icon: BarChart3 },
                { href: "/csr-impact-reporting", label: "Impact", icon: TrendingUp },
                { href: "/project-portfolio", label: "Projects", icon: Target },
                { href: "/csr-reports-exports", label: "Reports", icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href ||
                  (item.href === "/csr-dashboard" && location.startsWith("/csr-dashboard"));
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Export Button */}
            <Button
              variant="accent"
              size="sm"
              className="hidden sm:flex"
              onClick={() => navigate("/csr-reports-exports")}
            >
              <Download className="h-4 w-4 mr-1" />
              Export Report
            </Button>

            {/* Company Avatar */}
            <div className="flex items-center gap-2">
              <Avatar size="sm">
                <AvatarImage src={companyLogo || undefined} alt={companyName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {companyInitial}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm font-medium text-foreground max-w-[120px] truncate">
                {companyName}
              </span>
            </div>

            {/* Logout */}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}

// ESG Category Card
interface ESGCardProps {
  category: "environmental" | "social" | "governance";
  hours: number;
  projects: number;
  percentage: number;
}

function ESGCard({ category, hours, projects, percentage }: ESGCardProps) {
  const config = {
    environmental: {
      icon: Leaf,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      label: "Environmental",
      progressColor: "success" as const,
    },
    social: {
      icon: Heart,
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/30",
      label: "Social",
      progressColor: "accent" as const,
    },
    governance: {
      icon: Scale,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      label: "Governance",
      progressColor: "primary" as const,
    },
  };

  const { icon: Icon, color, bgColor, borderColor, label, progressColor } = config[category];

  return (
    <Card variant="glass" className={`${borderColor} border`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{projects} projects</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{hours.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
          <Progress value={percentage} indicatorColor={progressColor} className="h-2" />
          <p className="text-xs text-muted-foreground">{percentage}% of total impact</p>
        </div>
      </CardContent>
    </Card>
  );
}

// SDG Progress Card
interface SDGProgressProps {
  sdg: number;
  hours: number;
  employees: number;
  percentage: number;
}

function SDGProgressCard({ sdg, hours, employees, percentage }: SDGProgressProps) {
  const color = getSDGColor(sdg);
  const name = getSDGName(sdg);

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: color }}
      >
        {sdg}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{hours.toLocaleString()} hours</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-foreground">{percentage}%</p>
        <p className="text-xs text-muted-foreground">{employees} people</p>
      </div>
    </div>
  );
}

// Employee Leaderboard Row
interface LeaderboardRowProps {
  rank: number;
  name: string;
  hours: number;
  points: number;
  avatar?: string;
}

function LeaderboardRow({ rank, name, hours, points, avatar }: LeaderboardRowProps) {
  const getRankBadge = () => {
    if (rank === 1) return <Badge variant="warning" className="w-6 h-6 p-0 flex items-center justify-center">1</Badge>;
    if (rank === 2) return <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center">2</Badge>;
    if (rank === 3) return <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-amber-600">3</Badge>;
    return <span className="w-6 text-center text-sm text-muted-foreground">{rank}</span>;
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
      {getRankBadge()}
      <Avatar size="sm">
        <AvatarImage src={avatar} alt={name} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {name.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{hours} hours logged</p>
      </div>
      <div className="flex items-center gap-1 text-accent">
        <Sparkles className="h-3 w-3" />
        <span className="text-sm font-semibold">{points}</span>
      </div>
    </div>
  );
}

// Partner NGO Card
interface PartnerCardProps {
  name: string;
  logo?: string;
  employees: number;
  hours: number;
  roi: number;
}

function PartnerCard({ name, logo, employees, hours, roi }: PartnerCardProps) {
  return (
    <Card variant="glass" className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar size="default">
            <AvatarImage src={logo} alt={name} />
            <AvatarFallback className="bg-success/10 text-success text-sm font-semibold">
              {name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{name}</p>
            <p className="text-xs text-muted-foreground">NGO Partner</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{employees}</p>
            <p className="text-xs text-muted-foreground">Employees</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{hours.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Hours</p>
          </div>
          <div>
            <p className="text-lg font-bold text-success">{roi}x</p>
            <p className="text-xs text-muted-foreground">ROI</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main CSR Dashboard Component
export default function CSRDashboardNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = localStorage.getItem("currentUserId");
  const userType = localStorage.getItem("userType");

  // Check for demo mode
  const isDemoMode = !!userId && userType === "corporate-partner";

  // Fetch CSR dashboard data
  const {
    data: csrData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/csr/dashboard", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID not available");
      const response = await fetch(`/api/csr/dashboard?userId=${userId}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Access denied");
        }
        throw new Error("Failed to fetch CSR dashboard");
      }
      return response.json();
    },
    enabled: isDemoMode && !!userId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Calculate ESG breakdown from SDG metrics
  const esgBreakdown = useMemo(() => {
    const ENVIRONMENTAL_SDGS = [6, 7, 12, 13, 14, 15];
    const SOCIAL_SDGS = [1, 2, 3, 4, 5, 10, 11, 16];
    const GOVERNANCE_SDGS = [8, 9, 17];

    const sdgMetrics = csrData?.sdgMetrics || [];
    let environmental = 0;
    let social = 0;
    let governance = 0;
    let envProjects = 0;
    let socialProjects = 0;
    let govProjects = 0;

    sdgMetrics.forEach((metric: any) => {
      const hours = metric.totalHours || 0;
      const projects = metric.projectsContributed || 0;

      if (ENVIRONMENTAL_SDGS.includes(metric.sdg)) {
        environmental += hours;
        envProjects += projects;
      }
      if (SOCIAL_SDGS.includes(metric.sdg)) {
        social += hours;
        socialProjects += projects;
      }
      if (GOVERNANCE_SDGS.includes(metric.sdg)) {
        governance += hours;
        govProjects += projects;
      }
    });

    const total = environmental + social + governance;
    return {
      environmental: { hours: environmental, projects: envProjects, percentage: total > 0 ? Math.round((environmental / total) * 100) : 0 },
      social: { hours: social, projects: socialProjects, percentage: total > 0 ? Math.round((social / total) * 100) : 0 },
      governance: { hours: governance, projects: govProjects, percentage: total > 0 ? Math.round((governance / total) * 100) : 0 },
      total,
    };
  }, [csrData?.sdgMetrics]);

  // SDG chart data
  const sdgChartData = useMemo(() => {
    const sdgMetrics = csrData?.sdgMetrics || [];
    const primarySdgs = csrData?.primarySdgs || [];

    return sdgMetrics
      .filter((m: any) => primarySdgs.includes(m.sdg) || m.totalHours > 0)
      .map((metric: any) => ({
        sdg: metric.sdg,
        name: getSDGName(metric.sdg),
        hours: metric.totalHours || 0,
        employees: metric.uniqueEmployees || 0,
        projects: metric.projectsContributed || 0,
        color: getSDGColor(metric.sdg),
      }))
      .sort((a: any, b: any) => b.hours - a.hours)
      .slice(0, 8);
  }, [csrData?.sdgMetrics, csrData?.primarySdgs]);

  // ESG Pie chart data
  const esgPieData = useMemo(() => [
    { name: "Environmental", value: esgBreakdown.environmental.hours, color: "#10b981" },
    { name: "Social", value: esgBreakdown.social.hours, color: "#f43f5e" },
    { name: "Governance", value: esgBreakdown.governance.hours, color: "#3b82f6" },
  ], [esgBreakdown]);

  // Handle export
  const handleExport = () => {
    toast({
      title: "Exporting Report",
      description: "Your report is being generated...",
    });
    navigate("/csr-reports-exports");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <CSRNav />
        <main className="container max-w-7xl mx-auto px-4 py-8">
          <LoadingState message="Loading ESG dashboard..." />
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <CSRNav />
        <main className="container max-w-7xl mx-auto px-4 py-8">
          <EmptyState
            icon={<AlertCircle className="h-12 w-12 text-destructive" />}
            title="Unable to load dashboard"
            description={(error as Error).message}
            action={{ label: "Try Again", onClick: () => refetch() }}
          />
        </main>
      </div>
    );
  }

  const totalHours = csrData?.totalHours || 0;
  const activeEmployees = csrData?.activeEmployees || 0;
  const projectsCompleted = csrData?.projectsCompleted || 0;
  const sdgScoreDelta = csrData?.sdgScoreDelta || 0;
  const leaderboard = csrData?.leaderboard || [];
  const partners = csrData?.partners || [];

  return (
    <div className="min-h-screen bg-background">
      <CSRNav />

      <main className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Page Header */}
        <PageHeader
          title="ESG Dashboard"
          description="Track your corporate social responsibility impact and employee engagement"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button variant="accent" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export Report
              </Button>
            </div>
          }
        />

        {/* KPI Cards */}
        <Grid columns={4}>
          <MetricCard
            label="Total Volunteer Hours"
            value={totalHours.toLocaleString()}
            subtitle="Across all initiatives"
            icon={<Clock className="h-5 w-5" />}
            trend={{ value: 12, direction: "up" }}
          />
          <MetricCard
            label="Active Employees"
            value={activeEmployees.toString()}
            subtitle="Participating volunteers"
            icon={<Users className="h-5 w-5" />}
            trend={{ value: 8, direction: "up" }}
            accentColor="accent"
          />
          <MetricCard
            label="Projects Completed"
            value={projectsCompleted.toString()}
            subtitle="Successful initiatives"
            icon={<Target className="h-5 w-5" />}
            accentColor="success"
          />
          <MetricCard
            label="SDG Impact Score"
            value={`+${sdgScoreDelta}`}
            subtitle="Points this period"
            icon={<TrendingUp className="h-5 w-5" />}
            trend={{ value: sdgScoreDelta, direction: "up" }}
            accentColor="cyan"
          />
        </Grid>

        {/* ESG Breakdown */}
        <Section>
          <SectionHeader
            title="ESG Impact Breakdown"
            description="Environmental, Social, and Governance distribution"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate("/csr-impact-reporting")}>
                View Details <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            }
          />
          <Grid columns={4}>
            <ESGCard
              category="environmental"
              hours={esgBreakdown.environmental.hours}
              projects={esgBreakdown.environmental.projects}
              percentage={esgBreakdown.environmental.percentage}
            />
            <ESGCard
              category="social"
              hours={esgBreakdown.social.hours}
              projects={esgBreakdown.social.projects}
              percentage={esgBreakdown.social.percentage}
            />
            <ESGCard
              category="governance"
              hours={esgBreakdown.governance.hours}
              projects={esgBreakdown.governance.projects}
              percentage={esgBreakdown.governance.percentage}
            />

            {/* ESG Pie Chart */}
            <Card variant="glass">
              <CardContent className="p-4 h-full">
                <p className="text-sm font-medium text-muted-foreground mb-2">Distribution</p>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={esgPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={45}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {esgPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Section>

        {/* SDG Alignment & Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SDG Progress */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                SDG Alignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sdgChartData.length > 0 ? (
                sdgChartData.map((sdg: any) => (
                  <SDGProgressCard
                    key={sdg.sdg}
                    sdg={sdg.sdg}
                    hours={sdg.hours}
                    employees={sdg.employees}
                    percentage={esgBreakdown.total > 0 ? Math.round((sdg.hours / esgBreakdown.total) * 100) : 0}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<Globe className="h-10 w-10 text-muted-foreground" />}
                  title="No SDG data yet"
                  description="Start tracking volunteer activities to see SDG alignment"
                  size="sm"
                />
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate("/sdg-mapping")}
              >
                View All SDGs <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Employee Leaderboard */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-accent" />
                Top Volunteers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leaderboard.length > 0 ? (
                leaderboard.slice(0, 5).map((employee: any, index: number) => (
                  <LeaderboardRow
                    key={employee.employeeName || index}
                    rank={employee.rank || index + 1}
                    name={employee.employeeName}
                    hours={employee.hours}
                    points={employee.points}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<Award className="h-10 w-10 text-muted-foreground" />}
                  title="No volunteer data"
                  description="Employee volunteer hours will appear here"
                  size="sm"
                />
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate("/csr-dashboard?tab=leaderboard")}
              >
                View Full Leaderboard <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Partner NGO Performance */}
        <Section>
          <SectionHeader
            title="Partner Organizations"
            description="NGO performance and collaboration metrics"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate("/organizations")}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            }
          />
          <Grid columns={3}>
            {partners.length > 0 ? (
              partners.slice(0, 3).map((partner: any) => (
                <PartnerCard
                  key={partner.id}
                  name={partner.companyName}
                  logo={partner.logo || partner.logoUrl}
                  employees={partner.employees}
                  hours={partner.hours}
                  roi={partner.roi || 1}
                />
              ))
            ) : (
              <div className="col-span-3">
                <EmptyState
                  icon={<Building2 className="h-10 w-10 text-muted-foreground" />}
                  title="No partner organizations"
                  description="Connect with NGO partners to track collaborative impact"
                  action={{ label: "Browse Organizations", onClick: () => navigate("/organizations") }}
                />
              </div>
            )}
          </Grid>
        </Section>

        {/* Quick Actions */}
        <Section>
          <SectionHeader title="Quick Actions" />
          <Grid columns={4}>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/csr-impact-reporting")}
            >
              <BarChart3 className="h-6 w-6 text-primary" />
              <span>View Impact Report</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/project-portfolio")}
            >
              <Target className="h-6 w-6 text-success" />
              <span>Manage Projects</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/csr-reports-exports")}
            >
              <Download className="h-6 w-6 text-accent" />
              <span>Export Data</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/corporate-partner-profile-settings")}
            >
              <Building2 className="h-6 w-6 text-muted-foreground" />
              <span>Company Settings</span>
            </Button>
          </Grid>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary mt-12">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Logo size="xs" variant="icon" />
              <span className="text-sm text-muted-foreground">
                Turn Volunteer Hours into Audit-Ready ESG Data
              </span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <button onClick={() => navigate("/help")} className="hover:text-foreground transition-colors">
                Help
              </button>
              <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">
                Privacy
              </button>
              <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">
                Terms
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
