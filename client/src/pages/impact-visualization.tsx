import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BeforeAfterComparison from "@/components/impact/before-after-comparison";

// Sample data for before/after comparisons
const beforeAfterData = [
  {
    id: "1",
    title: "Community Water Project",
    description: "Installation of water filters and sanitation facilities in a rural community",
    location: "Kibera, Kenya",
    date: "January 2023 - March 2023",
    beforeImage: "https://images.unsplash.com/photo-1551873753-77eceaa24ada?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    afterImage: "https://images.unsplash.com/photo-1563299796-17596ed6b017?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    beforeMetrics: [
      { label: "Clean Water Access", value: 23, unit: "% of population" },
      { label: "Water-borne Diseases", value: 68, unit: "cases/month" },
      { label: "Average Water Collection Time", value: 2.5, unit: "hours/day" }
    ],
    afterMetrics: [
      { label: "Clean Water Access", value: 87, unit: "% of population" },
      { label: "Water-borne Diseases", value: 12, unit: "cases/month" },
      { label: "Average Water Collection Time", value: 0.5, unit: "hours/day" }
    ]
  },
  {
    id: "2",
    title: "Classroom Renovation Project",
    description: "Renovation of a primary school with new facilities and learning materials",
    location: "Bogotá, Colombia",
    date: "March 2023 - June 2023",
    beforeImage: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    afterImage: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    beforeMetrics: [
      { label: "Student Attendance", value: 62, unit: "% rate" },
      { label: "Reading Proficiency", value: 34, unit: "% of students" },
      { label: "Student-Teacher Ratio", value: 45, unit: "students per teacher" }
    ],
    afterMetrics: [
      { label: "Student Attendance", value: 89, unit: "% rate" },
      { label: "Reading Proficiency", value: 71, unit: "% of students" },
      { label: "Student-Teacher Ratio", value: 25, unit: "students per teacher" }
    ]
  },
  {
    id: "3",
    title: "Community Garden Project",
    description: "Transformation of an abandoned lot into a productive community garden",
    location: "Detroit, USA",
    date: "April 2023 - August 2023",
    beforeImage: "https://images.unsplash.com/photo-1567364891000-916b695a85e2?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    afterImage: "https://images.unsplash.com/photo-1466692476655-ab0c26c69cbf?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    beforeMetrics: [
      { label: "Green Space", value: 0, unit: "sq meters" },
      { label: "Food Production", value: 0, unit: "kg/month" },
      { label: "Community Engagement", value: 5, unit: "local participants" }
    ],
    afterMetrics: [
      { label: "Green Space", value: 500, unit: "sq meters" },
      { label: "Food Production", value: 120, unit: "kg/month" },
      { label: "Community Engagement", value: 45, unit: "local participants" }
    ]
  }
];

// Sample project outcomes data
const projectOutcomes = [
  {
    id: "1",
    title: "Clean Water Initiative",
    sdgs: [6, 3],
    outcomes: [
      { metric: "Clean water access", value: 5000, unit: "people" },
      { metric: "Reduction in water-borne diseases", value: 65, unit: "%" },
      { metric: "Water filters installed", value: 650, unit: "filters" },
      { metric: "Community water committees established", value: 12, unit: "committees" }
    ]
  },
  {
    id: "2",
    title: "Education Access Program",
    sdgs: [4, 5, 10],
    outcomes: [
      { metric: "Students enrolled", value: 850, unit: "students" },
      { metric: "Girls in STEM education", value: 320, unit: "students" },
      { metric: "Teacher training sessions", value: 45, unit: "sessions" },
      { metric: "Digital devices distributed", value: 250, unit: "devices" }
    ]
  },
  {
    id: "3",
    title: "Medical Outreach",
    sdgs: [3, 10],
    outcomes: [
      { metric: "Patients treated", value: 1200, unit: "patients" },
      { metric: "Vaccinations administered", value: 780, unit: "vaccinations" },
      { metric: "Health workshops conducted", value: 35, unit: "workshops" },
      { metric: "Community health workers trained", value: 60, unit: "workers" }
    ]
  }
];

// Sample time series data
const timeSeriesData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  datasets: [
    {
      label: "2022",
      data: [120, 150, 180, 220, 250, 280, 310, 340, 370, 400, 450, 500]
    },
    {
      label: "2023",
      data: [200, 250, 300, 380, 450, 520, 600, 650, 700, 780, 850, 920]
    }
  ]
};

export default function ImpactVisualization() {
  const [activeTab, setActiveTab] = useState("before-after");

  return (
    <>
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Impact Visualization</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Visualize the concrete results and impacts of volunteer efforts
        </p>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto min-h-[44px]">
          <TabsTrigger value="before-after" className="text-xs sm:text-sm py-3">Before & After</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs sm:text-sm py-3">Outcomes</TabsTrigger>
          <TabsTrigger value="time-series" className="text-xs sm:text-sm py-3">Time Series</TabsTrigger>
        </TabsList>

        <TabsContent value="before-after" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <BeforeAfterComparison data={beforeAfterData} />
            
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Impact Stories</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-3 sm:space-y-4">
                  {beforeAfterData.map(item => (
                    <div key={item.id} className="border-b border-gray-200 dark:border-gray-700 pb-3 sm:pb-4 last:border-0 last:pb-0">
                      <h3 className="font-medium mb-1 text-sm sm:text-base">{item.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">{item.description}</p>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{item.location}</span>
                        <span className="text-gray-500 dark:text-gray-400">{item.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {projectOutcomes.map(project => (
              <Card key={project.id}>
                <CardHeader className="pb-3 p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">{project.title}</CardTitle>
                  <div className="flex gap-1 mt-2">
                    {project.sdgs.map(sdg => (
                      <div 
                        key={sdg}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ 
                          backgroundColor: 
                            sdg === 3 ? "#4C9F38" : 
                            sdg === 4 ? "#C5192D" : 
                            sdg === 5 ? "#FF3A21" : 
                            sdg === 6 ? "#26BDE2" : 
                            sdg === 10 ? "#DD1367" : "#FCC30B"
                        }}
                      >
                        {sdg}
                      </div>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="space-y-2 sm:space-y-3">
                    {project.outcomes.map((outcome, idx) => (
                      <div key={idx} className="flex justify-between items-center gap-2">
                        <span className="text-xs sm:text-sm">{outcome.metric}</span>
                        <span className="font-medium text-sm sm:text-base whitespace-nowrap">
                          {outcome.value} {outcome.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Aggregated Impact Metrics</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total People Impacted</div>
                  <div className="text-2xl sm:text-3xl font-bold text-primary mt-1">7,050</div>
                  <div className="text-xs sm:text-sm text-green-500 dark:text-green-400 mt-1">+12% from last year</div>
                </div>
                <div className="bg-green-500/10 p-4 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Communities Served</div>
                  <div className="text-2xl sm:text-3xl font-bold text-green-500 mt-1">24</div>
                  <div className="text-xs sm:text-sm text-green-500 dark:text-green-400 mt-1">+4 new communities</div>
                </div>
                <div className="bg-purple-500/10 p-4 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Volunteer Hours</div>
                  <div className="text-2xl sm:text-3xl font-bold text-purple-500 mt-1">12,480</div>
                  <div className="text-xs sm:text-sm text-green-500 dark:text-green-400 mt-1">+18% from last year</div>
                </div>
                <div className="bg-amber-500/10 p-4 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">SDGs Addressed</div>
                  <div className="text-2xl sm:text-3xl font-bold text-amber-500 mt-1">7</div>
                  <div className="text-xs sm:text-sm text-green-500 dark:text-green-400 mt-1">+2 new SDGs</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time-series" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Impact Growth Over Time</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="h-[300px] sm:h-[400px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md">
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 text-center px-4">
                  [Line chart visualization showing impact metrics over time]
                </p>
                {/* In a real application, we would render a Chart.js line chart here */}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold">+82%</div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">People Impacted</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold">+45%</div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Projects Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold">+63%</div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Volunteer Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold">+28%</div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Community Partners</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Volunteer Hours by Month</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="h-[250px] sm:h-[300px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
                    [Bar chart visualization showing volunteer hours by month]
                  </p>
                  {/* In a real application, we would render a Chart.js bar chart here */}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Impact by SDG</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="h-[250px] sm:h-[300px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
                    [Radar chart visualization showing impact across different SDGs]
                  </p>
                  {/* In a real application, we would render a Chart.js radar chart here */}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}