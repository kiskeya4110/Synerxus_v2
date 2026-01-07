import { useState, useEffect } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { UserCredential, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiKey, FiHeart, FiGlobe, FiBriefcase, FiShield, FiCheck, FiX } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Logo from "@/components/ui/logo";

export default function Login() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { signInWithGoogle, signInWithEmail, signUp } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [privacyConsentAccepted, setPrivacyConsentAccepted] = useState(false);

  // Get initial values from URL parameters
  const urlParams = new URLSearchParams(searchString);
  const tabFromUrl = urlParams.get('tab') === 'register' ? 'register' : 'login';
  const codeFromUrl = urlParams.get('code') || '';
  const typeFromUrl = urlParams.get('type') as "volunteer" | "organization" | "corporate-partner" | null;

  // Initialize userType from URL if valid
  const [userType, setUserType] = useState<"volunteer" | "organization" | "corporate-partner" | null>(
    typeFromUrl && ['volunteer', 'organization', 'corporate-partner'].includes(typeFromUrl) ? typeFromUrl : null
  );

  // If code is in URL, default to register tab
  const [activeTab, setActiveTab] = useState(codeFromUrl ? 'register' : tabFromUrl);

  // Update state when URL changes (code, tab, type)
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const code = params.get('code');
    const tab = params.get('tab') === 'register' ? 'register' : 'login';
    const type = params.get('type') as "volunteer" | "organization" | "corporate-partner" | null;

    // If code is provided, switch to register tab and pre-fill code
    if (code) {
      setActiveTab('register');
      setInvitationCode(code);
    } else {
      setActiveTab(tab);
    }

    // Pre-select user type if provided
    if (type && ['volunteer', 'organization', 'corporate-partner'].includes(type)) {
      setUserType(type);
    }
  }, [searchString]);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberMe') === 'true');
  
  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [invitationCode, setInvitationCode] = useState(codeFromUrl);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check if platform is in invite-only mode
  const { data: inviteSettings } = useQuery<{ inviteOnlyMode: boolean } | null>({
    queryKey: ["/api/invitation-codes/settings"],
    queryFn: async () => {
      const response = await fetch("/api/invitation-codes/settings");
      if (!response.ok) return null;
      return response.json();
    },
  });

  const isInviteOnly = inviteSettings?.inviteOnlyMode ?? false;
  
  // Helper function to determine where to redirect after login
  const getRedirectPath = async (userId: number, userType: string) => {
    try {
      // Fetch user's profile completion status
      const profileResponse = await fetch(`/api/profile/${userType}?userId=${userId}`);
      
      if (!profileResponse.ok) {
        console.error('Failed to fetch profile status');
        return '/dashboard'; // Default to dashboard if request fails
      }
      
      const profileData = await profileResponse.json();
      
      // Check if profile is complete
      const isProfileComplete = profileData?.user?.profileComplete || false;
      
      if (!isProfileComplete) {
        // Redirect to intake form if profile not complete
        return userType === 'volunteer' ? '/volunteer-intake' : '/organization-intake';
      }
      
      // Profile is complete, go to dashboard
      return '/dashboard';
    } catch (error) {
      console.error('Error checking profile status:', error);
      // Default to dashboard if there's an error
      return '/dashboard';
    }
  };

  const handleGoogleSignIn = async () => {
    // Check for invitation code if invite-only mode is enabled and registering
    if (isInviteOnly && activeTab === 'register' && !invitationCode.trim()) {
      toast({
        title: "Invitation code required",
        description: "This platform requires an invitation code to register. Please enter your code first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const firebaseUser = await signInWithGoogle();

      // Sync with backend database
      if (firebaseUser) {
        const response = await fetch('/api/users/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            userType: userType || 'volunteer', // Default to volunteer
            // Include invitation code if provided (for new registrations)
            invitationCode: invitationCode.trim() || undefined
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.requiresInvitation) {
            throw new Error(errorData.message || 'Invalid invitation code');
          }
          throw new Error('Failed to sync with backend');
        }
        
        const dbUser = await response.json();
        localStorage.setItem('currentUserId', dbUser.id);
        localStorage.setItem('userType', dbUser.userType || userType || 'volunteer');

        // Check if this is a new registration (register tab) or existing login
        const isNewRegistration = activeTab === 'register' && dbUser.isNewUser;
        if (isNewRegistration) {
          // New signup via Google - will need to complete profile
          localStorage.setItem('isNewSignup', 'true');
          localStorage.removeItem('profileComplete');
        } else {
          // Returning user - go directly to dashboard
          localStorage.removeItem('isNewSignup');
          localStorage.setItem('profileComplete', 'true');
        }

        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('lastLoginTime', new Date().getTime().toString());
        } else {
          localStorage.removeItem('rememberMe');
        }

        // Redirect based on whether this is new signup or returning user
        const userTypeForRedirect = dbUser.userType || userType || 'volunteer';
        if (isNewRegistration) {
          // New users go to profile settings
          if (userTypeForRedirect === 'volunteer') {
            setLocation('/volunteer-profile-settings');
          } else if (userTypeForRedirect === 'organization') {
            setLocation('/organization-profile-settings');
          } else if (userTypeForRedirect === 'corporate-partner') {
            setLocation('/corporate-partner-profile-settings');
          } else {
            setLocation('/dashboard');
          }
        } else {
          // Returning users go directly to dashboard
          let dashboardPath = '/volunteer-dashboard';
          if (userTypeForRedirect === 'organization') dashboardPath = '/organization-dashboard';
          else if (userTypeForRedirect === 'corporate-partner') dashboardPath = '/csr-dashboard';
          setLocation(dashboardPath);
        }

        toast({
          title: isNewRegistration ? "Account created" : "Welcome back!",
          description: isNewRegistration
            ? "Please complete your profile settings to get started."
            : "You have successfully signed in with Google.",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error signing in with Google:", errorMessage);
      toast({
        title: "Error",
        description: errorMessage || "Failed to sign in. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast({
        title: "Missing information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      const firebaseUser = await signInWithEmail(loginEmail, loginPassword);
      
      // Sync with backend database
      if (firebaseUser) {
        const response = await fetch('/api/users/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            userType: userType || 'volunteer'
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to sync with backend');
        }

        const dbUser = await response.json();
        localStorage.setItem('currentUserId', dbUser.id);
        localStorage.setItem('userType', dbUser.userType || userType || 'volunteer');

        // For returning users (login, not signup), mark profile as complete
        // and ensure they go directly to dashboard without intake redirect
        localStorage.removeItem('isNewSignup');
        localStorage.setItem('profileComplete', 'true');

        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('lastLoginTime', new Date().getTime().toString());
        } else {
          localStorage.removeItem('rememberMe');
        }

        // Returning users go directly to their dashboard
        const userTypeForRedirect = dbUser.userType || userType || 'volunteer';
        let dashboardPath = '/volunteer-dashboard';
        if (userTypeForRedirect === 'organization') dashboardPath = '/organization-dashboard';
        else if (userTypeForRedirect === 'corporate-partner') dashboardPath = '/csr-dashboard';
        setLocation(dashboardPath);

        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      }
    } catch (error) {
      console.error("Error signing in:", error);
      toast({
        title: "Error",
        description: "Failed to sign in. Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      await sendPasswordResetEmail(auth, loginEmail);
      toast({
        title: "Password reset email sent",
        description: "Check your inbox for instructions to reset your password.",
      });
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerName || !registerEmail || !registerPassword || !confirmPassword) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    // Check for invitation code if invite-only mode is enabled
    if (isInviteOnly && !invitationCode.trim()) {
      toast({
        title: "Invitation code required",
        description: "This platform requires an invitation code to register.",
        variant: "destructive",
      });
      return;
    }

    if (registerPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const firebaseUser = await signUp(registerEmail, registerPassword, userType || undefined, registerName);

      // Sync with backend database
      if (firebaseUser && userType) {
        const response = await fetch('/api/users/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: registerName,
            userType,
            // Pass organization name for org/corporate users - will be saved and used to pre-fill intake form
            organizationName: (userType === 'organization' || userType === 'corporate-partner') ? organizationName : undefined,
            // Include invitation code if provided
            invitationCode: invitationCode.trim() || undefined,
            // Privacy consent - required during registration
            dataConsent: privacyConsentAccepted,
            dataConsentDate: privacyConsentAccepted ? new Date().toISOString() : undefined
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.requiresInvitation) {
            throw new Error(errorData.message || 'Invalid invitation code');
          }
          throw new Error('Failed to sync with backend');
        }

        const dbUser = await response.json();
        localStorage.setItem('currentUserId', dbUser.id);
        localStorage.setItem('userType', userType || 'volunteer');

        // Mark this as a new signup - profile settings will be shown
        // This flag is cleared after profile is completed
        localStorage.setItem('isNewSignup', 'true');
        localStorage.removeItem('profileComplete'); // Clear any stale profile complete flag

        // Store organization name in localStorage for intake form to pre-fill (prevents asking twice)
        if ((userType === 'organization' || userType === 'corporate-partner') && organizationName) {
          localStorage.setItem('pendingOrganizationName', organizationName);
        }

        // Redirect to profile settings page based on user type
        if (userType === 'volunteer') {
          setLocation("/volunteer-profile-settings");
        } else if (userType === 'organization') {
          setLocation("/organization-profile-settings");
        } else if (userType === 'corporate-partner') {
          setLocation("/corporate-partner-profile-settings");
        } else {
          setLocation("/dashboard");
        }

        toast({
          title: "Account created",
          description: "Please complete your profile settings to get started.",
        });
      } else {
        setLocation("/dashboard");
        toast({
          title: "Account created",
          description: "Welcome to Synerxus!",
        });
      }
    } catch (error) {
      console.error("Error signing up:", error);
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-block hover:opacity-80 transition-opacity mb-4">
            <Logo size="lg" />
          </a>
          <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
            Connect. Manage. Impact Globally.
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              {isInviteOnly
                ? "This platform is invitation-only. Sign in if you have an account, or register with an invitation code."
                : "Sign in to your account or create a new one"
              }
            </CardDescription>
            {isInviteOnly && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                  <FiKey className="inline-block mr-1 h-3 w-3" />
                  Access is by invitation only. Contact an approved organization to request access.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
              </TabsList>
              
              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleEmailLogin}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="m@example.com" 
                          className="pl-10"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                          disabled={isLoading}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <Input 
                          id="password" 
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="••••••••" 
                          className="pl-10 pr-10"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          disabled={isLoading}
                          data-testid="input-login-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          aria-label={showLoginPassword ? "Hide password" : "Show password"}
                          data-testid="button-toggle-login-password"
                        >
                          {showLoginPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                        data-testid="checkbox-remember-me"
                      />
                      <Label htmlFor="remember-me" className="text-sm cursor-pointer font-normal">
                        Keep me logged in
                      </Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              {/* Register Tab */}
              <TabsContent value="register">
                {/* Step 1: User Type Selection */}
                {!userType ? (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Join Synerxus
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Select your account type to get started
                      </p>
                    </div>

                    {/* Volunteer Option */}
                    <button
                      type="button"
                      className="w-full p-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all duration-200 text-left group"
                      onClick={() => setUserType("volunteer")}
                      data-testid="button-register-volunteer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FiHeart className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-base text-emerald-800 dark:text-emerald-200">
                            Volunteer
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Find meaningful opportunities to make a difference worldwide
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Organization Option */}
                    <button
                      type="button"
                      className="w-full p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 text-left group"
                      onClick={() => setUserType("organization")}
                      data-testid="button-register-organization"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FiGlobe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-base text-blue-800 dark:text-blue-200">
                            Organization
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Connect with skilled volunteers to amplify your impact
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Corporate Partner Option */}
                    <button
                      type="button"
                      className="w-full p-4 rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-md transition-all duration-200 text-left group"
                      onClick={() => setUserType("corporate-partner")}
                      data-testid="button-register-corporate"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FiBriefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-base text-purple-800 dark:text-purple-200">
                            Corporate Partner
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Empower your employees through CSR volunteer programs
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                ) : !privacyConsentAccepted ? (
                  /* Step 2: Privacy Consent - Required to Continue */
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <FiShield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Before you continue
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        User Consent for Platform Access
                      </p>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
                      <p>
                        To use Synerxus, we ask for your consent to allow the platform to process
                        and use your data to help improve system performance, optimize features,
                        and enhance your overall experience.
                      </p>
                      <p>
                        Your information will always be handled responsibly and in alignment with
                        our commitment to transparency and impact.
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        By selecting "I Agree", you confirm that:
                      </p>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                        <li className="flex items-start gap-2">
                          <FiCheck className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>You understand your data may be used to help optimize the platform</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>You consent to this use as part of accessing and using Synerxus</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>You acknowledge that this consent is required to continue</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={() => setPrivacyConsentAccepted(true)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                      >
                        <FiCheck className="h-4 w-4 mr-2" />
                        I Agree — Continue to Registration
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setUserType(null);
                          setPrivacyConsentAccepted(false);
                          toast({
                            title: "Consent Required",
                            description: "You must agree to the data usage policy to create an account.",
                            variant: "destructive",
                          });
                        }}
                        className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                        size="lg"
                      >
                        <FiX className="h-4 w-4 mr-2" />
                        I Do Not Agree — Exit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSignUp}>
                    <div className="space-y-4">
                      {/* Selected user type indicator */}
                      <div className="flex items-center justify-between mb-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUserType(null);
                            setPrivacyConsentAccepted(false);
                          }}
                          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 -ml-2"
                          data-testid="button-back-to-selection"
                        >
                          ← Change type
                        </Button>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                          userType === 'volunteer'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : userType === 'organization'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                        }`}>
                          {userType === 'volunteer' && <FiHeart className="w-4 h-4" />}
                          {userType === 'organization' && <FiGlobe className="w-4 h-4" />}
                          {userType === 'corporate-partner' && <FiBriefcase className="w-4 h-4" />}
                          {userType === 'volunteer' ? 'Volunteer' : userType === 'organization' ? 'Organization' : 'Corporate Partner'}
                        </div>
                      </div>
                      
                      {(userType === "organization" || userType === "corporate-partner") && (
                        <div className="space-y-2">
                          <Label htmlFor="org-name">{userType === "corporate-partner" ? "Company Name" : "Organization Name"}</Label>
                          <Input 
                            id="org-name" 
                            placeholder={userType === "corporate-partner" ? "Acme Corp" : "Global Impact Foundation"} 
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            disabled={isLoading}
                            data-testid="input-org-name"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="name">{userType === "volunteer" ? "Full Name" : "Contact Name"}</Label>
                        <div className="relative">
                          <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                          <Input 
                            id="name" 
                            placeholder="John Doe" 
                            className="pl-10"
                            value={registerName}
                            onChange={(e) => setRegisterName(e.target.value)}
                            disabled={isLoading}
                            data-testid="input-register-name"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-email">Email</Label>
                        <div className="relative">
                          <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                          <Input 
                            id="register-email" 
                            type="email" 
                            placeholder="m@example.com" 
                            className="pl-10"
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            disabled={isLoading}
                            data-testid="input-register-email"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password">Password</Label>
                        <div className="relative">
                          <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                          <Input 
                            id="register-password" 
                            type={showRegisterPassword ? "text" : "password"}
                            placeholder="••••••••" 
                            className="pl-10 pr-10"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            disabled={isLoading}
                            data-testid="input-register-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                            data-testid="button-toggle-register-password"
                          >
                            {showRegisterPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <div className="relative">
                          <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                            data-testid="input-confirm-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            data-testid="button-toggle-confirm-password"
                          >
                            {showConfirmPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Invitation Code - shown when invite-only mode is enabled */}
                      {isInviteOnly && (
                        <div className="space-y-2">
                          <Label htmlFor="invitation-code" className="flex items-center gap-2">
                            <span className="text-amber-600">*</span> Invitation Code
                          </Label>
                          <div className="relative">
                            <FiKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500" />
                            <Input
                              id="invitation-code"
                              placeholder="Enter your invitation code"
                              className="pl-10 border-amber-200 focus:border-amber-400"
                              value={invitationCode}
                              onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                              disabled={isLoading}
                              data-testid="input-invitation-code"
                            />
                          </div>
                          <p className="text-xs text-amber-600">
                            This platform requires an invitation code to register
                          </p>
                        </div>
                      )}

                      <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-register">
                        {isLoading ? "Creating profile..." : "Create Profile"}
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              type="button"
              className="w-full" 
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <FcGoogle className="mr-2 h-5 w-5" />
              Google
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col text-center text-sm text-gray-600 dark:text-gray-400">
            <p>
              By signing in, you agree to our{" "}
              <Link href="/terms" className="text-primary-600 dark:text-primary-400 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">
                Privacy Policy
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
