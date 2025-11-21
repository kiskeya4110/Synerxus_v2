// This page now redirects to the intake form for editing
// The profile display is shown in the main /profile page
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function VolunteerProfile() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to volunteer-intake which is the settings/edit page
    setLocation("/volunteer-intake");
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
