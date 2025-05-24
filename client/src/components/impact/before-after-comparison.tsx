import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BeforeAfterData {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  beforeImage: string;
  afterImage: string;
  beforeMetrics: {
    label: string;
    value: number;
    unit: string;
  }[];
  afterMetrics: {
    label: string;
    value: number;
    unit: string;
  }[];
}

interface BeforeAfterComparisonProps {
  data: BeforeAfterData[];
}

export default function BeforeAfterComparison({ data }: BeforeAfterComparisonProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState<"side-by-side" | "slider">("side-by-side");
  const [sliderPosition, setSliderPosition] = useState(50);
  
  const activeData = data[activeIndex];
  
  const handlePrevious = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : data.length - 1));
  };
  
  const handleNext = () => {
    setActiveIndex((prev) => (prev < data.length - 1 ? prev + 1 : 0));
  };
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPosition(parseInt(e.target.value));
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Before & After Impact</CardTitle>
          <Tabs value={view} onValueChange={(v) => setView(v as "side-by-side" | "slider")}>
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
            <span className="text-sm text-gray-500 dark:text-gray-400">{activeData.date}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{activeData.description}</p>
          <div className="text-sm text-gray-600 dark:text-gray-400">Location: {activeData.location}</div>
        </div>
        
        {/* Side by side view */}
        {view === "side-by-side" && (
          <div className="grid grid-cols-2 gap-2 p-4">
            <div>
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden mb-3">
                <img 
                  src={activeData.beforeImage} 
                  alt={`Before: ${activeData.title}`} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center font-medium mb-2">Before</div>
              <div className="space-y-2">
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
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden mb-3">
                <img 
                  src={activeData.afterImage} 
                  alt={`After: ${activeData.title}`}
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="text-center font-medium mb-2">After</div>
              <div className="space-y-2">
                {activeData.afterMetrics.map((metric, idx) => {
                  const beforeMetric = activeData.beforeMetrics.find(
                    (m) => m.label === metric.label
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
                  {activeData.afterMetrics.map((metric, idx) => {
                    const beforeMetric = activeData.beforeMetrics.find(
                      (m) => m.label === metric.label
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
            {activeIndex + 1} of {data.length}
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