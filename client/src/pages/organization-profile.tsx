import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { uploadProfilePhoto } from "@/lib/upload";
import { Loader2, Plus, X, Building2, MapPin, Target, Camera, Globe, Mail } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// SDG options (1-17)
const SDG_OPTIONS = [
  { value: 1, label: "1. No Poverty" },
  { value: 2, label: "2. Zero Hunger" },
  { value: 3, label: "3. Good Health and Well-being" },
  { value: 4, label: "4. Quality Education" },
  { value: 5, label: "5. Gender Equality" },
  { value: 6, label: "6. Clean Water and Sanitation" },
  { value: 7, label: "7. Affordable and Clean Energy" },
  { value: 8, label: "8. Decent Work and Economic Growth" },
  { value: 9, label: "9. Industry, Innovation and Infrastructure" },
  { value: 10, label: "10. Reduced Inequalities" },
  { value: 11, label: "11. Sustainable Cities and Communities" },
  { value: 12, label: "12. Responsible Consumption and Production" },
  { value: 13, label: "13. Climate Action" },
  { value: 14, label: "14. Life Below Water" },
  { value: 15, label: "15. Life on Land" },
  { value: 16, label: "16. Peace, Justice and Strong Institutions" },
  { value: 17, label: "17. Partnerships for the Goals" },
];

// Form schema
const formSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  name: z.string().min(1, "Organization name is required"),
  bio: z.string().optional(),
  mission: z.string().min(1, "Mission statement is required"),
  profilePhotoUrl: z.string().optional(),
  website: z.string().optional(),
  contactEmail: z.string().email("Valid email is required").optional(),
  needs: z.array(z.string()).min(1, "At least one need is required"),
  sdgFocus: z.array(z.number()).min(1, "At least one SDG focus is required"),
  location: z.string().min(1, "Location is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function OrganizationProfile() {
  const { toast } = useToast();
  const [needInput, setNeedInput] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch current profile data
  const { data: profileData, isLoading: loadingProfile } = useQuery({
    queryKey: ["/api/profile/organization"],
  });

  const user = profileData?.user;
  const organization = profileData?.organization;
  const matchableOrganization = profileData?.matchableOrganization;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      name: "",
      bio: "",
      mission: "",
      profilePhotoUrl: "",
      website: "",
      contactEmail: "",
      needs: [],
      sdgFocus: [],
      location: "",
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (user) {
      form.setValue("displayName", user.displayName || "");
      form.setValue("bio", user.bio || "");
      form.setValue("profilePhotoUrl", user.avatar || "");
      setPhotoPreview(user.avatar || "");
    }
    
    if (organization) {
      form.setValue("name", organization.name || "");
      form.setValue("website", organization.website || "");
      form.setValue("contactEmail", organization.contactEmail || "");
    }
    
    if (matchableOrganization) {
      form.setValue("mission", matchableOrganization.mission || "");
      form.setValue("needs", matchableOrganization.needs || []);
      form.setValue("sdgFocus", matchableOrganization.sdgFocus || []);
      form.setValue("location", matchableOrganization.location || "");
    }
  }, [user, organization, matchableOrganization, form]);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setPhotoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const userId = user?.email || `user_${user?.id}`;
      return uploadProfilePhoto(file, userId, 'organization');
    },
    onSuccess: (result) => {
      form.setValue("profilePhotoUrl", result.url);
      toast({
        title: "Photo uploaded",
        description: "Your organization logo has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Upload photo if there's a new file
      let photoUrl = data.profilePhotoUrl;
      if (photoFile) {
        setUploadingPhoto(true);
        try {
          const result = await uploadPhotoMutation.mutateAsync(photoFile);
          photoUrl = result.url;
        } catch (error) {
          setUploadingPhoto(false);
          throw new Error(`Photo upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        setUploadingPhoto(false);
      }

      const response = await apiRequest("PATCH", "/api/profile/organization", {
        ...data,
        profilePhotoUrl: photoUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/organization"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      setPhotoFile(null);
      toast({
        title: "Profile updated!",
        description: "Your organization profile has been saved successfully. This data helps improve volunteer matching.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate(data);
  };

  const addNeed = () => {
    if (needInput.trim()) {
      const currentNeeds = form.getValues("needs");
      if (!currentNeeds.includes(needInput.trim())) {
        form.setValue("needs", [...currentNeeds, needInput.trim()]);
        setNeedInput("");
      }
    }
  };

  const removeNeed = (need: string) => {
    const currentNeeds = form.getValues("needs");
    form.setValue("needs", currentNeeds.filter(n => n !== need));
  };

  const toggleSDG = (sdgValue: number) => {
    const currentSDGs = form.getValues("sdgFocus");
    if (currentSDGs.includes(sdgValue)) {
      form.setValue("sdgFocus", currentSDGs.filter(s => s !== sdgValue));
    } else {
      form.setValue("sdgFocus", [...currentSDGs, sdgValue]);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Organization Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization profile. This data helps the matching algorithm connect you with qualified volunteers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Profile
          </CardTitle>
          <CardDescription>
            Update your organization information to improve volunteer matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Profile Photo / Logo */}
              <div className="space-y-4">
                <Label>Organization Logo</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={photoPreview} alt={organization?.name || "Organization"} />
                    <AvatarFallback>
                      <Building2 className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-organization-logo"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto || updateMutation.isPending}
                      data-testid="button-upload-logo"
                    >
                      {uploadingPhoto ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          {photoPreview ? "Change Logo" : "Upload Logo"}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Max 5MB • JPG, PNG, or GIF
                    </p>
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter display name"
                        {...field}
                        data-testid="input-display-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Organization Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter organization name"
                        {...field}
                        data-testid="input-organization-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bio */}
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of your organization..."
                        className="min-h-[80px]"
                        {...field}
                        data-testid="input-bio"
                      />
                    </FormControl>
                    <FormDescription>
                      A short summary about your organization
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mission */}
              <FormField
                control={form.control}
                name="mission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mission Statement</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Your organization's mission and purpose..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="input-mission"
                      />
                    </FormControl>
                    <FormDescription>
                      Describe your organization's goals and impact
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Website */}
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://your-organization.org"
                        {...field}
                        data-testid="input-website"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Email */}
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Contact Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@your-organization.org"
                        {...field}
                        data-testid="input-contact-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., New York, USA"
                        {...field}
                        data-testid="input-location"
                      />
                    </FormControl>
                    <FormDescription>
                      Your location helps match you with local volunteers (weighted at 25%)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Needs */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Volunteer Needs
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a need (e.g., Medical professionals, Educators, Developers)"
                    value={needInput}
                    onChange={(e) => setNeedInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addNeed();
                      }
                    }}
                    data-testid="input-add-need"
                  />
                  <Button
                    type="button"
                    onClick={addNeed}
                    variant="secondary"
                    data-testid="button-add-need"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.watch("needs").map((need) => (
                    <Badge key={need} variant="secondary" className="gap-1" data-testid={`badge-need-${need}`}>
                      {need}
                      <button
                        type="button"
                        onClick={() => removeNeed(need)}
                        className="ml-1 hover:bg-secondary-foreground/10 rounded-full"
                        data-testid={`button-remove-need-${need}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {form.formState.errors.needs && (
                  <p className="text-sm text-destructive">{form.formState.errors.needs.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  These skills/roles are matched with volunteers (weighted at 35%)
                </p>
              </div>

              {/* SDG Focus */}
              <div className="space-y-2">
                <Label>SDG Focus Areas</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Select the UN SDGs your organization addresses (weighted at 20%)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {SDG_OPTIONS.map((sdg) => (
                    <Button
                      key={sdg.value}
                      type="button"
                      variant={form.watch("sdgFocus").includes(sdg.value) ? "default" : "outline"}
                      className="justify-start text-left h-auto py-2"
                      onClick={() => toggleSDG(sdg.value)}
                      data-testid={`button-sdg-${sdg.value}`}
                    >
                      {sdg.label}
                    </Button>
                  ))}
                </div>
                {form.formState.errors.sdgFocus && (
                  <p className="text-sm text-destructive">{form.formState.errors.sdgFocus.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || uploadingPhoto}
                  data-testid="button-save-profile"
                >
                  {(updateMutation.isPending || uploadingPhoto) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Profile
                </Button>
                <p className="text-sm text-muted-foreground flex items-center">
                  Changes are saved to the database and used for volunteer matching
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
