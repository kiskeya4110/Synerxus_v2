import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Logo from "@/components/ui/logo";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { loginSchema, LoginFormData, UserType, getSignupRoute, getDashboardRoute } from "@/lib/auth-schemas";
import { RoleSelectionDialog } from "@/components/auth/role-selection-dialog";

export default function LoginAuth() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { signInWithEmail, signInWithGoogle, dbUser } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<any>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { register, handleSubmit, formState: { errors } } = form;

  // Handle email/password login
  const onSubmit = async (data: LoginFormData) => {
    setIsEmailLoading(true);
    try {
      await signInWithEmail(data.email, data.password);

      // Set profile complete and redirect to dashboard
      localStorage.setItem("profileComplete", "true");

      toast({
        title: "Welcome back!",
        description: "You have been logged in successfully.",
      });

      navigate(getDashboardRoute());
    } catch (error) {
      // Error handling is done in useAuth hook
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();

      if (!result) {
        throw new Error("Google sign-in failed");
      }

      const { user, isNewUser } = result;

      if (isNewUser) {
        // New user - show role selection dialog
        setPendingGoogleUser(user);
        setShowRoleDialog(true);
      } else {
        // Existing user - redirect to dashboard
        localStorage.setItem("profileComplete", "true");
        toast({
          title: "Welcome back!",
          description: "You have been logged in successfully.",
        });
        navigate(getDashboardRoute());
      }
    } catch (error) {
      // Error handling is done in useAuth hook
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle role selection for new Google users
  const handleRoleSelect = async (role: UserType) => {
    setIsGoogleLoading(true);
    try {
      // Navigate to the appropriate signup page to complete profile
      navigate(getSignupRoute(role));
    } finally {
      setIsGoogleLoading(false);
      setShowRoleDialog(false);
    }
  };

  const isLoading = isEmailLoading || isGoogleLoading;

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <a href="/landing" className="inline-block hover:opacity-80 transition-opacity mb-4">
            <Logo size="lg" />
          </a>
          <p className="text-stone-600 font-medium">
            Connect. Manage. Impact Globally.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...register("email")}
                    className="pl-10"
                    disabled={isLoading}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                    onClick={(e) => {
                      e.preventDefault();
                      toast({
                        title: "Password Reset",
                        description: "Password reset functionality coming soon.",
                      });
                    }}
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...register("password")}
                    className="pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isEmailLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FcGoogle className="h-5 w-5 mr-2" />
              )}
              Continue with Google
            </Button>

            {/* Sign up link */}
            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{" "}
              <a href="/signup" className="text-indigo-600 font-medium hover:text-indigo-500">
                Sign up
              </a>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Role Selection Dialog for new Google users */}
      <RoleSelectionDialog
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
        onRoleSelect={handleRoleSelect}
        isLoading={isGoogleLoading}
      />
    </div>
  );
}
