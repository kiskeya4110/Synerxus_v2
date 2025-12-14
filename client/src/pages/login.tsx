import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { UserCredential } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/ui/logo";

export default function Login() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { signInWithGoogle, signInWithEmail, signUp } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<"volunteer" | "organization" | "corporate-partner" | null>(null);

  // Get initial tab from URL parameter
  const urlParams = new URLSearchParams(searchString);
  const tabFromUrl = urlParams.get('tab') === 'register' ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Update active tab when URL changes
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const tab = params.get('tab') === 'register' ? 'register' : 'login';
    setActiveTab(tab);
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
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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
            userType: userType || 'volunteer' // Default to volunteer
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to sync with backend');
        }
        
        const dbUser = await response.json();
        localStorage.setItem('currentUserId', dbUser.id);
        localStorage.setItem('userType', dbUser.userType || userType || 'volunteer');
        
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('lastLoginTime', new Date().getTime().toString());
        } else {
          localStorage.removeItem('rememberMe');
        }
        
        // Determine redirect based on profile completion
        const redirectPath = await getRedirectPath(dbUser.id, dbUser.userType);
        setLocation(redirectPath);
        
        toast({
          title: "Welcome!",
          description: "You have successfully signed in with Google.",
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
            displayName: firebaseUser.displayName
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to sync with backend');
        }
        
        const dbUser = await response.json();
        localStorage.setItem('currentUserId', dbUser.id);
        localStorage.setItem('userType', dbUser.userType || userType || 'volunteer');
        
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('lastLoginTime', new Date().getTime().toString());
        } else {
          localStorage.removeItem('rememberMe');
        }
        
        // Determine redirect based on profile completion
        const redirectPath = await getRedirectPath(dbUser.id, dbUser.userType);
        setLocation(redirectPath);
        
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
            organizationName: (userType === 'organization' || userType === 'corporate-partner') ? organizationName : undefined
          })
        });

        if (!response.ok) {
          throw new Error('Failed to sync with backend');
        }

        const dbUser = await response.json();
        localStorage.setItem('currentUserId', dbUser.id);
        localStorage.setItem('userType', userType || 'volunteer');

        // Store organization name in localStorage for intake form to pre-fill (prevents asking twice)
        if ((userType === 'organization' || userType === 'corporate-partner') && organizationName) {
          localStorage.setItem('pendingOrganizationName', organizationName);
        }

        // Redirect to appropriate intake form based on user type
        if (userType === 'volunteer') {
          setLocation("/volunteer-intake");
        } else if (userType === 'organization') {
          setLocation("/organization-intake");
        } else if (userType === 'corporate-partner') {
          setLocation("/corporate-partner-intake");
        } else {
          setLocation("/dashboard");
        }
        
        toast({
          title: "Account created",
          description: "Please complete your profile to get started.",
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
              Sign in to your account or create a new one
            </CardDescription>
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
                        <a href="#" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                          Forgot password?
                        </a>
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
                {!userType ? (
                  <div className="space-y-4">
                    <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-4">
                      Choose your account type to get started
                    </p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-20 text-left justify-start"
                      onClick={() => setUserType("volunteer")}
                      data-testid="button-register-volunteer"
                    >
                      <div>
                        <div className="font-semibold text-base">I'm a Volunteer</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Find meaningful opportunities worldwide
                        </div>
                      </div>
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-20 text-left justify-start"
                      onClick={() => setUserType("organization")}
                      data-testid="button-register-organization"
                    >
                      <div>
                        <div className="font-semibold text-base">I'm an Organization</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Connect with global volunteers
                        </div>
                      </div>
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-20 text-left justify-start border-blue-200 dark:border-blue-800"
                      onClick={() => setUserType("corporate-partner")}
                      data-testid="button-register-corporate"
                    >
                      <div>
                        <div className="font-semibold text-base">I'm a Corporate Partner</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Manage employee volunteer programs
                        </div>
                      </div>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSignUp}>
                    <div className="space-y-4">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setUserType(null)}
                        className="mb-2"
                        data-testid="button-back-to-selection"
                      >
                        ← Back to account type selection
                      </Button>
                      
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
              <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
                Privacy Policy
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
