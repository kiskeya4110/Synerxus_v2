import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Heart, Eye, Search, MapPin, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { SDG_GOALS } from "@shared/sdg-goals";
import type { User as UserType } from "@shared/schema";

interface StoryWithDetails {
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
  volunteerName: string;
  volunteerAvatar: string | null;
  projectName: string | null;
}

export default function Stories() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/me", storedUserId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    },
  });

  const { data: stories = [], isLoading } = useQuery<StoryWithDetails[]>({
    queryKey: ["/api/stories"],
  });

  const filteredStories = stories.filter((story) =>
    story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.volunteerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featuredStories = filteredStories.filter((s) => s.isFeatured);
  const regularStories = filteredStories.filter((s) => !s.isFeatured);

  const StoryCard = ({ story }: { story: StoryWithDetails }) => (
    <Link href={`/stories/${story.id}`}>
      <Card 
        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        data-testid={`card-story-${story.id}`}
      >
        {story.photos && story.photos.length > 0 && (
          <div className="h-48 overflow-hidden">
            <img
              src={story.photos[0]}
              alt={story.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 flex items-center justify-center text-white text-xs font-bold">
              {story.volunteerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {story.volunteerName}
              </p>
              <p className="text-xs text-slate-500">
                {format(new Date(story.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          <h3 className="font-semibold text-lg text-slate-900 dark:text-white line-clamp-2">
            {story.title}
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
            {story.content}
          </p>

          {story.impactHighlight && (
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
              {story.impactHighlight}
            </Badge>
          )}

          {story.sdgGoals && story.sdgGoals.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {story.sdgGoals.slice(0, 4).map((sdgNum) => {
                const sdg = SDG_GOALS[sdgNum];
                return (
                  <div
                    key={sdgNum}
                    className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold"
                    style={{ backgroundColor: sdg?.color || "#888" }}
                    title={sdg?.name}
                  >
                    {sdgNum}
                  </div>
                );
              })}
              {story.sdgGoals.length > 4 && (
                <span className="text-xs text-slate-500">
                  +{story.sdgGoals.length - 4} more
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {story.likesCount || 0}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {story.viewsCount || 0}
              </span>
            </div>
            {story.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {story.location}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/volunteer-dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Volunteer Stories
            </h1>
          </div>
          <Button
            onClick={() => setLocation("/create-story")}
            className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
            data-testid="button-create-story"
          >
            <Plus className="h-4 w-4 mr-2" />
            Share Story
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-stories"
          />
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No stories yet
            </h3>
            <p className="text-slate-500 mb-6">
              Be the first to share your volunteer experience!
            </p>
            <Button
              onClick={() => setLocation("/create-story")}
              className="bg-gradient-to-r from-emerald-500 to-blue-500"
              data-testid="button-create-first-story"
            >
              <Plus className="h-4 w-4 mr-2" />
              Share Your Story
            </Button>
          </div>
        ) : (
          <>
            {featuredStories.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="text-yellow-500">★</span> Featured Stories
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredStories.map((story) => (
                    <StoryCard key={story.id} story={story} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Recent Stories
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularStories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
