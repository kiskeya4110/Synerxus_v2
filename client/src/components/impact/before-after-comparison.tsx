import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Define the structure for the data used in the component
interface BeforeAfterData {
  id: string; // Unique identifier for each before/after comparison
  title: string; // Title of the comparison
  description: string; // Description of the project or impact
  location: string; // Location where the impact occurred
  date: string; // Date of the comparison
  beforeImage: string; // URL of the 'before' image
  afterImage: string; // URL of the 'after' image
  beforeMetrics: {
    // Metrics before the project
    label: string; // Metric label (e.g., "People Educated")
    value: number; // Metric value
    unit: string; // Unit of measurement (e.g., "people", "hours")
  }[];
  afterMetrics: {
    // Metrics after the project
    label: string; // Metric label
    value: number; // Metric value
    unit: string; // Unit of measurement
  }[];
}

// Define props for the BeforeAfterComparison component
interface BeforeAfterComparisonProps {
  data: BeforeAfterData[]; // Array of data for the comparison
}

// Main component definition
export default function BeforeAfterComparison({
  data,
}: BeforeAfterComparisonProps) {
  const [activeIndex, setActiveIndex] = useState(0); // Track the current index of data
  const [view, setView] = useState<"side-by-side" | "slider">("side-by-side"); // Track the view mode
  const [sliderPosition, setSliderPosition] = useState(50); // Track the position of the slider

  // Get the currently active data based on the active index
  const activeData = data[activeIndex];

  // Function to handle navigating to the previous data
  const handlePrevious = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : data.length - 1)); // Wrap around to last item if at the beginning
  };

  // Function to handle navigating to the next data
  const handleNext = () => {
    setActiveIndex((prev) => (prev < data.length - 1 ? prev + 1 : 0)); // Wrap around to first item if at the end
  };

  // Function to handle slider position change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(parseInt(e.target.value)); // Update the slider position based on user input
  };

  // Show empty state if no data is available
  if (!data || data.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle>Before & After Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No before & after data available yet. Once your projects record
              impact metrics with baseline and current values, they'll appear
              here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Before & After Impact</CardTitle>
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as "side-by-side" | "slider")}
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
              <TabsTrigger value="slider">Slider</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">{activeData.title}</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {activeData.date}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {activeData.description}
          </p>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Location: {activeData.location}
          </div>
        </div>

        {/* Side by side view */}
        {view === "side-by-side" && (
          <div className="grid grid-cols-2 gap-2 p-4">
            <div>
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden mb-3">
                {/* Display the 'before' image */}
                <img
                  src={activeData.beforeImage}
                  alt={`Before: ${activeData.title}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center font-medium mb-2">Before</div>
              <div className="space-y-2">
                {/* Display before metrics */}
                {activeData.beforeMetrics.map((metric, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{metric.label}:</span>
                    <span className="font-medium">
                      {metric.value} {metric.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Spacer for visual separation */}
            <div className="flex flex-col justify-center items-center">
              <div className="h-16"></div> {/* Add a fixed height for space */}
            </div>
            <div>
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden mb-3">
                {/* Display the 'after' image */}
                <img
                  src={activeData.afterImage}
                  alt={`After: ${activeData.title}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center font-medium mb-2">After</div>
              <div className="space-y-2">
                {/* Display after metrics and changes compared to before metrics */}
                {activeData.afterMetrics.map((metric, idx) => {
                  const beforeMetric = activeData.beforeMetrics.find(
                    (m) => m.label === metric.label,
                  );
                  const change = beforeMetric
                    ? metric.value - beforeMetric.value
                    : metric.value;
                  const changePercent = beforeMetric
                    ? Math.round((change / beforeMetric.value) * 100)
                    : 100;

                  return (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{metric.label}:</span>
                      <div>
                        <span className="font-medium mr-2">
                          {metric.value} {metric.unit}
                        </span>
                        {change !== 0 && beforeMetric && (
                          <span
                            className={
                              change > 0
                                ? "text-green-500 dark:text-green-400 text-xs"
                                : "text-red-500 dark:text-red-400 text-xs"
                            }
                          >
                            {change > 0 ? "+" : ""}
                            {change} ({change > 0 ? "+" : ""}
                            {changePercent}%)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Slider view */}
        {view === "slider" && (
          <div className="p-4">
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden mb-4">
              <div
                className="absolute top-0 left-0 h-full overflow-hidden"
                style={{ width: `${sliderPosition}%` }}
              >
                {/* Display the 'before' image */}
                <img
                  src={activeData.beforeImage}
                  alt={`Before: ${activeData.title}`}
                  className="h-full object-cover"
                  style={{ width: `${100 / (sliderPosition / 100)}%` }}
                />
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 text-xs rounded">
                  Before
                </div>
              </div>
              <div
                className="absolute top-0 right-0 h-full overflow-hidden"
                style={{ width: `${100 - sliderPosition}%` }}
              >
                {/* Display the 'after' image */}
                <img
                  src={activeData.afterImage}
                  alt={`After: ${activeData.title}`}
                  className="h-full object-cover absolute right-0"
                  style={{ width: `${100 / ((100 - sliderPosition) / 100)}%` }}
                />
                <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 text-xs rounded">
                  After
                </div>
              </div>
              <div
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
                style={{ left: `calc(${sliderPosition}% - 2px)` }}
              ></div>
            </div>
            {/* Slider input for user interaction */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={handleSliderChange}
              className="w-full"
            />

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <h4 className="font-medium mb-2 text-sm">Before Metrics</h4>
                <div className="space-y-2">
                  {/* Display before metrics */}
                  {activeData.beforeMetrics.map((metric, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{metric.label}:</span>
                      <span className="font-medium">
                        {metric.value} {metric.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-sm">After Metrics</h4>
                <div className="space-y-2">
                  {/* Display after metrics and changes compared to before metrics */}
                  {activeData.afterMetrics.map((metric, idx) => {
                    const beforeMetric = activeData.beforeMetrics.find(
                      (m) => m.label === metric.label,
                    );
                    const change = beforeMetric
                      ? metric.value - beforeMetric.value
                      : metric.value;
                    const changePercent = beforeMetric
                      ? Math.round((change / beforeMetric.value) * 100)
                      : 100;

                    return (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{metric.label}:</span>
                        <div>
                          <span className="font-medium mr-2">
                            {metric.value} {metric.unit}
                          </span>
                          {change !== 0 && beforeMetric && (
                            <span
                              className={
                                change > 0
                                  ? "text-green-500 dark:text-green-400 text-xs"
                                  : "text-red-500 dark:text-red-400 text-xs"
                              }
                            >
                              {change > 0 ? "+" : ""}
                              {change} ({change > 0 ? "+" : ""}
                              {changePercent}%)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation controls */}
        <div className="flex justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {activeIndex + 1} of {data.length} {/* Current item count */}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="flex items-center"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
