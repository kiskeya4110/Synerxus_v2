import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calculator, TrendingUp, Info, Save, Loader2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// SDG indicators with common KPI examples
const SDG_INDICATORS = [
  { value: "SDG 1.1.1", label: "SDG 1 - No Poverty", description: "Poverty rate reduction" },
  { value: "SDG 2.1.1", label: "SDG 2 - Zero Hunger", description: "Food security improvement" },
  { value: "SDG 3.1.1", label: "SDG 3 - Good Health", description: "Health outcomes improvement" },
  { value: "SDG 4.1.1", label: "SDG 4 - Quality Education", description: "Learning outcomes" },
  { value: "SDG 5.1.1", label: "SDG 5 - Gender Equality", description: "Gender parity measures" },
  { value: "SDG 6.1.1", label: "SDG 6 - Clean Water", description: "Access to clean water" },
  { value: "SDG 7.1.1", label: "SDG 7 - Clean Energy", description: "Energy access" },
  { value: "SDG 8.1.1", label: "SDG 8 - Decent Work", description: "Employment outcomes" },
  { value: "SDG 9.1.1", label: "SDG 9 - Industry & Innovation", description: "Infrastructure access" },
  { value: "SDG 10.1.1", label: "SDG 10 - Reduced Inequalities", description: "Inequality reduction" },
  { value: "SDG 11.1.1", label: "SDG 11 - Sustainable Cities", description: "Urban development" },
  { value: "SDG 12.1.1", label: "SDG 12 - Responsible Consumption", description: "Waste reduction" },
  { value: "SDG 13.1.1", label: "SDG 13 - Climate Action", description: "Climate resilience" },
  { value: "SDG 14.1.1", label: "SDG 14 - Life Below Water", description: "Marine conservation" },
  { value: "SDG 15.1.1", label: "SDG 15 - Life on Land", description: "Land conservation" },
  { value: "SDG 16.1.1", label: "SDG 16 - Peace & Justice", description: "Institutional development" },
  { value: "SDG 17.1.1", label: "SDG 17 - Partnerships", description: "Partnership effectiveness" },
];

const KPI_UNITS = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "count", label: "Count (number)" },
  { value: "rate", label: "Rate (per 1000)" },
  { value: "score", label: "Score (0-100)" },
  { value: "index", label: "Index value" },
];

const aiuSettingsSchema = z.object({
  sdgIndicator: z.string().min(1, "SDG indicator is required"),
  kpiName: z.string().min(1, "KPI name is required"),
  kpiUnit: z.string().min(1, "KPI unit is required"),
  kpiBefore: z.number({ required_error: "Baseline KPI is required" }),
  kpiAfter: z.number().nullable().optional(),
  attributionFactor: z.number().min(0).max(1),
  attributionMethodology: z.string().optional(),
  notes: z.string().optional(),
});

type AIUSettingsForm = z.infer<typeof aiuSettingsSchema>;

interface AIUSettingsFormProps {
  projectId: number;
  projectSdgs?: number[];
  onSuccess?: () => void;
}

export default function AIUSettingsForm({ projectId, projectSdgs = [], onSuccess }: AIUSettingsFormProps) {
  const { toast } = useToast();
  const [calculatedAIU, setCalculatedAIU] = useState<number | null>(null);

  // Fetch existing AIU settings
  const { data: existingSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/aiu/project", projectId, "settings"],
    queryFn: async () => {
      const response = await fetch(`/api/aiu/project/${projectId}/settings`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch AIU settings");
      }
      return response.json();
    },
  });

  const form = useForm<AIUSettingsForm>({
    resolver: zodResolver(aiuSettingsSchema),
    defaultValues: {
      sdgIndicator: projectSdgs.length > 0 ? `SDG ${projectSdgs[0]}.1.1` : "",
      kpiName: "",
      kpiUnit: "percentage",
      kpiBefore: 0,
      kpiAfter: null,
      attributionFactor: 0.2,
      attributionMethodology: "",
      notes: "",
    },
  });

  // Update form when existing settings load
  useEffect(() => {
    if (existingSettings) {
      form.reset({
        sdgIndicator: existingSettings.sdgIndicator || "",
        kpiName: existingSettings.kpiName || "",
        kpiUnit: existingSettings.kpiUnit || "percentage",
        kpiBefore: existingSettings.kpiBefore ?? 0,
        kpiAfter: existingSettings.kpiAfter ?? null,
        attributionFactor: existingSettings.attributionFactor ?? 0.2,
        attributionMethodology: existingSettings.attributionMethodology || "",
        notes: existingSettings.notes || "",
      });
    }
  }, [existingSettings, form]);

  // Calculate preview AIU when values change
  const kpiBefore = form.watch("kpiBefore");
  const kpiAfter = form.watch("kpiAfter");
  const attributionFactor = form.watch("attributionFactor");

  useEffect(() => {
    if (kpiBefore !== undefined && kpiAfter !== undefined && kpiAfter !== null && attributionFactor !== undefined) {
      const deltaKpi = kpiAfter - kpiBefore;
      const deltaSynerxus = deltaKpi * attributionFactor;
      setCalculatedAIU(Math.round(deltaSynerxus * 100) / 100);
    } else {
      setCalculatedAIU(null);
    }
  }, [kpiBefore, kpiAfter, attributionFactor]);

  const saveMutation = useMutation({
    mutationFn: async (data: AIUSettingsForm) => {
      const response = await fetch(`/api/aiu/project/${projectId}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save AIU settings");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aiu/project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/aiu/volunteer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "AIU Settings Saved",
        description: "Your KPI settings have been saved successfully. AIU calculations will now use these values.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save AIU settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AIUSettingsForm) => {
    saveMutation.mutate(data);
  };

  if (isLoadingSettings) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-200 dark:border-emerald-800">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <CardTitle className="text-lg">AIU (Attributable Impact Units) Settings</CardTitle>
            <CardDescription>
              Configure KPI baselines and attribution factors for accurate impact measurement
            </CardDescription>
          </div>
        </div>
        {existingSettings && (
          <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            <span>AIU settings configured</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* SDG Indicator */}
            <FormField
              control={form.control}
              name="sdgIndicator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    SDG Indicator
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The Sustainable Development Goal your project primarily addresses</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select SDG indicator" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SDG_INDICATORS.map((sdg) => (
                        <SelectItem key={sdg.value} value={sdg.value}>
                          <div className="flex flex-col">
                            <span>{sdg.label}</span>
                            <span className="text-xs text-muted-foreground">{sdg.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* KPI Name and Unit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="kpiName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KPI Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Reading Proficiency Rate, Employment Rate"
                      />
                    </FormControl>
                    <FormDescription>
                      The specific metric you're measuring
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kpiUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KPI Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {KPI_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* KPI Before and After */}
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                KPI Measurement Values
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="kpiBefore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Baseline KPI (Before)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value}
                        />
                      </FormControl>
                      <FormDescription>
                        KPI value before project intervention
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kpiAfter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current/Target KPI (After)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === "" ? null : parseFloat(val));
                          }}
                          value={field.value ?? ""}
                          placeholder="Enter when measured"
                        />
                      </FormControl>
                      <FormDescription>
                        KPI value after project intervention (leave empty if not yet measured)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Preview calculation */}
              {calculatedAIU !== null && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      Estimated Project AIU Contribution:
                    </span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {calculatedAIU > 0 ? "+" : ""}{calculatedAIU}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                    ΔKPI = {(kpiAfter ?? 0) - (kpiBefore ?? 0)} × Attribution Factor ({(attributionFactor * 100).toFixed(0)}%)
                  </p>
                </div>
              )}
            </div>

            {/* Attribution Factor */}
            <FormField
              control={form.control}
              name="attributionFactor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Attribution Factor: {(field.value * 100).toFixed(0)}%
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            The percentage of KPI change attributable to volunteer efforts.
                            Default is 20% (conservative estimate).
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <div className="pt-2">
                      <Slider
                        value={[field.value * 100]}
                        onValueChange={([value]) => field.onChange(value / 100)}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    How much of the KPI change is directly attributable to this project's volunteer activities
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attribution Methodology */}
            <FormField
              control={form.control}
              name="attributionMethodology"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attribution Methodology (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe how attribution factor was determined (e.g., comparison group, expert assessment, historical data)"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Any additional context about the KPI measurement or data sources"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save AIU Settings
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
