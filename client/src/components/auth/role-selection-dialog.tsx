import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FiHeart, FiGlobe, FiBriefcase } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import { UserType, UserTypes } from "@/lib/auth-schemas";

interface RoleSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleSelect: (role: UserType) => void;
  isLoading?: boolean;
}

const ROLES = [
  {
    type: UserTypes.VOLUNTEER as UserType,
    title: "Volunteer",
    description: "Log your impact hours and connect with NGOs",
    icon: FiHeart,
    colors: {
      bg: "from-emerald-50 to-teal-50",
      border: "border-emerald-200 hover:border-emerald-400",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      textColor: "text-emerald-800",
    },
  },
  {
    type: UserTypes.ORGANIZATION as UserType,
    title: "Organization",
    description: "Manage volunteers and verify impact",
    icon: FiGlobe,
    colors: {
      bg: "from-blue-50 to-indigo-50",
      border: "border-blue-200 hover:border-blue-400",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      textColor: "text-blue-800",
    },
  },
  {
    type: UserTypes.CORPORATE_PARTNER as UserType,
    title: "Corporate Partner",
    description: "Track employee volunteering and CSR impact",
    icon: FiBriefcase,
    colors: {
      bg: "from-purple-50 to-violet-50",
      border: "border-purple-200 hover:border-purple-400",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      textColor: "text-purple-800",
    },
  },
];

export function RoleSelectionDialog({
  open,
  onOpenChange,
  onRoleSelect,
  isLoading = false,
}: RoleSelectionDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserType | null>(null);

  const handleRoleClick = (role: UserType) => {
    setSelectedRole(role);
    onRoleSelect(role);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">Welcome to Synerxus!</DialogTitle>
          <DialogDescription className="text-center">
            Select your role to complete your account setup
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.type;
            const isCurrentlyLoading = isLoading && isSelected;

            return (
              <Button
                key={role.type}
                type="button"
                variant="outline"
                disabled={isLoading}
                className={`w-full p-4 h-auto rounded-xl border-2 ${role.colors.border} bg-gradient-to-r ${role.colors.bg} hover:shadow-md transition-all duration-200 text-left group whitespace-normal overflow-visible justify-start [&_svg]:size-auto ${
                  isSelected ? "ring-2 ring-offset-2 ring-indigo-500" : ""
                }`}
                onClick={() => handleRoleClick(role.type)}
              >
                <div className="flex items-start gap-3 w-full">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full ${role.colors.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    {isCurrentlyLoading ? (
                      <Loader2 className={`w-5 h-5 ${role.colors.iconColor} animate-spin`} />
                    ) : (
                      <Icon className={`w-5 h-5 ${role.colors.iconColor}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold text-sm ${role.colors.textColor}`}>
                      {role.title}
                    </div>
                    <div className="text-xs text-stone-600 mt-0.5">{role.description}</div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        <p className="text-xs text-center text-stone-500 mt-4">
          You can change your role later in settings
        </p>
      </DialogContent>
    </Dialog>
  );
}
