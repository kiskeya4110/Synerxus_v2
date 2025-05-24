import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/components/layout/theme-provider";
import SDGIcons from "@/assets/sdg-icons";

// SDG data with titles, descriptions and colors
const sdgData = [
  {
    id: 1,
    title: "No Poverty",
    description: "End poverty in all its forms everywhere",
    color: "#E5243B",
    metrics: [
      { name: "People lifted from poverty", value: 120, unit: "people", target: 500 },
      { name: "Micro-businesses supported", value: 45, unit: "businesses", target: 100 },
      { name: "Financial literacy trainings", value: 24, unit: "sessions", target: 30 }
    ]
  },
  {
    id: 2,
    title: "Zero Hunger",
    description: "End hunger, achieve food security and improved nutrition and promote sustainable agriculture",
    color: "#DDA63A",
    metrics: [
      { name: "Meals provided", value: 3450, unit: "meals", target: 5000 },
      { name: "Community gardens established", value: 8, unit: "gardens", target: 15 },
      { name: "Farmers trained", value: 32, unit: "farmers", target: 50 }
    ]
  },
  {
    id: 3,
    title: "Good Health and Well-being",
    description: "Ensure healthy lives and promote well-being for all at all ages",
    color: "#4C9F38",
    metrics: [
      { name: "Medical consultations", value: 215, unit: "consultations", target: 300 },
      { name: "Health workshops", value: 18, unit: "workshops", target: 25 },
      { name: "Vaccinations administered", value: 180, unit: "vaccinations", target: 250 }
    ]
  },
  {
    id: 4,
    title: "Quality Education",
    description: "Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all",
    color: "#C5192D",
    metrics: [
      { name: "Students tutored", value: 86, unit: "students", target: 120 },
      { name: "Educational resources distributed", value: 450, unit: "resources", target: 500 },
      { name: "Teacher training sessions", value: 12, unit: "sessions", target: 20 }
    ]
  },
  {
    id: 5,
    title: "Gender Equality",
    description: "Achieve gender equality and empower all women and girls",
    color: "#FF3A21",
    metrics: [
      { name: "Women in leadership programs", value: 64, unit: "participants", target: 100 },
      { name: "Gender equality workshops", value: 15, unit: "workshops", target: 30 },
      { name: "Girls in STEM initiatives", value: 45, unit: "participants", target: 75 }
    ]
  },
  {
    id: 6,
    title: "Clean Water and Sanitation",
    description: "Ensure availability and sustainable management of water and sanitation for all",
    color: "#26BDE2",
    metrics: [
      { name: "Water filters installed", value: 120, unit: "filters", target: 150 },
      { name: "People with clean water access", value: 3200, unit: "people", target: 5000 },
      { name: "Sanitation facilities built", value: 18, unit: "facilities", target: 25 }
    ]
  },
  {
    id: 7,
    title: "Affordable and Clean Energy",
    description: "Ensure access to affordable, reliable, sustainable and modern energy for all",
    color: "#FCC30B",
    metrics: [
      { name: "Solar panels installed", value: 35, unit: "panels", target: 50 },
      { name: "Households with improved energy", value: 120, unit: "households", target: 200 },
      { name: "Energy efficiency trainings", value: 8, unit: "trainings", target: 15 }
    ]
  }
];

// Connected projects data
const connectedProjects = [
  {
    id: 1,
    name: "Clean Water Initiative",
    sdgs: [6, 3],
    activities: [
      { name: "Water testing program", impact: "High", sdg: 6 },
      { name: "Community hygiene workshops", impact: "Medium", sdg: 3 }
    ]
  },
  {
    id: 2,
    name: "Education Access Program",
    sdgs: [4, 5, 1],
    activities: [
      { name: "Rural school support", impact: "High", sdg: 4 },
      { name: "Girls' education initiative", impact: "High", sdg: 5 },
      { name: "Scholarship program", impact: "Medium", sdg: 1 }
    ]
  },
  {
    id: 3,
    name: "Medical Outreach",
    sdgs: [3, 2],
    activities: [
      { name: "Mobile clinic program", impact: "High", sdg: 3 },
      { name: "Nutrition education", impact: "Medium", sdg: 2 }
    ]
  }
];

export default function SDGMapping() {
  const { theme } = useTheme();
  const [selectedSDG, setSelectedSDG] = useState(6); // Default to Clean Water (SDG 6)
  
  const selectedData = sdgData.find(sdg => sdg.id === selectedSDG) || sdgData[0];
  const relatedProjects = connectedProjects.filter(project => project.sdgs.includes(selectedSDG));
  
  const getMetricColor = (value: number, target: number) => {
    const percentage = (value / target) * 100;
    if (percentage < 33) return "text-red-500 dark:text-red-400";
    if (percentage < 66) return "text-yellow-500 dark:text-yellow-400";
    return "text-green-500 dark:text-green-400";
  };
  
  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">SDG Mapping</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect volunteer activities to Sustainable Development Goals and track impact
        </p>
      </div>
      
      {/* SDG Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        {sdgData.map(sdg => (
          <button
            key={sdg.id}
            onClick={() => setSelectedSDG(sdg.id)}
            className={`p-4 rounded-lg border ${
              selectedSDG === sdg.id 
                ? 'ring-2 ring-primary border-primary' 
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            style={{ backgroundColor: selectedSDG === sdg.id ? `${sdg.color}15` : '' }}
          >
            {SDGIcons[sdg.id] ? 
              <div className="flex justify-center">
                {SDGIcons[sdg.id]({ width: 60, height: 60 })}
              </div>
              :
              <div 
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: sdg.color }}
              >
                {sdg.id}
              </div>
            }
            <p className="mt-2 text-sm font-medium text-center">{sdg.title}</p>
          </button>
        ))}
      </div>
      
      {/* Selected SDG Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SDG Information */}
        <Card className="lg:col-span-2">
          <CardHeader style={{ backgroundColor: `${selectedData.color}15` }}>
            <div className="flex items-center">
              <div className="mr-4">
                {SDGIcons[selectedData.id] ? 
                  SDGIcons[selectedData.id]({ width: 60, height: 60 }) 
                  : 
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                    style={{ backgroundColor: selectedData.color }}
                  >
                    {selectedData.id}
                  </div>
                }
              </div>
              <div>
                <Badge 
                  className="mb-2"
                  style={{ 
                    backgroundColor: selectedData.color,
                    color: 'white'
                  }}
                >
                  Goal {selectedData.id}
                </Badge>
                <CardTitle>{selectedData.title}</CardTitle>
                <CardDescription className="mt-1">{selectedData.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Impact Metrics</h3>
            <div className="space-y-4">
              {selectedData.metrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <span className={`text-sm font-medium ${getMetricColor(metric.value, metric.target)}`}>
                      {metric.value} / {metric.target} {metric.unit}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Progress 
                      value={(metric.value / metric.target) * 100} 
                      className="h-2 flex-grow"
                    />
                    <span className="ml-4 text-xs text-gray-500 dark:text-gray-400 min-w-[40px] text-right">
                      {Math.round((metric.value / metric.target) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Connected Projects</h3>
              {relatedProjects.length > 0 ? (
                <div className="space-y-4">
                  {relatedProjects.map(project => (
                    <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-medium">{project.name}</h4>
                      <div className="mt-2 space-y-2">
                        {project.activities
                          .filter(activity => activity.sdg === selectedSDG)
                          .map((activity, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span>{activity.name}</span>
                              <Badge variant={
                                activity.impact === "High" ? "default" : 
                                activity.impact === "Medium" ? "outline" : "secondary"
                              }>
                                {activity.impact} Impact
                              </Badge>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No projects are currently connected to this SDG.</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Action Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>SDG Alignment Tools</CardTitle>
              <CardDescription>
                Connect your projects and activities to SDGs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="connect">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="connect">Connect</TabsTrigger>
                  <TabsTrigger value="report">Report</TabsTrigger>
                </TabsList>
                
                <TabsContent value="connect" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project</label>
                    <select className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                      <option value="">Select a project</option>
                      {connectedProjects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Activity</label>
                    <select className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                      <option value="">Select an activity</option>
                      <option value="1">Water testing program</option>
                      <option value="2">Community hygiene workshops</option>
                      <option value="3">Mobile clinic program</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SDG Goal</label>
                    <select 
                      className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      value={selectedSDG}
                      onChange={(e) => setSelectedSDG(Number(e.target.value))}
                    >
                      {sdgData.map(sdg => (
                        <option key={sdg.id} value={sdg.id}>Goal {sdg.id}: {sdg.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Impact Level</label>
                    <select className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  
                  <button className="w-full mt-4 bg-primary text-white py-2 rounded-md hover:bg-primary-700">
                    Connect Activity to SDG
                  </button>
                </TabsContent>
                
                <TabsContent value="report" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Generate Report For</label>
                    <select className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                      <option value="sdg">This SDG (Goal {selectedSDG})</option>
                      <option value="all">All SDGs</option>
                      <option value="project">Specific Project</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Report Type</label>
                    <select className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                      <option value="summary">Summary Report</option>
                      <option value="detailed">Detailed Report</option>
                      <option value="impact">Impact Metrics</option>
                      <option value="visual">Visual Dashboard</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time Period</label>
                    <select className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                      <option value="month">Last Month</option>
                      <option value="quarter">Last Quarter</option>
                      <option value="year">Last Year</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>
                  
                  <button className="w-full mt-4 bg-primary text-white py-2 rounded-md hover:bg-primary-700">
                    Generate Report
                  </button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>SDG Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#" className="text-primary hover:underline flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    SDG {selectedSDG} Official Indicators
                  </a>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Video: Measuring Impact for SDG {selectedSDG}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    Best Practices Guide
                  </a>
                </li>
                <li>
                  <a href="#" className="text-primary hover:underline flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Connect with SDG {selectedSDG} Partners
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}