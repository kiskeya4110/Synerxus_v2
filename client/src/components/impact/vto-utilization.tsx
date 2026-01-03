import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, TrendingUp, AlertCircle } from "lucide-react";

interface VTOUtilizationProps {
  allocated: number; // Total VTO hours allocated
  used: number; // Hours actually used
  employees: number; // Total employees with VTO
  participating: number; // Employees who used VTO
  vtoPerEmployee?: number; // VTO hours per employee policy
  monthlyData?: { month: string; used: number }[];
  title?: string;
}

export function VTOUtilization({
  allocated,
  used,
  employees,
  participating,
  vtoPerEmployee = 40,
  monthlyData = [],
  title = "VTO Utilization",
}: VTOUtilizationProps) {
  const metrics = useMemo(() => {
    const utilizationRate = allocated > 0 ? (used / allocated) * 100 : 0;
    const participationRate = employees > 0 ? (participating / employees) * 100 : 0;
    const avgHoursPerParticipant = participating > 0 ? used / participating : 0;
    const unusedHours = allocated - used;
    const unusedValue = unusedHours * 34.79; // Independent Sector rate
    const potentialImpact = Math.round(unusedHours * 2.5); // Estimate: 2.5 people impacted per hour

    return {
      utilizationRate,
      participationRate,
      avgHoursPerParticipant,
      unusedHours,
      unusedValue,
      potentialImpact,
    };
  }, [allocated, used, employees, participating]);

  const getUtilizationColor = (rate: number): string => {
    if (rate >= 75) return "#22c55e"; // Green
    if (rate >= 50) return "#eab308"; // Yellow
    if (rate >= 25) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  const getUtilizationLabel = (rate: number): string => {
    if (rate >= 75) return "Excellent";
    if (rate >= 50) return "Good";
    if (rate >= 25) return "Fair";
    return "Needs Attention";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900">
            <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Volunteer Time Off Analysis
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Main circular progress */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center py-6"
        >
          <div className="relative">
            {/* SVG circular progress */}
            <svg width="160" height="160" viewBox="0 0 160 160">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="12"
                className="dark:stroke-gray-700"
              />
              {/* Progress circle */}
              <motion.circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={getUtilizationColor(metrics.utilizationRate)}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 70}
                strokeDashoffset={2 * Math.PI * 70 * (1 - metrics.utilizationRate / 100)}
                transform="rotate(-90 80 80)"
                initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - metrics.utilizationRate / 100) }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-3xl font-bold"
                style={{ color: getUtilizationColor(metrics.utilizationRate) }}
              >
                {metrics.utilizationRate.toFixed(0)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {getUtilizationLabel(metrics.utilizationRate)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Hours breakdown */}
        <div className="flex items-center justify-between text-sm mb-4">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {used.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Hours Used</p>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {allocated.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Allocated</p>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {metrics.unusedHours.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Unused</p>
          </div>
        </div>

        {/* Participation stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700"
        >
          {/* Employee participation */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Employee Participation
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {participating.toLocaleString()} / {employees.toLocaleString()} ({metrics.participationRate.toFixed(0)}%)
              </span>
            </div>
            <Progress value={metrics.participationRate} className="h-2" />
          </div>

          {/* Average hours */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Avg Hours per Participant
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {metrics.avgHoursPerParticipant.toFixed(1)} hrs
            </span>
          </div>
        </motion.div>

        {/* Unused VTO alert */}
        {metrics.unusedHours > allocated * 0.25 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Untapped Impact Potential
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {metrics.unusedHours.toLocaleString()} unused VTO hours represent ${metrics.unusedValue.toLocaleString()} in potential volunteer value and could impact approximately {metrics.potentialImpact.toLocaleString()} beneficiaries.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Monthly trend mini-chart */}
        {monthlyData.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Monthly Usage Trend
            </p>
            <div className="flex items-end justify-between gap-1 h-12">
              {monthlyData.slice(-6).map((m, i) => {
                const maxUsed = Math.max(...monthlyData.map((d) => d.used));
                const height = maxUsed > 0 ? (m.used / maxUsed) * 100 : 0;

                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center">
                    <motion.div
                      className="w-full bg-indigo-500 dark:bg-indigo-400 rounded-t"
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                    />
                    <span className="text-[10px] text-gray-400 mt-1">
                      {m.month.slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default VTOUtilization;
