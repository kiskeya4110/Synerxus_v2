import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FiHeart, FiGlobe, FiBriefcase } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import Logo from "@/components/ui/logo";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = async (role: "volunteer" | "organization" | "corporate-partner") => {
    setIsLoading(true);

    try {
      // Try to create a demo user in the database
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `demo_${role}_${Date.now()}@synerxus.com`,
          displayName: role === "volunteer" ? "Demo Volunteer" : role === "organization" ? "Demo Organization" : "Demo Corporate",
          username: `demo_${role}_${Date.now()}`,
          userType: role,
          firebaseUid: `demo_${Date.now()}`,
        }),
      });

      let userId = "1";
      if (response.ok) {
        const user = await response.json();
        userId = String(user.id);
      }

      // Set user data in localStorage
      localStorage.setItem('currentUserId', userId);
      localStorage.setItem('userType', role);
      localStorage.setItem('profileComplete', 'true');
      localStorage.removeItem('isNewSignup');

      // Redirect to appropriate dashboard
      if (role === 'volunteer') {
        setLocation('/volunteer-dashboard');
      } else if (role === 'organization') {
        setLocation('/organization-dashboard');
      } else if (role === 'corporate-partner') {
        setLocation('/csr-dashboard');
      }
    } catch (error) {
      console.error("Login error:", error);
      // Fallback to demo mode
      localStorage.setItem('currentUserId', '1');
      localStorage.setItem('userType', role);
      localStorage.setItem('profileComplete', 'true');

      if (role === 'volunteer') {
        setLocation('/volunteer-dashboard');
      } else if (role === 'organization') {
        setLocation('/organization-dashboard');
      } else if (role === 'corporate-partner') {
        setLocation('/csr-dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pwa-gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-block hover:opacity-80 transition-opacity mb-4">
            <Logo size="lg" />
          </a>
          <p className="text-stone-600 mt-2 font-medium">
            Connect. Manage. Impact Globally.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Dashboard Preview</CardTitle>
            <CardDescription className="text-center">
              Select a role to view the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-stone-800">
                  Select Your Role
                </h3>
                <p className="text-sm text-stone-600 mt-1">
                  Choose a role to preview the dashboard
                </p>
              </div>

              {/* Volunteer Option */}
              <Button
                type="button"
                variant="outline"
                className="w-full p-6 h-auto rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 hover:border-emerald-400 hover:shadow-md transition-all duration-200 text-left group whitespace-normal overflow-visible justify-start [&_svg]:size-auto"
                onClick={() => handleRoleSelect("volunteer")}
                data-testid="button-select-volunteer"
              >
                <div className="flex items-start gap-4 w-full">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FiHeart className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-base text-emerald-800">
                      Volunteer
                    </div>
                    <div className="text-sm text-stone-600 mt-1">
                      View volunteer dashboard and opportunities
                    </div>
                  </div>
                </div>
              </Button>

              {/* Organization Option */}
              <Button
                type="button"
                variant="outline"
                className="w-full p-6 h-auto rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 hover:border-blue-400 hover:shadow-md transition-all duration-200 text-left group whitespace-normal overflow-visible justify-start [&_svg]:size-auto"
                onClick={() => handleRoleSelect("organization")}
                data-testid="button-select-organization"
              >
                <div className="flex items-start gap-4 w-full">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FiGlobe className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-base text-blue-800">
                      Organization
                    </div>
                    <div className="text-sm text-stone-600 mt-1">
                      View organization dashboard and volunteer management
                    </div>
                  </div>
                </div>
              </Button>

              {/* Corporate Partner Option */}
              <Button
                type="button"
                variant="outline"
                className="w-full p-6 h-auto rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50 hover:border-purple-400 hover:shadow-md transition-all duration-200 text-left group whitespace-normal overflow-visible justify-start [&_svg]:size-auto"
                onClick={() => handleRoleSelect("corporate-partner")}
                data-testid="button-select-corporate"
              >
                <div className="flex items-start gap-4 w-full">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FiBriefcase className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-base text-purple-800">
                      Corporate Partner
                    </div>
                    <div className="text-sm text-stone-600 mt-1">
                      View CSR dashboard and employee programs
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
