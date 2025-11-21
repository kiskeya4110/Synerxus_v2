import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const reportFormSchema = z.object({
  projectTitle: z.string().min(1, "Project title required"),
  reportingPeriod: z.string().min(1, "Reporting period required"),
  locationsServed: z.string().min(1, "Locations required"),
  keyStories: z.string().min(1, "Stories/case studies required"),
  csrAlignment: z.string().min(1, "CSR/ESG alignment required"),
  targetAudience: z.enum(["funder", "csr_team", "ngo_partner", "volunteer"]),
  tone: z.enum(["professional", "inspirational", "data-driven", "warm"]),
  impactFocus: z.enum(["sdg_alignment", "beneficiary_reach", "volunteer_hours", "esg_metrics"]),
});

type ReportFormData = z.infer<typeof reportFormSchema>;

export default function ImpactReportGenerator() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/users/me"],
  });

  const { data: dashboardData } = useQuery<any>({
    queryKey: ["/api/dashboard/summary", currentUser?.id],
    enabled: !!currentUser?.id,
  });

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      projectTitle: "",
      reportingPeriod: "",
      locationsServed: "",
      keyStories: "",
      csrAlignment: "",
      targetAudience: "funder",
      tone: "professional",
      impactFocus: "sdg_alignment",
    },
  });

  const onSubmit = async (data: ReportFormData) => {
    setGenerating(true);
    try {
      const payload = {
        ...data,
        organizationName: currentUser?.name || "Organization",
        metrics: {
          activeVolunteers: dashboardData?.activeVolunteers || 0,
          totalHours: dashboardData?.totalHours || 0,
          activeProjects: dashboardData?.activeProjects || 0,
          totalBeneficiariesReached: dashboardData?.totalBeneficiariesReached || 0,
          totalVolunteers: dashboardData?.activeVolunteers || 0,
        },
      };

      console.log("Sending report request:", payload);

      const response = await fetch("/api/generate-impact-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Failed to generate report");
      }

      if (result.report) {
        setGeneratedReport(result.report);
        toast({
          title: "Success",
          description: "Impact report generated successfully!",
        });
      } else {
        throw new Error("No report content received");
      }
    } catch (error: any) {
      console.error("Report generation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Synerxus Impact Report</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Generate AI-powered, funder-ready impact reports</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Organization</p>
              <p className="font-semibold text-slate-900 dark:text-white">{currentUser?.name || "Loading..."}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Report Configuration</CardTitle>
                <CardDescription>Customize your impact report</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="projectTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Project Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Health Initiative 2024" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reportingPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Reporting Period</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Q1 2024" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="locationsServed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Locations Served</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Philippines, Haiti, Zimbabwe" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="keyStories"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Key Stories/Case Studies</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe 1-2 key volunteer stories or case studies..." className="text-xs h-20" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="csrAlignment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">CSR/ESG Alignment</FormLabel>
                          <FormControl>
                            <Textarea placeholder="ESG indicators, employee participation..." className="text-xs h-20" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetAudience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Target Audience</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="text-xs">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="funder">Funder</SelectItem>
                              <SelectItem value="csr_team">CSR Team</SelectItem>
                              <SelectItem value="ngo_partner">NGO Partner</SelectItem>
                              <SelectItem value="volunteer">Volunteer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Tone</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="text-xs">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="inspirational">Inspirational</SelectItem>
                              <SelectItem value="data-driven">Data-Driven</SelectItem>
                              <SelectItem value="warm">Warm</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="impactFocus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Impact Focus</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="text-xs">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sdg_alignment">SDG Alignment</SelectItem>
                              <SelectItem value="beneficiary_reach">Beneficiary Reach</SelectItem>
                              <SelectItem value="volunteer_hours">Volunteer Hours</SelectItem>
                              <SelectItem value="esg_metrics">ESG Metrics</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={generating} className="w-full mt-6">
                      {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {generating ? "Generating..." : "Generate Report"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Report Preview */}
          <div className="lg:col-span-2">
            {generatedReport ? (
              <Card className="bg-white dark:bg-slate-800">
                <CardHeader>
                  <CardTitle>Generated Impact Report</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const element = document.createElement("a");
                      element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(generatedReport));
                      element.setAttribute("download", "impact-report.txt");
                      element.style.display = "none";
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="absolute top-4 right-4"
                  >
                    Download
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed font-serif bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto">
                      {generatedReport}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-dashed">
                <CardContent className="pt-12 pb-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-2">Your generated report will appear here</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Fill out the form and click "Generate Report" to create your AI-powered impact report</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
