import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, FileText } from "lucide-react";

declare global {
  interface Window {
    html2pdf?: any;
  }
}

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

  const userId = localStorage.getItem("currentUserId");
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
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
    <div className="min-h-screen bg-[#faf9f7] dark:bg-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">LOGO HERE</div>
            <div className="text-right">
              <h1 className="text-xl font-bold">
                <span className="text-slate-900 dark:text-white">SYNER</span>
                <span style={{ color: '#F59E0B' }}>XUS</span>
              </h1>
              <p className="text-xs text-orange-500">Connect. Manage. Impact Globally.</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Impact Report Generator</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Provide structured inputs for a funder-ready, SDG-aligned report.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div>
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg">Report Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="projectTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project / Program Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Skills for Success & Economic Empowerment" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reportingPeriod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reporting Period *</FormLabel>
                          <FormControl>
                            <Input placeholder="MM/DD/YYYY" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="locationsServed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Locations Served *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Ndola, Zambia; Haiti; Philippines" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="keyStories"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Key Stories / Case Studies *</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Share volunteer stories and beneficiary testimonials..." className="h-24" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="csrAlignment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Corporate CSR/ESG Alignment *</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Employee participation, ESG indicators, verified impact..." className="h-24" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="targetAudience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Target Audience *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Tone *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="impactFocus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Impact Focus *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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
          <div>
            {generatedReport ? (
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle>Generated Report</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                        script.onload = () => {
                          const element = document.getElementById('report-content');
                          if (element && window.html2pdf) {
                            const opt = {
                              margin: 10,
                              filename: 'impact-report.pdf',
                              image: { type: 'jpeg', quality: 0.98 },
                              html2canvas: { scale: 2 },
                              jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
                            };
                            window.html2pdf().set(opt).from(element).save();
                          }
                        };
                        document.head.appendChild(script);
                      }}
                    >
                      <FileText className="w-4 h-4 mr-1" /> PDF
                    </Button>
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
                    >
                      <Download className="w-4 h-4 mr-1" /> TXT
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div id="report-content" className="whitespace-pre-wrap text-sm leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700 max-h-[600px] overflow-y-auto font-sans">
                    {generatedReport}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed border-slate-300 dark:border-slate-600">
                <CardContent className="pt-16 pb-16 text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-2">Report preview will appear here</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Fill the form and click "Generate Report"</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
