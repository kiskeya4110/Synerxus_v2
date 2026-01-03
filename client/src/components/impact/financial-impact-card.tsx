import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, Calculator } from "lucide-react";
import { formatDecimal } from "@/lib/format-utils";

interface FinancialImpactCardProps {
  volunteerHours: number;
  hourlyValue?: number; // Default: $34.79 (Independent Sector)
  operatingCost?: number;
  beneficiaries: number;
  volunteers?: number;
  title?: string;
  showBreakdown?: boolean;
}

export function FinancialImpactCard({
  volunteerHours,
  hourlyValue = 34.79, // Independent Sector 2024 rate
  operatingCost = 0,
  beneficiaries,
  volunteers = 0,
  title = "Financial Impact",
  showBreakdown = true,
}: FinancialImpactCardProps) {
  const metrics = useMemo(() => {
    const volunteerValue = volunteerHours * hourlyValue;
    const costPerBeneficiary = beneficiaries > 0
      ? (operatingCost + volunteerValue) / beneficiaries
      : 0;
    const roi = operatingCost > 0
      ? ((volunteerValue - operatingCost) / operatingCost) * 100
      : 0;
    const sroi = operatingCost > 0
      ? volunteerValue / operatingCost
      : 0;
    const avgHoursPerVolunteer = volunteers > 0
      ? volunteerHours / volunteers
      : 0;

    return {
      volunteerValue,
      costPerBeneficiary,
      roi,
      sroi,
      avgHoursPerVolunteer,
    };
  }, [volunteerHours, hourlyValue, operatingCost, beneficiaries, volunteers]);

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        {/* Primary metric */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center py-4"
        >
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(metrics.volunteerValue)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Volunteer Time Value
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {volunteerHours.toLocaleString()} hours @ ${hourlyValue}/hr
          </p>
        </motion.div>

        {/* Secondary metrics grid */}
        {showBreakdown && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            {/* Cost per Beneficiary */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-1 mb-1">
                <Users className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Cost/Beneficiary</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.costPerBeneficiary > 0
                  ? `$${metrics.costPerBeneficiary.toFixed(2)}`
                  : "N/A"}
              </p>
            </div>

            {/* SROI */}
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Social ROI</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.sroi > 0 ? `${metrics.sroi.toFixed(1)}x` : "N/A"}
              </p>
            </div>

            {/* ROI % */}
            {operatingCost > 0 && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-1 mb-1">
                  <Calculator className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">ROI</span>
                </div>
                <p className={`text-lg font-semibold ${metrics.roi >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {metrics.roi >= 0 ? "+" : ""}{metrics.roi.toFixed(0)}%
                </p>
              </div>
            )}

            {/* Avg Hours per Volunteer */}
            {volunteers > 0 && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-1 mb-1">
                  <Users className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Hrs/Volunteer</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {metrics.avgHoursPerVolunteer.toFixed(1)}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Methodology note */}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-4 text-center">
          Hourly rate based on Independent Sector's value of volunteer time
        </p>
      </CardContent>
    </Card>
  );
}

export default FinancialImpactCard;
