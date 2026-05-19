import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Share2, Save, Copy, Download, Eye } from "lucide-react";

interface ImpactStoryData {
  id: string;
  title: string;
  project: string;
  rawData: string;
  generatedStory: string;
  date: string;
  audience: "general" | "donors" | "volunteers" | "partners" | "community";
  tone: "inspirational" | "factual" | "urgent" | "celebratory";
  focus: "people" | "environment" | "education" | "health" | "community";
}

interface ImpactStorytellingProps {
  projectImpacts: {
    id: string;
    name: string;
    description: string;
    metrics: {
      label: string;
      before: number;
      after: number;
      unit: string;
    }[];
    location: string;
    date: string;
  }[];
  savedStories?: ImpactStoryData[];
}

export default function ImpactStorytelling({ 
  projectImpacts, 
  savedStories = [] 
}: ImpactStorytellingProps) {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [audience, setAudience] = useState<string>("general");
  const [tone, setTone] = useState<string>("inspirational");
  const [focus, setFocus] = useState<string>("people");
  const [customNotes, setCustomNotes] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedStory, setGeneratedStory] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"generate" | "saved">("generate");
  const [stories, setStories] = useState<ImpactStoryData[]>(savedStories);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);

  // Get the selected project data
  const selectedProjectData = projectImpacts.find(p => p.id === selectedProject);

  const generateStory = () => {
    if (!selectedProject) {
      toast({
        title: "No project selected",
        description: "Please select a project to generate a story",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI story generation with a timeout
    setTimeout(() => {
      const project = projectImpacts.find(p => p.id === selectedProject);
      
      if (!project) {
        setIsGenerating(false);
        return;
      }
      
      // Generate a story based on the project data and selected parameters
      const storyIntro = audience === "donors" 
        ? "Thanks to your generous support, " 
        : audience === "volunteers" 
          ? "Through your dedicated service, " 
          : "Through our community efforts, ";
      
      const toneAdjective = tone === "inspirational" 
        ? "inspiring" 
        : tone === "factual" 
          ? "measurable" 
          : tone === "urgent" 
            ? "critical" 
            : "remarkable";
      
      const focusPhrase = focus === "people" 
        ? "changing lives" 
        : focus === "environment" 
          ? "protecting our planet" 
          : focus === "education" 
            ? "expanding knowledge" 
            : focus === "health" 
              ? "improving wellbeing" 
              : "strengthening communities";
      
      const metrics = project.metrics.map(m => {
        const change = m.after - m.before;
        const percentChange = Math.round((change / m.before) * 100);
        return `${m.label} increased by ${change} ${m.unit} (${percentChange}%)`;
      }).join(", ");
      
      // Get current date for the report
      const reportDate = new Date();
      const formattedReportDate = reportDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const projectStartDate = new Date(project.date);
      const formattedProjectStart = projectStartDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });

      // Construct the generated story with current report date
      const story = `Evidence Summary - ${formattedReportDate}\n\n${storyIntro}we've made ${toneAdjective} progress in ${focusPhrase} through the ${project.name} project in ${project.location}.\n\n
Since ${formattedProjectStart} (${getTimeFrame(project.date)}), we've achieved significant impact: ${metrics}.\n\n
As of ${formattedReportDate}, ${getImpactStatement(project.metrics, focus).toLowerCase()}.\n\n
${getCallToAction(audience, tone)}
${customNotes ? `\n\nAdditional context: ${customNotes}` : ""}`;
      
      setGeneratedStory(story);
      setIsGenerating(false);
      
      // Add to saved stories
      const newStory: ImpactStoryData = {
        id: Date.now().toString(),
        title: `${project.name} Impact Story`,
        project: project.name,
        rawData: JSON.stringify(project.metrics),
        generatedStory: story,
        date: new Date().toISOString(),
        audience: audience as any,
        tone: tone as any,
        focus: focus as any
      };
      
      setStories(prev => [newStory, ...prev]);
      
      toast({
        title: "Story generated",
        description: "Your impact story has been created and saved",
      });
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "The story has been copied to your clipboard",
      });
    });
  };

  const downloadStory = (story: ImpactStoryData) => {
    const element = document.createElement("a");
    const file = new Blob([story.generatedStory], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    // Use the story's report date for the filename
    const storyDate = new Date(story.date).toISOString().split("T")[0];
    element.download = `${story.title.replace(/\s+/g, "-")}-Report-${storyDate}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({
      title: "Story downloaded",
      description: `Evidence summary from ${new Date(story.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} downloaded`,
    });
  };

  const getTimeFrame = (dateString: string) => {
    const projectDate = new Date(dateString);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - projectDate.getFullYear()) * 12 + 
      now.getMonth() - projectDate.getMonth();
    
    return monthsDiff <= 1 
      ? "one month" 
      : monthsDiff < 12 
        ? `${monthsDiff} months` 
        : `${Math.floor(monthsDiff / 12)} year${Math.floor(monthsDiff / 12) > 1 ? 's' : ''}`;
  };

  const getImpactStatement = (metrics: any[], focusArea: string) => {
    if (focusArea === "people") {
      return "These numbers represent real people whose lives have been transformed through this initiative";
    } else if (focusArea === "environment") {
      return "This progress demonstrates our commitment to sustainable environmental practices and conservation efforts";
    } else if (focusArea === "education") {
      return "These improvements in education access and quality are creating pathways to better futures";
    } else if (focusArea === "health") {
      return "The health benefits achieved are laying the foundation for stronger, more resilient communities";
    } else {
      return "These achievements strengthen community bonds and create lasting positive change";
    }
  };

  const getCallToAction = (audienceType: string, toneType: string) => {
    if (audienceType === "donors") {
      return toneType === "urgent" 
        ? "Your continued support is critical to sustaining this momentum. Please consider contributing today."
        : "With your continued partnership, we can expand these successes to more communities in need.";
    } else if (audienceType === "volunteers") {
      return "Your hands-on contributions make these statistics come alive. Join us for our upcoming volunteer opportunities!";
    } else if (audienceType === "partners") {
      return "Together with partners like you, we're creating scalable, sustainable solutions to community challenges.";
    } else {
      return "Join us in celebrating these achievements and help us continue this important work.";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant={activeTab === "generate" ? "default" : "outline"}
          onClick={() => setActiveTab("generate")}
          className="w-full sm:w-auto min-h-[44px]"
          data-testid="button-generate-new-story"
        >
          Generate New Story
        </Button>
        <Button
          variant={activeTab === "saved" ? "default" : "outline"}
          onClick={() => setActiveTab("saved")}
          className="w-full sm:w-auto min-h-[44px]"
          data-testid="button-saved-stories"
        >
          Saved Stories ({stories.length})
        </Button>
      </div>

      {activeTab === "generate" ? (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">AI Impact Storytelling</CardTitle>
            <CardDescription className="text-sm">
              Transform impact data into compelling narratives tailored to your audience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
            <div>
              <h3 className="text-base sm:text-lg font-medium mb-3">1. Select Project Data</h3>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projectImpacts.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedProjectData && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <h4 className="font-medium text-sm sm:text-base">{selectedProjectData.name}</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{selectedProjectData.description}</p>
                  <div className="mt-2">
                    <h5 className="text-xs sm:text-sm font-medium">Key Metrics:</h5>
                    <ul className="mt-1 space-y-1">
                      {selectedProjectData.metrics.map((metric, idx) => (
                        <li key={idx} className="text-xs sm:text-sm flex justify-between gap-2">
                          <span className="truncate">{metric.label}:</span>
                          <span className="font-medium whitespace-nowrap">
                            {metric.before} → {metric.after} {metric.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-base sm:text-lg font-medium mb-3">2. Customize Your Story</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Target Audience</label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Public</SelectItem>
                      <SelectItem value="donors">Donors</SelectItem>
                      <SelectItem value="volunteers">Volunteers</SelectItem>
                      <SelectItem value="partners">Partners</SelectItem>
                      <SelectItem value="community">Community Members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Tone</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inspirational">Inspirational</SelectItem>
                      <SelectItem value="factual">Factual</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="celebratory">Celebratory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Impact Focus</label>
                  <Select value={focus} onValueChange={setFocus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select focus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="people">People</SelectItem>
                      <SelectItem value="environment">Environment</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium">Additional Context or Notes (Optional)</label>
                <Textarea 
                  placeholder="Add any specific details or context you'd like included in the story..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="h-20 sm:h-24 text-sm"
                />
              </div>
            </div>
            
            <div className="pt-2">
              <Button 
                onClick={generateStory} 
                disabled={!selectedProject || isGenerating}
                className="w-full min-h-[44px]"
                data-testid="button-generate-impact-story"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Story...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Impact Story
                  </>
                )}
              </Button>
            </div>
            
            {generatedStory && (
              <div className="mt-6 border rounded-md p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Generated Story</h3>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(generatedStory)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {generatedStory.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stories.length > 0 ? (
            stories.map((story) => (
              <Card key={story.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{story.title}</CardTitle>
                      <CardDescription>
                        Report from {new Date(story.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} •
                        For {story.audience.charAt(0).toUpperCase() + story.audience.slice(1)} •
                        {story.tone.charAt(0).toUpperCase() + story.tone.slice(1)} tone
                      </CardDescription>
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => copyToClipboard(story.generatedStory)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {expandedStoryId === story.id ? (
                      // Full story view
                      story.generatedStory.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))
                    ) : (
                      // Preview view
                      <>
                        {story.generatedStory.split('\n').slice(0, 2).map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                        {story.generatedStory.split('\n').length > 2 && (
                          <p className="text-sm text-muted-foreground italic">...</p>
                        )}
                      </>
                    )}
                  </div>
                  
                  {story.generatedStory.split('\n').length > 2 && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedStoryId(expandedStoryId === story.id ? null : story.id)}
                        className="flex-1 min-h-[40px]"
                        data-testid={`button-view-story-${story.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {expandedStoryId === story.id ? "Collapse Story" : "View Full Story"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadStory(story)}
                        className="flex-1 min-h-[40px]"
                        data-testid={`button-download-story-${story.id}`}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download Report
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No saved stories yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate your first impact story to see it here
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab("generate")}
                >
                  Create New Story
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
