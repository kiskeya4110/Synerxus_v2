import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Clock, Users, Briefcase, Target, TrendingUp, Award, DollarSign,
  Plus, Search, CheckCircle2, User, BarChart3, ChevronRight
} from "lucide-react";
import { getSDGName, getSDGFullName, getSDGColor } from "@shared/sdg-goals";
import { getSDGIcon } from "@/assets/un-sdg-icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { formatDecimal } from "@/lib/format-utils";

interface SDGEmployee {
  name: string;
  email: string;
  hours: number;
  projectId?: number;
  projectName?: string;
}

interface SDGProject {
  id: number;
  name: string;
  hours: number;
  volunteers?: number;
  status?: string;
}

interface SDGDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sdgNumber: number;
  metrics: {
    totalHours: number;
    uniqueEmployees: number;
    projectsContributed: number;
    employees: SDGEmployee[];
    projects: SDGProject[];
  };
  corporateCommitment: boolean;
  totalCompanyHours?: number;
  economicValueRate?: number;
  onAddToCommitment?: (sdgNumber: number) => void;
  onEvaluate?: (sdgNumber: number) => void;
  onNavigateToEmployee?: (email: string) => void;
  onNavigateToProject?: (projectId: number) => void;
}

export default function SDGDetailModal({
  isOpen,
  onClose,
  sdgNumber,
  metrics,
  corporateCommitment,
  totalCompanyHours = 0,
  economicValueRate = 35,
  onAddToCommitment,
  onEvaluate,
  onNavigateToEmployee,
  onNavigateToProject
}: SDGDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate derived metrics
  const economicValue = useMemo(() =>
    Math.round(metrics.totalHours * economicValueRate),
    [metrics.totalHours, economicValueRate]
  );

  const hoursPercentage = useMemo(() =>
    totalCompanyHours > 0 ? (metrics.totalHours / totalCompanyHours) * 100 : 0,
    [metrics.totalHours, totalCompanyHours]
  );

  const avgHoursPerEmployee = useMemo(() =>
    metrics.uniqueEmployees > 0 ? metrics.totalHours / metrics.uniqueEmployees : 0,
    [metrics.totalHours, metrics.uniqueEmployees]
  );

  // Aggregate employee hours for display
  const aggregatedEmployees = useMemo(() => {
    const employeeMap = new Map<string, { name: string; email: string; hours: number; projects: string[] }>();

    metrics.employees.forEach(emp => {
      const key = emp.email || emp.name;
      const existing = employeeMap.get(key);
      if (existing) {
        existing.hours += emp.hours;
        if (emp.projectName && !existing.projects.includes(emp.projectName)) {
          existing.projects.push(emp.projectName);
        }
      } else {
        employeeMap.set(key, {
          name: emp.name,
          email: emp.email,
          hours: emp.hours,
          projects: emp.projectName ? [emp.projectName] : []
        });
      }
    });

    return Array.from(employeeMap.values())
      .sort((a, b) => b.hours - a.hours);
  }, [metrics.employees]);

  // Prepare project chart data
  const projectChartData = useMemo(() =>
    metrics.projects
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)
      .map(p => ({
        name: p.name.length > 20 ? p.name.substring(0, 18) + '...' : p.name,
        fullName: p.name,
        hours: Math.round(p.hours * 10) / 10
      })),
    [metrics.projects]
  );

  const sdgColor = getSDGColor(sdgNumber);
  const sdgName = getSDGName(sdgNumber);
  const sdgFullName = getSDGFullName(sdgNumber);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div
          className="p-6 text-white rounded-t-lg"
          style={{ background: `linear-gradient(135deg, ${sdgColor}, ${sdgColor}dd)` }}
        >
          <DialogHeader>
            <div className="flex items-start gap-4">
              <img
                src={getSDGIcon(sdgNumber)}
                alt={`SDG ${sdgNumber}`}
                className="w-16 h-16 rounded-lg shadow-lg"
              />
              <div className="flex-1">
                <DialogTitle className="text-white text-xl mb-1">
                  SDG {sdgNumber}: {sdgName}
                </DialogTitle>
                <p className="text-white/80 text-sm">{sdgFullName}</p>
              </div>
            </div>
          </DialogHeader>

          {/* Commitment Badge */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {corporateCommitment ? (
                <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Corporate Commitment
                </span>
              ) : (
                <span className="bg-white/10 text-white/70 text-xs px-3 py-1 rounded-full">
                  Not in ESG Commitments
                </span>
              )}
            </div>
            <p className="text-3xl font-bold">{formatDecimal(metrics.totalHours)} hrs</p>
          </div>
        </div>

        {/* Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="employees" className="text-xs">Employees</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs">Projects</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-100">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Verified Hours</p>
                    <p className="text-lg font-bold text-blue-700">{formatDecimal(metrics.totalHours)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Employees</p>
                    <p className="text-lg font-bold text-emerald-700">{metrics.uniqueEmployees}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Briefcase className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Projects</p>
                    <p className="text-lg font-bold text-purple-700">{metrics.projectsContributed}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Value</p>
                    <p className="text-lg font-bold text-amber-700">${economicValue.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contribution Share */}
            {totalCompanyHours > 0 && (
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Share of Total Hours</span>
                    <span className="text-sm font-semibold" style={{ color: sdgColor }}>
                      {formatDecimal(hoursPercentage)}%
                    </span>
                  </div>
                  <Progress
                    value={hoursPercentage}
                    className="h-2"
                    style={{ '--progress-color': sdgColor } as any}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    {formatDecimal(metrics.totalHours)} of {formatDecimal(totalCompanyHours)} total company hours
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Project hours distribution chart */}
            {projectChartData.length > 0 && (
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <p className="font-semibold text-slate-800 mb-3">Hours by Project</p>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projectChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-2 rounded shadow-lg border text-xs">
                                  <p className="font-semibold">{data.fullName}</p>
                                  <p>Hours: {data.hours}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="hours" fill={sdgColor} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {onEvaluate && (
                <Button
                  onClick={() => onEvaluate(sdgNumber)}
                  className="flex-1"
                  style={{ backgroundColor: sdgColor }}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Evaluate Impact
                </Button>
              )}
              {!corporateCommitment && onAddToCommitment && (
                <Button
                  onClick={() => onAddToCommitment(sdgNumber)}
                  variant="outline"
                  className="flex-1"
                  style={{ borderColor: sdgColor, color: sdgColor }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to ESG
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-3 mt-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">
                {aggregatedEmployees.length} employees contributing to this SDG
              </p>
              <p className="text-xs text-slate-500">
                Avg: {formatDecimal(avgHoursPerEmployee)} hrs/person
              </p>
            </div>

            {aggregatedEmployees.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {aggregatedEmployees.map((employee, idx) => {
                  const percentage = metrics.totalHours > 0
                    ? (employee.hours / metrics.totalHours) * 100
                    : 0;

                  return (
                    <button
                      key={idx}
                      onClick={() => onNavigateToEmployee?.(employee.email)}
                      className="w-full text-left"
                    >
                      <Card className="border-slate-200 hover:border-blue-300 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                              style={{ backgroundColor: sdgColor }}
                            >
                              <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {employee.name}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {employee.projects.length} project{employee.projects.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold" style={{ color: sdgColor }}>
                                {formatDecimal(employee.hours)}
                              </p>
                              <p className="text-xs text-slate-500">hours</p>
                            </div>
                          </div>
                          <Progress
                            value={percentage}
                            className="h-1 mt-2"
                            style={{ '--progress-color': sdgColor } as any}
                          />
                        </CardContent>
                      </Card>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No employee data yet</p>
                <p className="text-sm mt-1">Employees will appear here once they contribute</p>
              </div>
            )}
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-3 mt-0">
            <p className="text-sm text-slate-600 mb-2">
              {metrics.projects.length} project{metrics.projects.length !== 1 ? 's' : ''} addressing this SDG
            </p>

            {metrics.projects.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {metrics.projects
                  .sort((a, b) => b.hours - a.hours)
                  .map((project) => {
                    const percentage = metrics.totalHours > 0
                      ? (project.hours / metrics.totalHours) * 100
                      : 0;

                    return (
                      <button
                        key={project.id}
                        onClick={() => onNavigateToProject?.(project.id)}
                        className="w-full text-left"
                      >
                        <Card className="border-slate-200 hover:border-purple-300 transition-colors">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">
                                  {project.name}
                                </p>
                                {project.volunteers && (
                                  <p className="text-xs text-slate-500">
                                    {project.volunteers} volunteer{project.volunteers !== 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                              {project.status && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  project.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                  project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {project.status}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <Progress
                                value={percentage}
                                className="h-1.5 flex-1 mr-3"
                                style={{ '--progress-color': sdgColor } as any}
                              />
                              <span className="text-sm font-bold" style={{ color: sdgColor }}>
                                {formatDecimal(project.hours)} hrs
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {formatDecimal(percentage)}% of SDG hours
                            </p>
                          </CardContent>
                        </Card>
                      </button>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Briefcase className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No projects yet</p>
                <p className="text-sm mt-1">Projects will appear here once added</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <p className="mt-4 text-[11px] text-slate-400">
          Sustainable Development Goals (SDGs) are a registered trademark of the United Nations.
        </p>
      </DialogContent>
    </Dialog>
  );
}
