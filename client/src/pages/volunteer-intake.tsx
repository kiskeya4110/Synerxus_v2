import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function VolunteerIntake() {
  const [, setLocation] = useLocation();
  const { user, dbUser } = useAuth();

  useEffect(() => {
    // Redirect to the profile settings page which has the full form
    if (user?.uid || dbUser?.id) {
      setLocation("/volunteer-profile-settings");
    }
  }, [user?.uid, dbUser?.id, setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to profile...</p>
      </div>
    </div>
  );
}
