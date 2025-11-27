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
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
          <CardTitle className="text-base sm:text-lg">Before & After Impact</CardTitle>
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as "side-by-side" | "slider")}
          >
            <TabsList className="grid grid-cols-2 text-xs sm:text-sm h-8 sm:h-10">
              <TabsTrigger value="side-by-side" className="text-xs sm:text-sm px-2 sm:px-4">Side</TabsTrigger>
              <TabsTrigger value="slider" className="text-xs sm:text-sm px-2 sm:px-4">Slider</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-2 sm:p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 mb-1 sm:mb-2">
            <h3 className="text-base sm:text-lg font-semibold line-clamp-2">{activeData.title}</h3>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
              {activeData.date}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 sm:mb-2 line-clamp-2">
            {activeData.description}
          </p>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
            Loc: {activeData.location}
          </div>
        </div>

        {/* Side by side view */}
        {view === "side-by-side" && (
          <div className="p-2 sm:p-6 space-y-4 sm:space-y-8">
            {/* Images in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-6">
              <div>
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-2 sm:mb-4 shadow-md">
                  <img
                    src={activeData.beforeImage}
                    alt={`Before: ${activeData.title}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-center font-bold text-base sm:text-lg mb-2 sm:mb-3">Before</h4>
                <div className="space-y-1 sm:space-y-3 bg-gray-50 dark:bg-gray-900 p-2 sm:p-4 rounded-lg">
                  {activeData.beforeMetrics.map((metric, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs sm:text-sm gap-2">
                      <span className="text-gray-600 dark:text-gray-400 truncate">{metric.label}:</span>
                      <span className="font-semibold text-sm sm:text-base flex-shrink-0">{metric.value} {metric.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-2 sm:mb-4 shadow-md">
                  <img
                    src={activeData.afterImage}
                    alt={`After: ${activeData.title}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-center font-bold text-base sm:text-lg mb-2 sm:mb-3">After</h4>
                <div className="space-y-1 sm:space-y-3 bg-green-50 dark:bg-green-900/20 p-2 sm:p-4 rounded-lg border border-green-200 dark:border-green-800">
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
                      <div key={idx} className="flex justify-between items-center text-xs sm:text-sm gap-1 min-w-0">
                        <span className="text-gray-600 dark:text-gray-400 truncate">{metric.label}:</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="font-semibold text-sm sm:text-base">{metric.value} {metric.unit}</span>
                          {change !== 0 && beforeMetric && (
                            <span
                              className={`text-xs font-semibold px-1 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap ${
                                change > 0
                                  ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                  : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                              }`}
                            >
                              {change > 0 ? "+" : ""}{change}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Description below images */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 sm:p-6">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 sm:mb-3 text-sm sm:text-base">Details</h4>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                <p className="truncate"><strong>Desc:</strong> {activeData.description}</p>
                <p className="truncate"><strong>Loc:</strong> {activeData.location}</p>
                <p className="truncate"><strong>Date:</strong> {activeData.date}</p>
              </div>
            </div>
          </div>
        )}

        {/* Slider view */}
        {view === "slider" && (
          <div className="p-2 sm:p-4">
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden mb-2 sm:mb-4">
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
                <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black/70 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded">
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
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-black/70 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mt-2 sm:mt-4">
              <div>
                <h4 className="font-medium mb-1 sm:mb-2 text-xs sm:text-sm">Before</h4>
                <div className="space-y-1">
                  {/* Display before metrics */}
                  {activeData.beforeMetrics.map((metric, idx) => (
                    <div key={idx} className="flex justify-between text-xs sm:text-sm gap-1 min-w-0">
                      <span className="truncate">{metric.label}:</span>
                      <span className="font-medium flex-shrink-0">
                        {metric.value} {metric.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-1 sm:mb-2 text-xs sm:text-sm">After</h4>
                <div className="space-y-1">
                  {/* Display after metrics and changes compared to before metrics */}
                  {activeData.afterMetrics.map((metric, idx) => {
                    const beforeMetric = activeData.beforeMetrics.find(
                      (m) => m.label === metric.label,
                    );
                    const change = beforeMetric
                      ? metric.value - beforeMetric.value
                      : metric.value;

                    return (
                      <div key={idx} className="flex justify-between text-xs sm:text-sm gap-1 min-w-0">
                        <span className="truncate">{metric.label}:</span>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <span className="font-medium">
                            {metric.value} {metric.unit}
                          </span>
                          {change !== 0 && beforeMetric && (
                            <span
                              className={
                                change > 0
                                  ? "text-green-500 dark:text-green-400 text-xs font-semibold"
                                  : "text-red-500 dark:text-red-400 text-xs font-semibold"
                              }
                            >
                              {change > 0 ? "+" : ""}{change}
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
        <div className="flex justify-between items-center p-2 sm:p-4 border-t border-gray-200 dark:border-gray-700 gap-1 sm:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            className="flex items-center text-xs sm:text-sm px-2 sm:px-4"
          >
            <ChevronLeft className="h-3 sm:h-4 w-3 sm:w-4" />
            <span className="hidden sm:inline ml-1">Prev</span>
          </Button>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
            {activeIndex + 1}/{data.length}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="flex items-center text-xs sm:text-sm px-2 sm:px-4"
          >
            <span className="hidden sm:inline mr-1">Next</span>
            <ChevronRight className="h-3 sm:h-4 w-3 sm:w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
