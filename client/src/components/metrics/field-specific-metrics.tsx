import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, FileDown, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types for our metrics
interface MetricCategory {
  id: string;
  name: string;
  description: string;
  fields: string[];
  sdgGoals: number[];
}

interface FieldMetric {
  id: string;
  name: string;
  category: string;
  unit: string;
  description: string;
  sdgGoals: number[];
  dataPoints: number;
  lastUpdated: string;
}

interface FieldMetricProps {
  metricCategories?: MetricCategory[];
  metrics?: FieldMetric[];
}

const defaultMetricCategories: MetricCategory[] = [];
const defaultMetrics: FieldMetric[] = [];

export default function FieldSpecificMetrics({ 
  metricCategories = defaultMetricCategories,
  metrics = defaultMetrics
}: FieldMetricProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("view");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // State for new metric form
  const [newMetric, setNewMetric] = useState({
    name: "",
    category: "",
    unit: "",
    description: "",
    sdgGoals: [] as number[]
  });
  
  // State for metric edit mode
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Filter and sort metrics
  const filteredMetrics = metrics.filter(metric => {
    const matchesSearch = 
      metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      metric.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || metric.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    let comparison = 0;
    
    if (sortField === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === "category") {
      comparison = a.category.localeCompare(b.category);
    } else if (sortField === "dataPoints") {
      comparison = a.dataPoints - b.dataPoints;
    } else if (sortField === "lastUpdated") {
      comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
    }
    
    return sortDirection === "asc" ? comparison : -comparison;
  });
  
  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = metricCategories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  // Handle adding/editing metrics
  const handleSubmitMetric = () => {
    if (!newMetric.name || !newMetric.category || !newMetric.unit) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    if (editMode && editId) {
      // Simulate editing a metric
      const updatedMetrics = metrics.map(metric => 
        metric.id === editId 
          ? { 
              ...metric, 
              name: newMetric.name,
              category: newMetric.category,
              unit: newMetric.unit,
              description: newMetric.description,
              sdgGoals: newMetric.sdgGoals
            } 
          : metric
      );
      
      // In a real app, we would update the database here
      
      toast({
        title: "Metric updated",
        description: `Successfully updated the "${newMetric.name}" metric`
      });
      
      // Reset form and edit state
      setEditMode(false);
      setEditId(null);
    } else {
      // Simulate adding a new metric
      const newMetricItem: FieldMetric = {
        id: Math.random().toString(36).substr(2, 9),
        name: newMetric.name,
        category: newMetric.category,
        unit: newMetric.unit,
        description: newMetric.description,
        sdgGoals: newMetric.sdgGoals,
        dataPoints: 0,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      
      // In a real app, we would add to the database here
      
      toast({
        title: "Metric created",
        description: `Successfully created the "${newMetric.name}" metric`
      });
    }
    
    // Reset form
    setNewMetric({
      name: "",
      category: "",
      unit: "",
      description: "",
      sdgGoals: []
    });
    
    // Switch to view tab
    setActiveTab("view");
  };
  
  // Handle editing a metric
  const handleEditMetric = (metric: FieldMetric) => {
    setNewMetric({
      name: metric.name,
      category: metric.category,
      unit: metric.unit,
      description: metric.description,
      sdgGoals: [...metric.sdgGoals]
    });
    
    setEditMode(true);
    setEditId(metric.id);
    setActiveTab("add");
  };
  
  // Handle deleting a metric
  const handleDeleteMetric = (id: string, name: string) => {
    // Simulate deleting a metric
    // In a real app, we would delete from the database here
    
    toast({
      title: "Metric deleted",
      description: `Successfully deleted the "${name}" metric`
    });
  };
  
  // Handle exporting metrics
  const handleExportMetrics = () => {
    // Simulate exporting metrics to CSV
    toast({
      title: "Export started",
      description: "Your metrics are being exported to CSV"
    });
  };
  
  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  // Get SDG goal tags
  const renderSDGTags = (goals: number[]) => {
    return (
      <div className="flex flex-wrap gap-1">
        {goals.map(goal => (
          <span 
            key={goal}
            className="inline-block text-xs font-medium px-2 py-1 rounded-full"
            style={{ 
              backgroundColor: 
                goal === 1 ? "#E5243B20" : 
                goal === 3 ? "#4C9F3820" : 
                goal === 4 ? "#C5192D20" : 
                goal === 5 ? "#FF3A2120" : 
                goal === 6 ? "#26BDE220" : 
                goal === 8 ? "#A21A4320" : 
                goal === 13 ? "#3F7E4420" : 
                goal === 14 ? "#0A97D920" : 
                goal === 15 ? "#56C02B20" : 
                "#FCC30B20",
              color:
                goal === 1 ? "#E5243B" : 
                goal === 3 ? "#4C9F38" : 
                goal === 4 ? "#C5192D" : 
                goal === 5 ? "#FF3A21" : 
                goal === 6 ? "#26BDE2" : 
                goal === 8 ? "#A21A43" : 
                goal === 13 ? "#3F7E44" : 
                goal === 14 ? "#0A97D9" : 
                goal === 15 ? "#56C02B" : 
                "#FCC30B"
            }}
          >
            SDG {goal}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Field-Specific Impact Metrics</CardTitle>
              <CardDescription className="text-sm">
                Customize and track domain-specific impact measurements
              </CardDescription>
            </div>
            <TabsList className="grid w-full grid-cols-3 min-h-[44px]">
              <TabsTrigger value="view" className="text-xs sm:text-sm min-h-[44px]">View</TabsTrigger>
              <TabsTrigger value="add" className="text-xs sm:text-sm min-h-[44px]">
                {editMode ? "Edit" : "Add"}
              </TabsTrigger>
              <TabsTrigger value="categories" className="text-xs sm:text-sm min-h-[44px]">Categories</TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6 pt-0">
        {/* View Metrics Tab */}
        <TabsContent value="view" className="space-y-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 sm:max-w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search metrics..."
                  className="pl-8 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {metricCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportMetrics}
                className="flex-1 sm:flex-initial text-sm min-h-[44px]"
                size="sm"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button
                onClick={() => {
                  setEditMode(false);
                  setEditId(null);
                  setNewMetric({
                    name: "",
                    category: "",
                    unit: "",
                    description: "",
                    sdgGoals: []
                  });
                  setActiveTab("add");
                }}
                className="flex-1 sm:flex-initial text-sm min-h-[44px]"
                size="sm"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
          
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-xs sm:text-sm"
                    onClick={() => handleSort("name")}
                  >
                    Metric
                    {sortField === "name" && (
                      <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-xs sm:text-sm hidden sm:table-cell"
                    onClick={() => handleSort("category")}
                  >
                    Category
                    {sortField === "category" && (
                      <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm hidden md:table-cell">Unit</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden lg:table-cell">SDG Goals</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-right text-xs sm:text-sm hidden sm:table-cell"
                    onClick={() => handleSort("dataPoints")}
                  >
                    Data
                    {sortField === "dataPoints" && (
                      <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-xs sm:text-sm hidden md:table-cell"
                    onClick={() => handleSort("lastUpdated")}
                  >
                    Updated
                    {sortField === "lastUpdated" && (
                      <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMetrics.length > 0 ? (
                  filteredMetrics.map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell className="font-medium">
                        {metric.name}
                        {metric.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {metric.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{getCategoryName(metric.category)}</TableCell>
                      <TableCell>{metric.unit}</TableCell>
                      <TableCell>{renderSDGTags(metric.sdgGoals)}</TableCell>
                      <TableCell className="text-right">{metric.dataPoints}</TableCell>
                      <TableCell>{new Date(metric.lastUpdated).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditMetric(metric)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMetric(metric.id, metric.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      No metrics found matching your search criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        {/* Add/Edit Metric Tab */}
        <TabsContent value="add" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metric-name">Metric Name</Label>
                <Input
                  id="metric-name"
                  placeholder="e.g., Clean Water Access Rate"
                  value={newMetric.name}
                  onChange={(e) => setNewMetric({...newMetric, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="metric-category">Category</Label>
                <Select 
                  value={newMetric.category} 
                  onValueChange={(value) => setNewMetric({...newMetric, category: value})}
                >
                  <SelectTrigger id="metric-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {metricCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="metric-unit">Unit of Measurement</Label>
                <Input
                  id="metric-unit"
                  placeholder="e.g., % of population"
                  value={newMetric.unit}
                  onChange={(e) => setNewMetric({...newMetric, unit: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Specify how this metric is measured (percentage, count, ratio, etc.)
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metric-description">Description</Label>
                <Input
                  id="metric-description"
                  placeholder="Brief description of what this metric measures"
                  value={newMetric.description}
                  onChange={(e) => setNewMetric({...newMetric, description: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Related SDG Goals</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 3, 4, 5, 6, 8, 13, 14, 15].map(goal => (
                    <div key={goal} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`sdg-${goal}`}
                        checked={newMetric.sdgGoals.includes(goal)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewMetric({
                              ...newMetric,
                              sdgGoals: [...newMetric.sdgGoals, goal]
                            });
                          } else {
                            setNewMetric({
                              ...newMetric,
                              sdgGoals: newMetric.sdgGoals.filter(g => g !== goal)
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`sdg-${goal}`} className="text-sm">
                        SDG {goal}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-4">
                <Button onClick={handleSubmitMetric} className="w-full">
                  {editMode ? "Update Metric" : "Add Metric"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {metricCategories.map(category => (
                <Card key={category.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <span className="font-medium mr-2">Fields:</span>
                        <span className="text-muted-foreground">
                          {category.fields.join(", ")}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="font-medium mr-2">SDGs:</span>
                        <div className="flex gap-1">
                          {category.sdgGoals.map(goal => (
                            <span 
                              key={goal}
                              className="inline-block text-xs font-medium px-1.5 py-0.5 rounded-full"
                              style={{ 
                                backgroundColor: 
                                  goal === 1 ? "#E5243B20" : 
                                  goal === 3 ? "#4C9F3820" : 
                                  goal === 4 ? "#C5192D20" : 
                                  goal === 5 ? "#FF3A2120" : 
                                  goal === 6 ? "#26BDE220" : 
                                  goal === 8 ? "#A21A4320" : 
                                  goal === 13 ? "#3F7E4420" : 
                                  goal === 14 ? "#0A97D920" : 
                                  goal === 15 ? "#56C02B20" : 
                                  "#FCC30B20",
                                color:
                                  goal === 1 ? "#E5243B" : 
                                  goal === 3 ? "#4C9F38" : 
                                  goal === 4 ? "#C5192D" : 
                                  goal === 5 ? "#FF3A21" : 
                                  goal === 6 ? "#26BDE2" : 
                                  goal === 8 ? "#A21A43" : 
                                  goal === 13 ? "#3F7E44" : 
                                  goal === 14 ? "#0A97D9" : 
                                  goal === 15 ? "#56C02B" : 
                                  "#FCC30B"
                              }}
                            >
                              {goal}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="font-medium mr-2">Metrics:</span>
                        <span className="text-muted-foreground">
                          {metrics.filter(m => m.category === category.id).length} defined
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </CardContent>
      </Tabs>
    </Card>
  );
}