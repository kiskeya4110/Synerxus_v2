import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { uploadProfilePhoto } from "@/lib/upload";
import { Loader2, Plus, X, User, MapPin, Target, Heart, Camera, Upload, Lock, Shield, Trash2 } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, setPersistence, browserLocalPersistence, browserSessionPersistence, deleteUser as firebaseDeleteUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useLocation } from "wouter";

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
  bio: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  interests: z.array(z.string()).min(1, "At least one interest is required"),
  location: z.string().min(1, "Location is required"),
  sdgGoals: z.array(z.number()).min(1, "At least one SDG goal is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function VolunteerProfile() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [skillInput, setSkillInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
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
    queryKey: ["/api/profile/volunteer", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/profile/volunteer?userId=${id}` : '/api/profile/volunteer';
      const response = await fetch(url);
      return response.json();
    },
    enabled: !!userId
  });

  const user = profileData?.user;
  const volunteerProfile = profileData?.volunteerProfile;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      profilePhotoUrl: "",
      skills: [],
      interests: [],
      location: "",
      sdgGoals: [],
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (user) {
      form.setValue("displayName", user.displayName || "");
      form.setValue("bio", user.bio || "");
      form.setValue("profilePhotoUrl", user.avatar || "");
      setPhotoPreview(user.avatar || "");
      
      if (volunteerProfile) {
        form.setValue("skills", volunteerProfile.skills || []);
        form.setValue("interests", volunteerProfile.interests || []);
        form.setValue("location", volunteerProfile.location || "");
        form.setValue("sdgGoals", volunteerProfile.sdgGoals || []);
      } else {
        // Initialize with user's skills if no volunteer profile exists
        if (user.skills && user.skills.length > 0) {
          form.setValue("skills", user.skills);
        }
      }
    }
  }, [user, volunteerProfile, form]);

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
      return uploadProfilePhoto(file, userId, 'volunteer');
    },
    onSuccess: (result) => {
      form.setValue("profilePhotoUrl", result.url);
      toast({
        title: "Photo uploaded",
        description: "Your profile photo has been uploaded successfully.",
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
      const url = id ? `/api/profile/volunteer?userId=${id}` : '/api/profile/volunteer';
      const response = await apiRequest("PATCH", url, {
        ...data,
        profilePhotoUrl: photoUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all relevant queries to sync data across Settings and Profile
      const id = localStorage.getItem('currentUserId');
      queryClient.invalidateQueries({ queryKey: ["/api/profile/volunteer", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/volunteer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      setPhotoFile(null);
      toast({
        title: "Profile updated!",
        description: "Your volunteer profile has been saved successfully. This data helps improve your match recommendations and feeds into SDG analytics.",
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

  const addSkill = () => {
    if (skillInput.trim()) {
      const currentSkills = form.getValues("skills");
      if (!currentSkills.includes(skillInput.trim())) {
        form.setValue("skills", [...currentSkills, skillInput.trim()]);
        setSkillInput("");
      }
    }
  };

  const removeSkill = (skill: string) => {
    const currentSkills = form.getValues("skills");
    form.setValue("skills", currentSkills.filter(s => s !== skill));
  };

  const addInterest = () => {
    if (interestInput.trim()) {
      const currentInterests = form.getValues("interests");
      if (!currentInterests.includes(interestInput.trim())) {
        form.setValue("interests", [...currentInterests, interestInput.trim()]);
        setInterestInput("");
      }
    }
  };

  const removeInterest = (interest: string) => {
    const currentInterests = form.getValues("interests");
    form.setValue("interests", currentInterests.filter(i => i !== interest));
  };

  const toggleSDG = (sdgValue: number) => {
    const currentSDGs = form.getValues("sdgGoals");
    if (currentSDGs.includes(sdgValue)) {
      form.setValue("sdgGoals", currentSDGs.filter(s => s !== sdgValue));
    } else {
      form.setValue("sdgGoals", [...currentSDGs, sdgValue]);
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
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Error changing password",
        description: error.message || "Please check your current password and try again.",
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
        description: "Your account has been permanently deleted.",
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Volunteer Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile information. This data helps the matching algorithm connect you with relevant organizations and opportunities.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Profile
          </CardTitle>
          <CardDescription>
            Update your profile information to improve match recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Profile Photo */}
              <div className="space-y-4">
                <Label>Profile Photo</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={photoPreview} alt={user?.displayName || "Profile"} />
                    <AvatarFallback>
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-profile-photo"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto || updateMutation.isPending}
                      data-testid="button-upload-photo"
                    >
                      {uploadingPhoto ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" />
                          {photoPreview ? "Change Photo" : "Upload Photo"}
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
                        placeholder="Enter your display name"
                        {...field}
                        data-testid="input-display-name"
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
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about yourself and your volunteer experience..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="input-bio"
                      />
                    </FormControl>
                    <FormDescription>
                      Share your background, experience, and what motivates you to volunteer
                    </FormDescription>
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
                      Your location helps match you with local or remote opportunities
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Skills */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Skills
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill (e.g., Python, Teaching, Marketing)"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    data-testid="input-add-skill"
                  />
                  <Button
                    type="button"
                    onClick={addSkill}
                    variant="secondary"
                    data-testid="button-add-skill"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.watch("skills").map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1" data-testid={`badge-skill-${skill}`}>
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 hover:bg-secondary-foreground/10 rounded-full"
                        data-testid={`button-remove-skill-${skill}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {form.formState.errors.skills && (
                  <p className="text-sm text-destructive">{form.formState.errors.skills.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Skills are weighted at 35% in the matching algorithm
                </p>
              </div>

              {/* Interests */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Interests & Causes
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an interest (e.g., Education, Healthcare, Environment)"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addInterest();
                      }
                    }}
                    data-testid="input-add-interest"
                  />
                  <Button
                    type="button"
                    onClick={addInterest}
                    variant="secondary"
                    data-testid="button-add-interest"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.watch("interests").map((interest) => (
                    <Badge key={interest} variant="secondary" className="gap-1" data-testid={`badge-interest-${interest}`}>
                      {interest}
                      <button
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="ml-1 hover:bg-secondary-foreground/10 rounded-full"
                        data-testid={`button-remove-interest-${interest}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {form.formState.errors.interests && (
                  <p className="text-sm text-destructive">{form.formState.errors.interests.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Interests are weighted at 20% in the matching algorithm
                </p>
              </div>

              {/* SDG Goals */}
              <div className="space-y-2">
                <Label>Sustainable Development Goals (SDGs)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Select the UN SDGs you're passionate about (weighted at 20% in matching)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {SDG_OPTIONS.map((sdg) => (
                    <Button
                      key={sdg.value}
                      type="button"
                      variant={form.watch("sdgGoals").includes(sdg.value) ? "default" : "outline"}
                      className="justify-start text-left h-auto py-2"
                      onClick={() => toggleSDG(sdg.value)}
                      data-testid={`button-sdg-${sdg.value}`}
                    >
                      {sdg.label}
                    </Button>
                  ))}
                </div>
                {form.formState.errors.sdgGoals && (
                  <p className="text-sm text-destructive">{form.formState.errors.sdgGoals.message}</p>
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
                  Changes are saved to the database and used for algorithm matching
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
            Permanently delete your account and all associated data
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
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers, including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Profile information and photos</li>
                    <li>Volunteer activities and hours</li>
                    <li>Project assignments and tasks</li>
                    <li>Application history</li>
                    <li>All personal data</li>
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
                  Delete My Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-xs text-muted-foreground mt-2">
            This action is irreversible and will delete all your volunteer data permanently.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
