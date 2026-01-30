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
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { uploadProfilePhoto } from "@/lib/upload";
import { Loader2, Plus, X, Building2, MapPin, Target, Camera, Globe, Mail, Lock, Shield, Trash2 } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, setPersistence, browserLocalPersistence, browserSessionPersistence, deleteUser as firebaseDeleteUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import OrganizationHeader from "@/components/layout/organization-header";
import OrganizationPWAHeader from "@/components/layout/organization-pwa-header";
import OrganizationPWANav from "@/components/layout/organization-pwa-nav";

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
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [needInput, setNeedInput] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Security settings state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  
  // Fetch current profile data
  const userId = localStorage.getItem('currentUserId');
  const { data: profileData, isLoading: loadingProfile } = useQuery({
    queryKey: ["/api/profile/organization", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/profile/organization?userId=${id}` : '/api/profile/organization';
      const response = await fetch(url);
      return response.json();
    },
    enabled: !!userId
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

      const id = localStorage.getItem('currentUserId');

      if (!id) {
        throw new Error('User ID not found in localStorage. Please log in again.');
      }

      const url = `/api/profile/organization?userId=${id}`;

      const response = await apiRequest("PATCH", url, {
        ...data,
        profilePhotoUrl: photoUrl,
      });
      return response.json();
    },
    onSuccess: async () => {
      // Refetch all relevant queries to sync data across Settings, Profile, and Dashboard
      const id = localStorage.getItem('currentUserId');
      
      // Use refetchQueries to force immediate refetch instead of just invalidating
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/profile/organization", id] }),
        queryClient.refetchQueries({ queryKey: ["/api/profile/organization"] }),
        queryClient.refetchQueries({ queryKey: ["/api/users/me"] }),
        queryClient.refetchQueries({ queryKey: ["/api/users/me", id] }),
        queryClient.refetchQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            if (typeof key === 'string') {
              return key.startsWith("/api/volunteers") || key.startsWith("/api/matchable-organizations");
            }
            return false;
          }
        }),
        queryClient.refetchQueries({ queryKey: ["/api/dashboard/summary"] }),
        queryClient.refetchQueries({ queryKey: ["/api/dashboard/summary", id] }),
      ]);
      
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

  // Password change handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        title: "Missing information",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    setChangingPassword(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("No user is currently logged in");
      }
      
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      
      // Clear fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: unknown) {
      console.error("Error changing password:", error);
      toast({
        title: "Error changing password",
        description: error instanceof Error ? error.message : "Please check your current password and try again.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // Keep logged in toggle handler
  const handleKeepLoggedInToggle = async (checked: boolean) => {
    setKeepLoggedIn(checked);
    try {
      await setPersistence(
        auth,
        checked ? browserLocalPersistence : browserSessionPersistence
      );
      toast({
        title: "Session settings updated",
        description: checked 
          ? "You will stay logged in on this device" 
          : "You will be logged out when you close the browser",
      });
    } catch (error: any) {
      console.error("Error updating session persistence:", error);
      toast({
        title: "Error",
        description: "Failed to update session settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (!deleteConfirmPassword) {
      toast({
        title: "Password required",
        description: "Please enter your password to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }
    
    setDeletingAccount(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("No user is currently logged in");
      }
      
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, deleteConfirmPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Delete from backend database first
      const response = await apiRequest("DELETE", "/api/users/me", {});
      await response.json();
      
      // Delete Firebase user
      await firebaseDeleteUser(user);
      
      toast({
        title: "Account deleted",
        description: "Your organization account has been permanently deleted.",
      });
      
      // Redirect to home page
      setLocation("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error deleting account",
        description: error.message || "Please check your password and try again.",
        variant: "destructive",
      });
      setDeletingAccount(false);
    }
  };

  if (loadingProfile) {
    if (isMobile) {
      return (
        <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full bg-stone-100 text-stone-900 flex flex-col overflow-hidden">
          <div className="relative w-full h-full max-w-[428px] mx-auto flex flex-col overflow-hidden">
            <OrganizationPWAHeader />
            <div className="flex-shrink-0" style={{ height: 'calc(env(safe-area-inset-top, 0px) + 64px)' }} />
            <main className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </main>
            <OrganizationPWANav activeTab="home" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mobile PWA view
  if (isMobile) {
    return (
      <div className="fixed inset-0 h-screen h-[100dvh] w-screen max-w-full bg-stone-100 text-stone-900 flex flex-col overflow-hidden">
        <div className="relative w-full h-full max-w-[428px] mx-auto flex flex-col overflow-hidden">
          <OrganizationPWAHeader />
          <div className="flex-shrink-0" style={{ height: 'calc(env(safe-area-inset-top, 0px) + 64px)' }} />
          <main className="flex-1 overflow-y-auto px-4 py-4" style={{ paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}>
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2 text-stone-900">Organization Profile</h1>
              <p className="text-stone-600 text-sm">
                Manage your organization profile and settings.
              </p>
            </div>

            <Card className="bg-white text-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
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
                        <Avatar className="h-20 w-20 border-2 border-border">
                          <AvatarImage src={photoPreview || user?.avatar || matchableOrganization?.profilePhotoUrl} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xl">
                            {form.watch("name")?.[0] || "O"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileSelect}
                          />
                          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            <Camera className="h-4 w-4 mr-2" />
                            Change Logo
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Organization Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your organization name" {...field} />
                          </FormControl>
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
                            <Textarea placeholder="Describe your organization's mission..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                      {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </main>
          <OrganizationPWANav activeTab="home" />
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <OrganizationHeader activeTab="settings" />
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-slate-900">Organization Profile Settings</h1>
          <p className="text-slate-600">
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

      {/* Security Settings - Change Password */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={changingPassword}
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                disabled={changingPassword}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={changingPassword}
                data-testid="input-confirm-new-password"
              />
            </div>
            <Button type="submit" disabled={changingPassword} data-testid="button-change-password">
              {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Session Settings
          </CardTitle>
          <CardDescription>
            Manage how your login session is handled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="keep-logged-in" className="text-base">Keep me logged in</Label>
              <p className="text-sm text-muted-foreground">
                Stay logged in on this device even after closing the browser
              </p>
            </div>
            <Switch
              id="keep-logged-in"
              checked={keepLoggedIn}
              onCheckedChange={handleKeepLoggedInToggle}
              data-testid="switch-keep-logged-in"
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone - Delete Account */}
      <Card className="mt-6 border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete your organization account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-delete-account-trigger">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    This action cannot be undone. This will permanently delete your organization account and remove all data from our servers, including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Organization profile and logo</li>
                    <li>All projects and tasks</li>
                    <li>Volunteer assignments</li>
                    <li>Impact data and metrics</li>
                    <li>Posted opportunities</li>
                    <li>All organizational data</li>
                  </ul>
                  <div className="pt-4">
                    <Label htmlFor="delete-password" className="text-destructive font-semibold">
                      Enter your password to confirm:
                    </Label>
                    <Input
                      id="delete-password"
                      type="password"
                      value={deleteConfirmPassword}
                      onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="mt-2"
                      data-testid="input-delete-confirm-password"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel 
                  onClick={() => setDeleteConfirmPassword("")}
                  data-testid="button-cancel-delete"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  {deletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete Organization Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-xs text-muted-foreground mt-2">
            This action is irreversible and will delete all organization and project data permanently.
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
