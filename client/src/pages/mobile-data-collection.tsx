import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Camera, Upload, Check, MapPin, Wifi, WifiOff, Clock } from "lucide-react";

// Form schemas
const activityFormSchema = z.object({
  projectId: z.string().min(1, { message: "Please select a project" }),
  activityType: z.string().min(1, { message: "Please select an activity type" }),
  date: z.string().min(1, { message: "Please enter a date" }),
  hoursSpent: z.string().min(1, { message: "Please enter hours spent" }),
  location: z.string().min(1, { message: "Please enter a location" }),
  description: z.string().min(5, { message: "Please enter a description" }),
  skillsApplied: z.string().min(1, { message: "Please select skills applied" }),
  impact: z.string().optional(),
});

const impactFormSchema = z.object({
  metricId: z.string().min(1, { message: "Please select a metric" }),
  value: z.string().min(1, { message: "Please enter a value" }),
  date: z.string().min(1, { message: "Please enter a date" }),
  location: z.string().min(1, { message: "Please enter a location" }),
  description: z.string().min(5, { message: "Please enter a description" }),
  evidenceType: z.string().min(1, { message: "Please select evidence type" }),
});

// Sample data
const projects = [
  { id: "1", name: "Clean Water Initiative" },
  { id: "2", name: "Education Access Program" },
  { id: "3", name: "Medical Outreach" },
];

const activityTypes = [
  { id: "training", name: "Training" },
  { id: "fieldwork", name: "Fieldwork" },
  { id: "assessment", name: "Assessment" },
  { id: "distribution", name: "Distribution" },
  { id: "coordination", name: "Coordination" },
  { id: "mentoring", name: "Mentoring" },
];

const skillsList = [
  { id: "teaching", name: "Teaching" },
  { id: "healthcare", name: "Healthcare" },
  { id: "engineering", name: "Engineering" },
  { id: "logistics", name: "Logistics" },
  { id: "project_management", name: "Project Management" },
  { id: "it_support", name: "IT Support" },
];

const impactMetrics = [
  { id: "1", name: "People with Clean Water Access", unit: "people" },
  { id: "2", name: "Students Educated", unit: "students" },
  { id: "3", name: "Healthcare Services Delivered", unit: "services" },
  { id: "4", name: "Meals Provided", unit: "meals" },
  { id: "5", name: "Trees Planted", unit: "trees" },
];

const evidenceTypes = [
  { id: "photo", name: "Photo" },
  { id: "video", name: "Video" },
  { id: "testimony", name: "Testimony" },
  { id: "survey", name: "Survey Results" },
  { id: "document", name: "Document" },
];

// Sample pending submissions
const pendingSubmissions = [
  {
    id: "1",
    type: "activity",
    project: "Clean Water Initiative",
    date: "2023-07-15",
    summary: "Water filter installation training",
    status: "pending",
  },
  {
    id: "2",
    type: "impact",
    project: "Education Access Program",
    date: "2023-07-12",
    summary: "Computer literacy assessment",
    status: "pending",
  },
];

export default function MobileDataCollection() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("activity");
  const [isOnline, setIsOnline] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Form hooks
  const activityForm = useForm<z.infer<typeof activityFormSchema>>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      projectId: "",
      activityType: "",
      date: new Date().toISOString().split("T")[0],
      hoursSpent: "",
      location: "",
      description: "",
      skillsApplied: "",
      impact: "",
    },
  });

  const impactForm = useForm<z.infer<typeof impactFormSchema>>({
    resolver: zodResolver(impactFormSchema),
    defaultValues: {
      metricId: "",
      value: "",
      date: new Date().toISOString().split("T")[0],
      location: "",
      description: "",
      evidenceType: "",
    },
  });

  // Form submission handlers
  const onActivitySubmit = (values: z.infer<typeof activityFormSchema>) => {
    console.log(values);
    
    if (!isOnline) {
      toast({
        title: "Saved to device",
        description: "Your data has been saved locally and will sync when online",
        duration: 3000,
      });
    } else {
      // Simulate upload
      simulateUpload(() => {
        toast({
          title: "Activity Logged Successfully",
          description: "Your volunteer activity has been recorded",
          duration: 3000,
        });
        activityForm.reset({
          projectId: "",
          activityType: "",
          date: new Date().toISOString().split("T")[0],
          hoursSpent: "",
          location: "",
          description: "",
          skillsApplied: "",
          impact: "",
        });
        setImageSrc(null);
      });
    }
  };

  const onImpactSubmit = (values: z.infer<typeof impactFormSchema>) => {
    console.log(values);
    
    if (!isOnline) {
      toast({
        title: "Saved to device",
        description: "Your data has been saved locally and will sync when online",
        duration: 3000,
      });
    } else {
      // Simulate upload
      simulateUpload(() => {
        toast({
          title: "Impact Data Submitted",
          description: "Your impact measurement has been recorded",
          duration: 3000,
        });
        impactForm.reset({
          metricId: "",
          value: "",
          date: new Date().toISOString().split("T")[0],
          location: "",
          description: "",
          evidenceType: "",
        });
        setImageSrc(null);
      });
    }
  };

  // Simulate network operations
  const simulateUpload = (onComplete: () => void) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          onComplete();
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const getLocation = () => {
    setIsLocationLoading(true);
    
    // Simulate geolocation API
    setTimeout(() => {
      setLocation("Latitude: 34.0522, Longitude: -118.2437");
      
      if (activeTab === "activity") {
        activityForm.setValue("location", "Los Angeles, CA, USA");
      } else {
        impactForm.setValue("location", "Los Angeles, CA, USA");
      }
      
      setIsLocationLoading(false);
      
      toast({
        title: "Location detected",
        description: "Your location has been automatically filled in",
        duration: 3000,
      });
    }, 1500);
  };

  const toggleCamera = () => {
    setIsCameraActive(!isCameraActive);
    
    if (!isCameraActive) {
      // Simulate camera capture after a delay
      setTimeout(() => {
        setImageSrc("https://images.unsplash.com/photo-1541332246502-2e99eaa96cc1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3");
        setIsCameraActive(false);
        
        toast({
          title: "Image captured",
          description: "Your evidence has been attached to the form",
          duration: 3000,
        });
      }, 2000);
    }
  };

  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
    
    toast({
      title: isOnline ? "Offline Mode Activated" : "Back Online",
      description: isOnline 
        ? "Your submissions will be saved locally until you're back online" 
        : "Your device is connected to the internet",
      duration: 3000,
    });
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Mobile Data Collection</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Record volunteer activities and impact metrics from the field
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleOnlineStatus}
            className={`flex items-center gap-2 w-fit ${
              isOnline ? "text-green-500" : "text-amber-500"
            }`}
            data-testid="button-toggle-online-status"
          >
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {isOnline ? "Online" : "Offline"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="p-4 sm:p-6">
                <TabsList className="grid w-full grid-cols-2 min-h-[44px]">
                  <TabsTrigger value="activity" className="text-sm sm:text-base min-h-[44px]" data-testid="tab-log-activity">Log Activity</TabsTrigger>
                  <TabsTrigger value="impact" className="text-sm sm:text-base min-h-[44px]" data-testid="tab-record-impact">Record Impact</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
              {isUploading && (
                <div className="mb-4 sm:mb-6">
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span>Uploading submission...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Activity Log Form */}
              <TabsContent value="activity" className="mt-0">
                <Form {...activityForm}>
                  <form 
                    onSubmit={activityForm.handleSubmit(onActivitySubmit)} 
                    className="space-y-4 sm:space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <FormField
                        control={activityForm.control}
                        name="projectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {projects.map((project) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={activityForm.control}
                        name="activityType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Activity Type</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select activity type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {activityTypes.map((type) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={activityForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={activityForm.control}
                        name="hoursSpent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hours Spent</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="3.5" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-end gap-2">
                        <div className="flex-grow">
                          <FormField
                            control={activityForm.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="City, Country" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          onClick={getLocation}
                          disabled={isLocationLoading}
                        >
                          {isLocationLoading ? (
                            <Clock className="h-4 w-4 animate-spin" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <FormField
                      control={activityForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the activities performed..." 
                              className="resize-none" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={activityForm.control}
                      name="skillsApplied"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skills Applied</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select skills" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {skillsList.map((skill) => (
                                <SelectItem key={skill.id} value={skill.id}>
                                  {skill.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={activityForm.control}
                      name="impact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Impact Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe any observable impact..." 
                              className="resize-none" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Note any immediate outcomes or feedback
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-2">
                      <FormLabel>Evidence (Optional)</FormLabel>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={toggleCamera}
                          className="flex items-center gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          {isCameraActive ? "Cancel" : "Take Photo"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Upload File
                        </Button>
                      </div>
                      
                      {isCameraActive && (
                        <div className="mt-2 aspect-video bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                          <div className="text-center">
                            <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500">Camera active, capturing...</p>
                          </div>
                        </div>
                      )}
                      
                      {imageSrc && !isCameraActive && (
                        <div className="mt-2 relative">
                          <img 
                            src={imageSrc} 
                            alt="Captured evidence" 
                            className="rounded-md max-h-[200px] w-auto"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setImageSrc(null)}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isUploading}>
                      {isUploading ? "Submitting..." : "Submit Activity Log"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {/* Impact Record Form */}
              <TabsContent value="impact" className="mt-0">
                <Form {...impactForm}>
                  <form 
                    onSubmit={impactForm.handleSubmit(onImpactSubmit)} 
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={impactForm.control}
                        name="metricId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Impact Metric</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select metric" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {impactMetrics.map((metric) => (
                                  <SelectItem key={metric.id} value={metric.id}>
                                    {metric.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={impactForm.control}
                        name="value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Value</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Enter quantity" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              {impactMetrics.find(m => m.id === impactForm.watch("metricId"))?.unit || "units"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={impactForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex items-end gap-2">
                        <div className="flex-grow">
                          <FormField
                            control={impactForm.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="City, Country" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          onClick={getLocation}
                          disabled={isLocationLoading}
                        >
                          {isLocationLoading ? (
                            <Clock className="h-4 w-4 animate-spin" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <FormField
                      control={impactForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the impact observed..." 
                              className="resize-none" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={impactForm.control}
                      name="evidenceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Evidence Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select evidence type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {evidenceTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-2">
                      <FormLabel>Attach Evidence</FormLabel>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={toggleCamera}
                          className="flex items-center gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          {isCameraActive ? "Cancel" : "Take Photo"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Upload File
                        </Button>
                      </div>
                      
                      {isCameraActive && (
                        <div className="mt-2 aspect-video bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                          <div className="text-center">
                            <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500">Camera active, capturing...</p>
                          </div>
                        </div>
                      )}
                      
                      {imageSrc && !isCameraActive && (
                        <div className="mt-2 relative">
                          <img 
                            src={imageSrc} 
                            alt="Captured evidence" 
                            className="rounded-md max-h-[200px] w-auto"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setImageSrc(null)}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isUploading}>
                      {isUploading ? "Submitting..." : "Submit Impact Record"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
        
        <div className="space-y-6">
          {/* Offline Queue */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Submissions
              </CardTitle>
              <CardDescription>
                Entries waiting to be synced
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingSubmissions.length > 0 ? (
                <div className="space-y-3">
                  {pendingSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <div className="font-medium text-sm">{submission.summary}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {submission.project} • {submission.date}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-primary">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <Button className="w-full mt-4" disabled={isOnline}>
                    {isOnline ? (
                      <span className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        All synced
                      </span>
                    ) : (
                      "Sync All (When Online)"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Check className="h-10 w-10 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">All entries synchronized</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Quick Tips */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Mobile Collection Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <div className="rounded-full bg-primary/10 p-1 text-primary">
                    <WifiOff className="h-4 w-4" />
                  </div>
                  <span>Toggle offline mode when in areas with poor connectivity</span>
                </li>
                <li className="flex gap-2">
                  <div className="rounded-full bg-primary/10 p-1 text-primary">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span>Use location detection to automatically fill in your position</span>
                </li>
                <li className="flex gap-2">
                  <div className="rounded-full bg-primary/10 p-1 text-primary">
                    <Camera className="h-4 w-4" />
                  </div>
                  <span>Take photos as evidence for more accurate impact tracking</span>
                </li>
                <li className="flex gap-2">
                  <div className="rounded-full bg-primary/10 p-1 text-primary">
                    <Clock className="h-4 w-4" />
                  </div>
                  <span>Log activities daily for better accuracy and recall</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="link" className="px-0">
                View Data Collection Guide
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}