import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Heart, Eye, MapPin, Calendar, Share2, Building, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { SDG_GOALS } from "@shared/sdg-goals";
import type { User } from "@shared/schema";

interface StoryDetail {
  id: number;
  volunteerId: number;
  title: string;
  content: string;
  photos: string[];
  projectId: number | null;
  organizationId: number | null;
  sdgGoals: number[];
  location: string | null;
  impactHighlight: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  likesCount: number;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  volunteerName: string;
  volunteerAvatar: string | null;
  projectName: string | null;
  organizationName: string | null;
}

export default function StoryDetail() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPhoto, setSelectedPhoto] = useState<number>(0);

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

  const { data: story, isLoading, error } = useQuery<StoryDetail>({
    queryKey: ["/api/stories", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/stories/${params.id}`);
      if (!response.ok) throw new Error("Story not found");
      return response.json();
    },
    enabled: !!params.id,
  });

  const { data: likeStatus } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/stories", params.id, "liked", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return { liked: false };
      const response = await fetch(`/api/stories/${params.id}/liked?userId=${currentUser.id}`);
      return response.json();
    },
    enabled: !!params.id && !!currentUser?.id,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const method = likeStatus?.liked ? "DELETE" : "POST";
      const response = await fetch(`/api/stories/${params.id}/like`, {
        method,
        body: JSON.stringify({ userId: currentUser?.id }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to update like");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stories", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stories", params.id, "liked"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not update like status",
        variant: "destructive",
      });
    },
  });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: story?.title,
          text: story?.content?.substring(0, 100) + "...",
          url: window.location.href,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Story link has been copied to clipboard.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
            Story not found
          </h2>
          <Button onClick={() => setLocation("/stories")} data-testid="button-back-to-stories">
            Back to Stories
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/stories")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-slate-500">Back to Stories</span>
        </div>

        {story.photos && story.photos.length > 0 && (
          <div className="mb-6">
            <div className="rounded-xl overflow-hidden shadow-lg">
              <img
                src={story.photos[selectedPhoto]}
                alt={story.title}
                className="w-full max-h-96 object-cover"
              />
            </div>
            {story.photos.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {story.photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPhoto(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedPhoto === index
                        ? "border-emerald-500 ring-2 ring-emerald-200"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                    data-testid={`button-photo-${index}`}
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <Card className="shadow-lg">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 flex items-center justify-center text-white text-lg font-bold">
                {story.volunteerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {story.volunteerName}
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(story.createdAt), "MMMM d, yyyy")}
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {story.title}
            </h1>

            {story.impactHighlight && (
              <Badge
                variant="secondary"
                className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 text-sm"
              >
                ✨ {story.impactHighlight}
              </Badge>
            )}

            <div className="prose dark:prose-invert max-w-none">
              {story.content.split("\n").map((paragraph, index) => (
                <p key={index} className="text-slate-700 dark:text-slate-300">
                  {paragraph}
                </p>
              ))}
            </div>

            {(story.projectName || story.organizationName) && (
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                {story.projectName && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    📋 {story.projectName}
                  </Badge>
                )}
                {story.organizationName && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {story.organizationName}
                  </Badge>
                )}
              </div>
            )}

            {story.sdgGoals && story.sdgGoals.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-slate-500 mb-3">SDG Contributions</p>
                <div className="flex flex-wrap gap-2">
                  {story.sdgGoals.map((sdgNum) => {
                    const sdg = SDG_GOALS[sdgNum];
                    return (
                      <div
                        key={sdgNum}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm"
                        style={{ backgroundColor: sdg?.color || "#888" }}
                      >
                        <span className="font-bold">{sdgNum}</span>
                        <span>{sdg?.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-4">
                <Button
                  variant={likeStatus?.liked ? "default" : "outline"}
                  size="sm"
                  onClick={() => likeMutation.mutate()}
                  disabled={likeMutation.isPending || !currentUser}
                  className={likeStatus?.liked ? "bg-red-500 hover:bg-red-600" : ""}
                  data-testid="button-like"
                >
                  {likeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Heart
                      className={`h-4 w-4 mr-1 ${likeStatus?.liked ? "fill-white" : ""}`}
                    />
                  )}
                  {story.likesCount || 0}
                </Button>
                <span className="flex items-center gap-1 text-sm text-slate-500">
                  <Eye className="h-4 w-4" />
                  {story.viewsCount || 0} views
                </span>
              </div>
              <div className="flex items-center gap-3">
                {story.location && (
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {story.location}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  data-testid="button-share"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
