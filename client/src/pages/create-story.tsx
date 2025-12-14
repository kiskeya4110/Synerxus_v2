import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Image, X, Send, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { SDG_GOALS } from "@shared/sdg-goals";
import type { User, Project } from "@shared/schema";

export default function CreateStory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedSdgs, setSelectedSdgs] = useState<number[]>([]);
  const [location, setLocationValue] = useState("");
  const [impactHighlight, setImpactHighlight] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me", storedUserId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    },
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createStoryMutation = useMutation({
    mutationFn: async (storyData: any) => {
      const response = await fetch("/api/stories", {
        method: "POST",
        body: JSON.stringify(storyData),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to create story");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      toast({
        title: "Story created!",
        description: "Your story has been shared successfully.",
      });
      setLocation("/stories");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create story. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setPendingPhotos((prev) => [...prev, ...newFiles]);
    
    newFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPhotoPreviewUrls((prev) => [...prev, url]);
    });
  };

  const removePhoto = (index: number) => {
    setPhotoPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotosToStory = async (storyId: number): Promise<string[]> => {
    if (pendingPhotos.length === 0) return [];
    
    const formData = new FormData();
    pendingPhotos.forEach((file) => {
      formData.append("photos", file);
    });

    const response = await fetch(`/api/stories/${storyId}/photos`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Photo upload failed");
    const data = await response.json();
    return data.photos || [];
  };

  const toggleSdg = (sdgNumber: number) => {
    setSelectedSdgs((prev) =>
      prev.includes(sdgNumber)
        ? prev.filter((s) => s !== sdgNumber)
        : [...prev, sdgNumber]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing fields",
        description: "Please provide a title and story content.",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser?.id) {
      toast({
        title: "Error",
        description: "Please log in to share your story.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const selectedProject = projects.find(
        (p) => p.id === parseInt(selectedProjectId)
      );

      const response = await fetch("/api/stories", {
        method: "POST",
        body: JSON.stringify({
          volunteerId: currentUser.id,
          title,
          content,
          photos: [],
          projectId: selectedProjectId ? parseInt(selectedProjectId) : null,
          organizationId: selectedProject?.organizationId || null,
          sdgGoals: selectedSdgs,
          location: location || null,
          impactHighlight: impactHighlight || null,
          isPublished,
          isFeatured: false,
          likesCount: 0,
          viewsCount: 0,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to create story");
      const story = await response.json();

      if (pendingPhotos.length > 0) {
        await uploadPhotosToStory(story.id);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      toast({
        title: "Story created!",
        description: "Your story has been shared successfully.",
      });
      setLocation("/stories");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/stories")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Share Your Story
          </h1>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Tell your volunteer experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Give your story a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-story-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Your Story</Label>
              <Textarea
                id="content"
                placeholder="Share your experience, what you learned, and the impact you made..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px]"
                data-testid="input-story-content"
              />
            </div>

            <div className="space-y-2">
              <Label>Photos</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {photoPreviewUrls.map((photo, index) => (
                  <div key={index} className="relative w-20 h-20">
                    <img
                      src={photo}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      data-testid={`button-remove-photo-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid="button-upload-photos"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Image className="h-4 w-4 mr-2" />
                )}
                {isUploading ? "Uploading..." : "Add Photos"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Related Project (Optional)</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger data-testid="select-project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>SDG Goals (Optional)</Label>
              <div className="flex flex-wrap gap-2">
                {Object.values(SDG_GOALS).slice(0, 17).map((sdg) => (
                  <button
                    key={sdg.id}
                    onClick={() => toggleSdg(sdg.id)}
                    className={`w-10 h-10 rounded-full text-white text-xs font-bold transition-all ${
                      selectedSdgs.includes(sdg.id)
                        ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: sdg.color }}
                    title={sdg.name}
                    data-testid={`button-sdg-${sdg.id}`}
                  >
                    {sdg.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                placeholder="Where did this happen?"
                value={location}
                onChange={(e) => setLocationValue(e.target.value)}
                data-testid="input-location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="impact">Impact Highlight (Optional)</Label>
              <Input
                id="impact"
                placeholder="e.g., Helped 50 families access clean water"
                value={impactHighlight}
                onChange={(e) => setImpactHighlight(e.target.value)}
                data-testid="input-impact-highlight"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="publish" className="cursor-pointer">
                Publish immediately
              </Label>
              <Switch
                id="publish"
                checked={isPublished}
                onCheckedChange={setIsPublished}
                data-testid="switch-publish"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={createStoryMutation.isPending}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
              data-testid="button-submit-story"
            >
              {createStoryMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Share Story
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
