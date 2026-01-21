import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Clock, Users, Briefcase, Target, TrendingUp, Award, DollarSign,
  Building2, Calendar, Globe, ChevronRight, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, User, MapPin, Zap, CheckCircle2
} from "lucide-react";
import { getSDGName, getSDGColor } from "@shared/sdg-goals";
import { formatDecimal } from "@/lib/format-utils";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart as RechartsPieChart, Pie, Cell
} from "recharts";

// Types for KPI data - flexible to match various data shapes from dashboard
interface SDGMetric {
  sdg: number;
  totalHours: number;
  uniqueEmployees: number;
  projectsContributed: number;
  employees?: Array<{ name: string; email: string; hours: number; projectId?: number; projectName?: string }>;
  projects?: Array<{ id: number; name: string; hours: number }>;
}

interface EmployeeData {
  name?: string;
  employeeName?: string;
  email?: string;
  hours: number;
  department?: string;
  projectCount?: number;
  sdgsContributed?: number[];
}

interface ProjectData {
  id: number;
  name: string;
  status?: string;
  hours?: number;
  volunteers?: number;
  totalHoursInvested?: number;
  economicValue?: number;
  sdgGoals?: number[];
  region?: string;
}

interface KPIBreakdown {
  hours?: {
    total?: number;
    economicValue?: number;
    averagePerEmployee?: number;
    trend?: number;
  };
  employees?: {
    total?: number;
    totalRoster?: number;
    active?: number;
    averageHoursPerEmployee?: number;
    engagementRate?: number;
    topPerformer?: string;
    topPerformerHours?: number;
    newThisMonth?: number;
  };
  projects?: {
    total?: number;
    activeProjects?: number;
    sponsoredProjects?: number;
    totalRoi?: number;
    averageRoiPerProject?: number;
    totalHoursInvested?: number;
    averageHoursPerProject?: number;
    beneficiariesReached?: number;
    regionsServed?: number;
  };
  sdg?: {
    scoreDelta?: number;
    activeCommitments?: number;
    averageProgress?: number;
    topSdg?: number;
    topSdgHours?: number;
    totalSdgHours?: number;
    challengesActive?: number;
    challengesCompleted?: number;
  };
}

// Flexible leaderboard entry to handle different data shapes
interface LeaderboardEntry {
  name?: string;
  employeeName?: string;
  hours: number;
  email?: string;
  department?: string;
  rank?: number;
  points?: number;
}

interface KPIDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpiType: 'hours' | 'employees' | 'projects' | 'sdg' | 'volunteers' | 'aiu';
  totalHours: number;
  totalEmployees: number;
  totalProjects: number;
  totalAIU: number;
  totalVolunteers?: number;
  sdgMetrics: SDGMetric[];
  employees?: EmployeeData[];
  projects?: ProjectData[];
  kpiBreakdown?: KPIBreakdown;
  leaderboard?: LeaderboardEntry[];
  onNavigate?: (target: string, data?: any) => void;
  economicValueRate?: number;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

export default function KPIDetailModal({
  isOpen,
  onClose,
  kpiType,
  totalHours,
  totalEmployees,
  totalProjects,
  totalAIU,
  totalVolunteers = 0,
  sdgMetrics = [],
  employees = [],
  projects = [],
  kpiBreakdown,
  leaderboard = [],
  onNavigate,
  economicValueRate = 35
}: KPIDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate economic value
  const economicValue = useMemo(() => totalHours * economicValueRate, [totalHours, economicValueRate]);

  // Prepare chart data for SDG hours distribution
  const sdgChartData = useMemo(() =>
    sdgMetrics.slice(0, 8).map(metric => ({
      name: `SDG ${metric.sdg}`,
      sdg: metric.sdg,
      hours: Math.round(metric.totalHours * 10) / 10,
      employees: metric.uniqueEmployees,
      projects: metric.projectsContributed
    }))
  , [sdgMetrics]);

  // Top contributors from leaderboard - normalize name field
  const topContributors = useMemo(() =>
    leaderboard.slice(0, 5).map(entry => ({
      ...entry,
      name: entry.name || entry.employeeName || 'Unknown'
    })),
    [leaderboard]
  );

  // Aggregate employee SDG data
  const employeesByDepartment = useMemo(() => {
    const deptMap = new Map<string, { count: number; hours: number }>();
    employees.forEach(emp => {
      const dept = emp.department || 'General';
      const existing = deptMap.get(dept) || { count: 0, hours: 0 };
      deptMap.set(dept, { count: existing.count + 1, hours: existing.hours + emp.hours });
    });
    return Array.from(deptMap.entries()).map(([dept, data]) => ({
      name: dept,
      employees: data.count,
      hours: data.hours
    })).slice(0, 6);
  }, [employees]);

  // Normalize leaderboard entries for display
  const normalizedLeaderboard = useMemo(() =>
    leaderboard.map(entry => ({
      ...entry,
      name: entry.name || entry.employeeName || 'Unknown'
    })),
    [leaderboard]
  );

  // Project status distribution
  const projectStatusData = useMemo(() => {
    const statusMap = new Map<string, number>();
    projects.forEach(p => {
      const status = p.status || 'active';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    return Array.from(statusMap.entries()).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count
    }));
  }, [projects]);

  // Render modal content based on kpiType
  const renderContent = () => {
    switch (kpiType) {
      case 'hours':
        return renderHoursContent();
      case 'employees':
        return renderEmployeesContent();
      case 'projects':
        return renderProjectsContent();
      case 'sdg':
        return renderSDGContent();
      case 'volunteers':
        return renderVolunteersContent();
      case 'aiu':
        return renderAIUContent();
      default:
        return renderHoursContent();
    }
  };

  const renderHoursContent = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
        <TabsTrigger value="bySDG" className="text-xs">By SDG</TabsTrigger>
        <TabsTrigger value="byEmployee" className="text-xs">By Employee</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-0">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Total Hours</p>
                <p className="text-lg font-bold text-blue-700">{totalHours.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">Economic Value</p>
                <p className="text-lg font-bold text-emerald-700">${economicValue.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">Avg/Employee</p>
                <p className="text-lg font-bold text-purple-700">
                  {formatDecimal(totalEmployees > 0 ? totalHours / totalEmployees : 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">SDGs Addressed</p>
                <p className="text-lg font-bold text-amber-700">{sdgMetrics.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Contributors */}
        {topContributors.length > 0 && (
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-5 w-5 text-amber-500" />
                <p className="font-semibold text-slate-800">Top Contributors</p>
              </div>
              <div className="space-y-2">
                {topContributors.map((contributor, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate-700">{contributor.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">{formatDecimal(contributor.hours)} hrs</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="bySDG" className="space-y-4 mt-0">
        <p className="text-sm text-slate-600 mb-3">Hours distributed across SDGs</p>
        {sdgChartData.length > 0 ? (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sdgChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-2 rounded shadow-lg border text-xs">
                            <p className="font-semibold">{getSDGName(data.sdg)}</p>
                            <p>Hours: {data.hours}</p>
                            <p>Employees: {data.employees}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sdgMetrics.map((metric) => (
                <button
                  key={metric.sdg}
                  onClick={() => onNavigate?.('sdg', { sdgNumber: metric.sdg })}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <img src={getSDGIcon(metric.sdg)} alt={`SDG ${metric.sdg}`} className="w-8 h-8 rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{getSDGName(metric.sdg)}</p>
                    <p className="text-xs text-slate-500">{metric.uniqueEmployees} employees, {metric.projectsContributed} projects</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{formatDecimal(metric.totalHours)} hrs</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No SDG data yet</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="byEmployee" className="space-y-3 mt-0">
        <p className="text-sm text-slate-600 mb-3">Hours logged by each employee</p>
        {normalizedLeaderboard.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {normalizedLeaderboard.map((employee, idx) => {
              const percentage = totalHours > 0 ? (employee.hours / totalHours) * 100 : 0;
              return (
                <Card key={idx} className="border-slate-200">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{employee.name}</p>
                          {employee.department && (
                            <p className="text-xs text-slate-500">{employee.department}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{formatDecimal(employee.hours)}</p>
                        <p className="text-xs text-slate-500">hours</p>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                    <p className="text-[10px] text-slate-400 mt-1">{formatDecimal(percentage)}% of total</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No employee data yet</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );

  const renderEmployeesContent = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
        <TabsTrigger value="engagement" className="text-xs">Engagement</TabsTrigger>
        <TabsTrigger value="roster" className="text-xs">Roster</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">Total Employees</p>
                <p className="text-lg font-bold text-emerald-700">{totalEmployees}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Engagement Rate</p>
                <p className="text-lg font-bold text-blue-700">
                  {formatDecimal(kpiBreakdown?.employees?.engagementRate || 0)}%
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">Avg Hours</p>
                <p className="text-lg font-bold text-purple-700">
                  {formatDecimal(kpiBreakdown?.employees?.averageHoursPerEmployee || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">New This Month</p>
                <p className="text-lg font-bold text-amber-700">
                  {kpiBreakdown?.employees?.newThisMonth || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performer */}
        {kpiBreakdown?.employees?.topPerformer && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-semibold text-amber-700">Top Performer</p>
              </div>
              <p className="font-bold text-slate-800">{kpiBreakdown.employees.topPerformer}</p>
              <p className="text-sm text-slate-600">{kpiBreakdown.employees.topPerformerHours} hours contributed</p>
            </CardContent>
          </Card>
        )}

        {/* Department breakdown */}
        {employeesByDepartment.length > 0 && (
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-slate-600" />
                <p className="font-semibold text-slate-800">By Department</p>
              </div>
              <div className="space-y-2">
                {employeesByDepartment.map((dept, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{dept.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500">{dept.employees} people</span>
                      <span className="text-sm font-semibold text-blue-600">{formatDecimal(dept.hours)} hrs</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="engagement" className="space-y-4 mt-0">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="font-semibold text-slate-800 mb-3">ESG Alignment Impact</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Employees → Organizations</span>
                <span className="text-sm font-semibold text-emerald-600">
                  {totalEmployees} → {totalProjects} projects
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Organizations → SDGs</span>
                <span className="text-sm font-semibold text-purple-600">
                  {totalProjects} → {sdgMetrics.length} SDGs
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">SDGs → Impact</span>
                <span className="text-sm font-semibold text-blue-600">
                  {sdgMetrics.length} → {formatDecimal(totalAIU)} pts
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="roster" className="space-y-3 mt-0">
        <p className="text-sm text-slate-600 mb-3">All participating employees</p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {normalizedLeaderboard.map((employee, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{employee.name}</p>
                {employee.email && (
                  <p className="text-xs text-slate-500 truncate">{employee.email}</p>
                )}
              </div>
              <span className="text-sm font-semibold text-emerald-600">{formatDecimal(employee.hours)} hrs</span>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );

  const renderProjectsContent = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
        <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
        <TabsTrigger value="impact" className="text-xs">Impact</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">Total Projects</p>
                <p className="text-lg font-bold text-purple-700">{totalProjects}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">Economic Value</p>
                <p className="text-lg font-bold text-emerald-700">${economicValue.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Hours Invested</p>
                <p className="text-lg font-bold text-blue-700">{totalHours.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Globe className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">SDGs Addressed</p>
                <p className="text-lg font-bold text-amber-700">{sdgMetrics.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Status Distribution */}
        {projectStatusData.length > 0 && (
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <p className="font-semibold text-slate-800 mb-3">Status Distribution</p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="active" className="space-y-3 mt-0">
        <p className="text-sm text-slate-600 mb-3">Active projects with real-time data</p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {projects.filter(p => p.status === 'active' || p.status === 'in-progress').map((project) => (
            <Card key={project.id} className="border-slate-200">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{project.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      {project.region && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {project.region}
                        </span>
                      )}
                      <span>{project.volunteers} volunteers</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    project.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{project.hours || 0} hours</span>
                  <span className="font-semibold text-emerald-600">
                    ${Math.round((project.hours || 0) * economicValueRate).toLocaleString()}
                  </span>
                </div>
                {project.sdgGoals && project.sdgGoals.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {project.sdgGoals.slice(0, 5).map(sdg => (
                      <img key={sdg} src={getSDGIcon(sdg)} alt={`SDG ${sdg}`} className="w-5 h-5 rounded" />
                    ))}
                    {project.sdgGoals.length > 5 && (
                      <span className="text-xs text-slate-500">+{project.sdgGoals.length - 5}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="impact" className="space-y-4 mt-0">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <p className="font-semibold text-emerald-800">Economic Value Analysis</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Hourly Rate</span>
                <span className="font-semibold text-slate-800">${economicValueRate}/hour</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Hours</span>
                <span className="font-semibold text-slate-800">{totalHours.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-700">Total Economic Value</span>
                <span className="text-lg font-bold text-emerald-700">${economicValue.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="font-semibold text-slate-800 mb-3">ROI Metrics</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Value per Project</span>
                <span className="font-semibold text-blue-600">
                  ${totalProjects > 0 ? Math.round(economicValue / totalProjects).toLocaleString() : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Value per Employee</span>
                <span className="font-semibold text-purple-600">
                  ${totalEmployees > 0 ? Math.round(economicValue / totalEmployees).toLocaleString() : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Impact Score</span>
                <span className="font-semibold text-cyan-600">{formatDecimal(totalAIU)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  const renderSDGContent = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
        <TabsTrigger value="details" className="text-xs">By SDG</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">Active SDGs</p>
                <p className="text-lg font-bold text-amber-700">{sdgMetrics.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Total Hours</p>
                <p className="text-lg font-bold text-blue-700">{totalHours.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SDG Distribution Chart */}
        {sdgChartData.length > 0 && (
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <p className="font-semibold text-slate-800 mb-3">Hours by SDG</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sdgChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top SDG */}
        {sdgMetrics.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <img src={getSDGIcon(sdgMetrics[0].sdg)} alt={`SDG ${sdgMetrics[0].sdg}`} className="w-12 h-12 rounded-lg" />
                <div>
                  <p className="text-sm text-amber-600 font-medium">Top Contributing SDG</p>
                  <p className="font-bold text-slate-800">{getSDGName(sdgMetrics[0].sdg)}</p>
                  <p className="text-sm text-slate-600">
                    {formatDecimal(sdgMetrics[0].totalHours)} hours, {sdgMetrics[0].uniqueEmployees} employees
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="details" className="space-y-3 mt-0">
        <p className="text-sm text-slate-600 mb-3">Performance metrics per SDG</p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {sdgMetrics.map((metric) => (
            <button
              key={metric.sdg}
              onClick={() => onNavigate?.('sdg', { sdgNumber: metric.sdg })}
              className="w-full"
            >
              <Card className="border-slate-200 hover:border-amber-300 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <img src={getSDGIcon(metric.sdg)} alt={`SDG ${metric.sdg}`} className="w-10 h-10 rounded" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-slate-800 truncate">{getSDGName(metric.sdg)}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>{formatDecimal(metric.totalHours)} hrs</span>
                        <span>{metric.projectsContributed} projects</span>
                        <span>{metric.uniqueEmployees} employees</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );

  const renderVolunteersContent = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
        <TabsTrigger value="roster" className="text-xs">Roster</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Users className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-cyan-600 font-medium">Total Volunteers</p>
                <p className="text-lg font-bold text-cyan-700">{totalVolunteers || totalEmployees}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">Total Hours</p>
                <p className="text-lg font-bold text-emerald-700">{totalHours.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top contributors */}
        {topContributors.length > 0 && (
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-5 w-5 text-amber-500" />
                <p className="font-semibold text-slate-800">Top Volunteers</p>
              </div>
              <div className="space-y-2">
                {topContributors.map((volunteer, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate-700">{volunteer.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-cyan-600">{formatDecimal(volunteer.hours)} hrs</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="roster" className="space-y-3 mt-0">
        <p className="text-sm text-slate-600 mb-3">All employee volunteers with contributions</p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {normalizedLeaderboard.map((volunteer, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{volunteer.name}</p>
                {volunteer.email && (
                  <p className="text-xs text-slate-500 truncate">{volunteer.email}</p>
                )}
              </div>
              <span className="text-sm font-semibold text-cyan-600">{formatDecimal(volunteer.hours)} hrs</span>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );

  const renderAIUContent = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
        <TabsTrigger value="formula" className="text-xs">How It Works</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Zap className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-cyan-600 font-medium">Total Impact Score</p>
                <p className="text-lg font-bold text-cyan-700">{formatDecimal(totalAIU)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">Score per Hour</p>
                <p className="text-lg font-bold text-purple-700">
                  {formatDecimal(totalHours > 0 ? totalAIU / totalHours : 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AIU by SDG */}
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="font-semibold text-slate-800 mb-3">Impact Score Distribution by SDG</p>
            <div className="space-y-2">
              {sdgMetrics.slice(0, 5).map((metric, idx) => {
                const sdgAIU = metric.totalHours > 0 ? (metric.totalHours / totalHours) * totalAIU : 0;
                return (
                  <div key={metric.sdg} className="flex items-center gap-3">
                    <img src={getSDGIcon(metric.sdg)} alt={`SDG ${metric.sdg}`} className="w-6 h-6 rounded" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{getSDGName(metric.sdg)}</span>
                        <span className="font-semibold text-cyan-600">{formatDecimal(sdgAIU)}</span>
                      </div>
                      <Progress value={(sdgAIU / totalAIU) * 100} className="h-1.5 mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="formula" className="space-y-4 mt-0">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <p className="font-semibold text-blue-800 mb-3">Impact Score Formula</p>
            <p className="text-sm text-slate-600 mb-3">
              Impact Score measures verified, auditable impact using a proprietary formula:
            </p>
            <div className="bg-white rounded-lg p-3 text-sm font-mono text-slate-700">
              Score = min(MaxScore, k × ln(1 + EffectiveScore)) × (1 + ConsistencyBonus)
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="font-semibold text-slate-800 mb-3">Components</p>
            <div className="space-y-2 text-sm">
              {[
                { name: 'Lives Impacted', desc: 'Number of beneficiaries served' },
                { name: 'Depth Multiplier', desc: 'Individual (1x), Shared (1.5x), Systems (2x)' },
                { name: 'Role Weight', desc: 'Leadership (1.5-4x), Skilled (1.2-1.4x), General (1x)' },
                { name: 'Hours Factor', desc: 'Logarithmic scaling of time invested' },
                { name: 'Verification', desc: 'Verified (100%), Pending (70%), Self-reported (60%)' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-slate-800">{item.name}:</span>{' '}
                    <span className="text-slate-600">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  // Get header config based on KPI type
  const headerConfig = {
    hours: { title: 'Total Hours', icon: Clock, gradient: 'from-blue-500 to-cyan-500', value: totalHours.toLocaleString() },
    employees: { title: 'Employees Engaged', icon: Users, gradient: 'from-emerald-500 to-teal-500', value: totalEmployees.toString() },
    projects: { title: 'Active Projects', icon: Briefcase, gradient: 'from-purple-500 to-violet-500', value: totalProjects.toString() },
    sdg: { title: 'SDG Goals', icon: Target, gradient: 'from-amber-500 to-orange-500', value: sdgMetrics.length.toString() },
    volunteers: { title: 'Employee Volunteers', icon: Users, gradient: 'from-cyan-500 to-blue-500', value: (totalVolunteers || totalEmployees).toString() },
    aiu: { title: 'Impact Score', icon: Zap, gradient: 'from-cyan-500 to-blue-600', value: formatDecimal(totalAIU) },
  };

  const config = headerConfig[kpiType];
  const HeaderIcon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Header with gradient */}
        <div className={`bg-gradient-to-br ${config.gradient} p-6 text-white rounded-t-lg`}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-xl">
              <HeaderIcon className="h-6 w-6" />
              {config.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-white/80 text-sm">Current Value</p>
            <p className="text-4xl font-bold">{config.value}</p>
          </div>
        </div>

        {/* Content */}
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
