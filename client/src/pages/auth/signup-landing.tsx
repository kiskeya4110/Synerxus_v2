import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { FiHeart, FiGlobe, FiBriefcase, FiArrowRight } from "react-icons/fi";
import { UserTypes } from "@/lib/auth-schemas";

const ROLE_OPTIONS = [
  {
    type: UserTypes.VOLUNTEER,
    title: "Volunteer",
    description: "Join as an employee volunteer and make an impact. Log your hours, track outcomes, and see your contributions in action.",
    icon: FiHeart,
    href: "/signup/volunteer",
    colors: {
      bg: "from-emerald-50 to-teal-50",
      border: "border-emerald-200 hover:border-emerald-400",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      textColor: "text-emerald-800",
    },
  },
  {
    type: UserTypes.ORGANIZATION,
    title: "Organization (NGO)",
    description: "Register your NGO to manage volunteers, verify impact logs, and connect with corporate partners.",
    icon: FiGlobe,
    href: "/signup/organization",
    colors: {
      bg: "from-blue-50 to-indigo-50",
      border: "border-blue-200 hover:border-blue-400",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      textColor: "text-blue-800",
    },
  },
  {
    type: UserTypes.CORPORATE_PARTNER,
    title: "Corporate Partner",
    description: "Start your CSR pilot program. Track employee volunteering and measure verified SDG impact.",
    icon: FiBriefcase,
    href: "/signup/corporate",
    colors: {
      bg: "from-purple-50 to-violet-50",
      border: "border-purple-200 hover:border-purple-400",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      textColor: "text-purple-800",
    },
  },
];

export default function SignupLanding() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <a href="/landing" className="inline-block hover:opacity-80 transition-opacity mb-4">
            <Logo size="lg" />
          </a>
          <h1 className="text-2xl font-bold text-gray-900">Join Synerxus</h1>
          <p className="text-stone-600 mt-2">
            Select your role to get started
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-center">I am a...</CardTitle>
            <CardDescription className="text-center">
              Choose the option that best describes you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ROLE_OPTIONS.map((role) => {
              const Icon = role.icon;
              return (
                <Button
                  key={role.type}
                  type="button"
                  variant="outline"
                  className={`w-full p-6 h-auto rounded-xl border-2 ${role.colors.border} bg-gradient-to-r ${role.colors.bg} hover:shadow-md transition-all duration-200 text-left group whitespace-normal overflow-visible justify-start [&_svg]:size-auto`}
                  onClick={() => navigate(role.href)}
                >
                  <div className="flex items-start gap-4 w-full">
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-full ${role.colors.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}
                    >
                      <Icon className={`w-6 h-6 ${role.colors.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold text-base ${role.colors.textColor}`}>
                          {role.title}
                        </span>
                        <FiArrowRight className={`w-4 h-4 ${role.colors.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                      </div>
                      <p className="text-sm text-stone-600 mt-1 leading-snug">
                        {role.description}
                      </p>
                    </div>
                  </div>
                </Button>
              );
            })}

            {/* Login link */}
            <p className="text-center text-sm text-gray-500 pt-4">
              Already have an account?{" "}
              <a href="/login" className="text-indigo-600 font-medium hover:text-indigo-500">
                Log in
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
