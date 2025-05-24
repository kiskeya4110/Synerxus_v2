import FieldSpecificMetrics from "@/components/metrics/field-specific-metrics";

export default function FieldSpecificMetricsPage() {
  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Field-Specific Metrics</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize and track domain-specific impact measurements tailored to your projects
        </p>
      </div>

      {/* Main Content */}
      <FieldSpecificMetrics />
    </>
  );
}