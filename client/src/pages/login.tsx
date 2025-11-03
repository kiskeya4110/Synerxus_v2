import { useState } from "react";
import { useLocation } from "wouter";
import { UserCredential } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FiMail, FiLock, FiUser } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { signInWithGoogle, signInWithEmail, signUp } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<"volunteer" | "organization" | null>(null);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithGoogle() as UserCredential | undefined;
      
      // Sync with backend database
      const firebaseUser = result?.user;
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
        const dbUser = await response.json();
        localStorage.setItem('currentUserId', dbUser.id);
      }
      
      setLocation("/dashboard");
      toast({
        title: "Welcome!",
        description: "You have successfully signed in with Google.",
      });
    } catch (error) {
      console.error("Error signing in with Google:", error);
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
      const result = await signInWithEmail(loginEmail, loginPassword) as UserCredential | undefined;
      
      // Sync with backend database
      if (result?.user) {
        const response = await fetch('/api/users/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseUid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            userType: 'volunteer' // Default for email login
          })
        });
        const dbUser = await response.json();
        localStorage.setItem('currentUserId', dbUser.id);
      }
      
      setLocation("/dashboard");
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    } catch (error) {
      console.error("Error signing in:", error);
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
      const result = await signUp(registerEmail, registerPassword, userType || undefined, registerName) as UserCredential | undefined;
      
      // Sync with backend database
      if (result?.user && userType) {
        const response = await fetch('/api/users/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseUid: result.user.uid,
            email: result.user.email,
            displayName: registerName,
            userType
          })
        });
        const dbUser = await response.json();
        localStorage.setItem('currentUserId', dbUser.id);
      }
      
      setLocation("/dashboard");
      toast({
        title: "Account created",
        description: "Your account has been created successfully.",
      });
    } catch (error) {
      console.error("Error signing up:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-block hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center gap-4 mb-4">
              <img 
                src="/attached_assets/Synerxus - Logo Wavy - Only_1761874690806.png" 
                alt="Synerxus Logo" 
                className="h-24 w-24 object-contain"
              />
              <h1 className="text-4xl font-bold">
                <span style={{ color: '#1e3a8a' }}>SYNER</span>
                <span style={{ color: '#f59e0b' }}>XUS</span>
              </h1>
            </div>
          </a>
          <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
            Connect. Collaborate. Impact Globally.
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
            <Tabs defaultValue="login" className="w-full">
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
                          type="password" 
                          placeholder="••••••••" 
                          className="pl-10"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
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
                      
                      {userType === "organization" && (
                        <div className="space-y-2">
                          <Label htmlFor="org-name">Organization Name</Label>
                          <Input 
                            id="org-name" 
                            placeholder="Global Impact Foundation" 
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
                            type="password" 
                            placeholder="••••••••" 
                            className="pl-10"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            disabled={isLoading}
                            data-testid="input-register-password"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <div className="relative">
                          <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                          <Input 
                            id="confirm-password" 
                            type="password" 
                            placeholder="••••••••" 
                            className="pl-10"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                            data-testid="input-confirm-password"
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-register">
                        {isLoading ? "Creating account..." : `Create ${userType === "volunteer" ? "Volunteer" : "Organization"} Account`}
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
