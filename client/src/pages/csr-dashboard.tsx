import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { TrendingUp, Users, Award, Target, BarChart3, PieChart, Download, Plus, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CSRDashboardData {
  totalPartners: number;
  activeEmployees: number;
  totalHours: number;
  totalImpact: number;
  sdgProgress: Record<number, { goal: number; name: string; color: string; progress: number }>;
  partners: Array<{
    id: number;
    companyName: string;
    employees: number;
    hours: number;
    roi: number;
  }>;
  challenges: Array<{
    id: number;
    title: string;
    sdgGoal: number;
    progress: number;
    target: number;
    status: string;
  }>;
  leaderboard: Array<{
    rank: number;
    employeeName: string;
    hours: number;
    points: number;
  }>;
}

export default function CSRDashboard() {
  const [, setLocation] = useLocation();
  const [showNewPartner, setShowNewPartner] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string>("all");

  const userId = localStorage.getItem('currentUserId');
  const { data: csrData, isLoading } = useQuery<CSRDashboardData>({
    queryKey: ["/api/csr/dashboard", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/dashboard?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch CSR dashboard");
      return response.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="px-6 pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Corporate CSR Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track impact, manage partnerships, and engage employees</p>
        </div>
        <Dialog open={showNewPartner} onOpenChange={setShowNewPartner}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Partner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Onboard New CSR Partner</DialogTitle>
              <DialogDescription>
                Add a corporate partner to track their volunteer program and impact.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <input type="text" placeholder="Company Name" className="w-full px-3 py-2 border rounded-lg" />
              <input type="email" placeholder="Contact Email" className="w-full px-3 py-2 border rounded-lg" />
              <input type="number" placeholder="Annual CSR Budget" className="w-full px-3 py-2 border rounded-lg" />
              <Button onClick={() => setShowNewPartner(false)} className="w-full">Create Partner</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="px-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Partners</p>
                <p className="text-3xl font-bold mt-2">{csrData?.totalPartners || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Engaged Employees</p>
                <p className="text-3xl font-bold mt-2">{csrData?.activeEmployees || 0}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-3xl font-bold mt-2">{csrData?.totalHours || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total ROI</p>
                <p className="text-3xl font-bold mt-2">${(csrData?.totalImpact || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <div className="px-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="reporting">Reports</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* SDG Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  SDG Alignment Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {csrData?.sdgProgress && Object.values(csrData.sdgProgress).map((sdg: any) => (
                    <div key={sdg.goal} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">SDG #{sdg.goal}: {sdg.name}</span>
                        <span className="text-sm font-bold">{sdg.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${sdg.progress}%`,
                            backgroundColor: sdg.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Employee Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Engaged Employees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {csrData?.leaderboard && csrData.leaderboard.slice(0, 5).map((emp: any) => (
                    <div key={emp.rank} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-blue-600">{emp.rank}</Badge>
                        <div>
                          <p className="font-medium">{emp.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{emp.hours} hours • {emp.points} points</p>
                        </div>
                      </div>
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Partners Tab */}
          <TabsContent value="partners" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {csrData?.partners && csrData.partners.map((partner: any) => (
                <Card key={partner.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{partner.companyName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Employees</p>
                        <p className="text-xl font-bold">{partner.employees}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Hours</p>
                        <p className="text-xl font-bold">{partner.hours}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ROI</p>
                        <p className="text-xl font-bold">${(partner.roi / 1000).toFixed(1)}K</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" size="sm">
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-6 mt-6">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Challenge
            </Button>
            <div className="space-y-3">
              {csrData?.challenges && csrData.challenges.map((challenge: any) => (
                <Card key={challenge.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{challenge.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">SDG #{challenge.sdgGoal}</p>
                      </div>
                      <Badge variant={challenge.status === 'active' ? 'default' : 'secondary'}>
                        {challenge.status}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{challenge.progress}/{challenge.target} hours</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all"
                          style={{
                            width: `${Math.min((challenge.progress / challenge.target) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reporting" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Impact Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Report Type</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>Executive Summary</option>
                    <option>Detailed Impact Report</option>
                    <option>Employee Engagement Report</option>
                    <option>SDG Alignment Report</option>
                    <option>ROI Analysis Report</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4" />
                  Generate PDF Report
                </Button>
              </CardContent>
            </Card>

            {/* Verification Status */}
            <Card>
              <CardHeader>
                <CardTitle>Output Verification Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Pending Verification</p>
                      <p className="text-sm text-muted-foreground">Awaiting audit approval</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-100">12</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Verified Outputs</p>
                      <p className="text-sm text-muted-foreground">Audit-ready data</p>
                    </div>
                    <Badge className="bg-green-600">48</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
