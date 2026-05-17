import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { Heart, Globe, Building2, ArrowRight, CheckCircle, ShieldCheck } from "lucide-react";

const ROLE_OPTIONS = [
  {
    id: "volunteer",
    title: "Volunteer",
    description: "Log your activity and contribute to partner-confirmed evidence records.",
    icon: Heart,
    href: "/signup/volunteer",
    free: true,
    freeLabel: "Always free",
    accent: "#059669",
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-200 hover:border-emerald-400",
    accentIcon: "bg-emerald-100 text-emerald-600",
    accentText: "text-emerald-700",
  },
  {
    id: "organization",
    title: "NGO Partner",
    description: "Verify project outcomes and generate Verified Evidence Summaries.",
    icon: Globe,
    href: "/signup/organization",
    free: true,
    freeLabel: "Always free",
    accent: "#1D4ED8",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200 hover:border-blue-400",
    accentIcon: "bg-blue-100 text-blue-600",
    accentText: "text-blue-700",
  },
  {
    id: "corporate",
    title: "Corporate Partner",
    description: "Deploy structured ESG programs, generate Verified Evidence Summaries, and support sustainability reporting requirements.",
    icon: Building2,
    href: "/signup/corporate",
    free: false,
    freeLabel: null,
    accent: "#ffcc33",
    accentBg: "bg-[#FFFBF0]",
    accentBorder: "border-[#ffcc33]/40 hover:border-[#ffcc33]/80",
    accentIcon: "bg-[#ffcc33]/15 text-[#ffcc33]",
    accentText: "text-[#ffcc33]",
  },
];

const PLAN_LABELS: Record<string, string> = {
  pilot: "Pilot — $5,000 / 90 days",
  starter: "Starter — From $8,000/yr",
  growth: "Growth — From $22,000/yr",
  enterprise: "Enterprise — From $38,000/yr",
};

export default function SignupLanding() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const selectedPlan = urlParams.get("plan");

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <a href="/landing" className="inline-block hover:opacity-80 transition-opacity mb-5">
            <Logo size="lg" />
          </a>
          <h1 className="text-2xl font-extrabold text-[#0A1F44]">Join the Verification Network</h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Choose how you contribute to partner-confirmed evidence records
          </p>
        </div>

        {/* Plan context banner — shown when coming from pricing CTAs */}
        {selectedPlan && PLAN_LABELS[selectedPlan] && (
          <div className="mb-5 flex items-center gap-3 bg-[#0A1F44] rounded-2xl px-5 py-3.5">
            <ShieldCheck className="h-4 w-4 text-[#ffcc33] flex-shrink-0" />
            <div>
              <p className="text-white text-xs font-semibold">You selected: {PLAN_LABELS[selectedPlan]}</p>
              <p className="text-blue-200 text-[11px] mt-0.5">Complete your corporate account below to continue.</p>
            </div>
          </div>
        )}

        {/* Role cards */}
        <div className="space-y-3">
          {ROLE_OPTIONS.map((role) => {
            const Icon = role.icon;
            const href = role.id === "corporate" && selectedPlan
              ? `${role.href}?plan=${selectedPlan}`
              : role.href;

            return (
              <button
                key={role.id}
                type="button"
                onClick={() => navigate(href)}
                className={`w-full text-left rounded-2xl border-2 ${role.accentBorder} ${role.accentBg} px-5 py-4 flex items-center gap-4 group hover:shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1F44]/30`}
              >
                <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${role.accentIcon} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-[#0A1F44] text-sm">{role.title}</span>
                    {role.free && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700`}>
                        <CheckCircle className="h-2.5 w-2.5" />
                        {role.freeLabel}
                      </span>
                    )}
                    {!role.free && selectedPlan && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffcc33]/15 text-[#ffcc33]`}>
                        {PLAN_LABELS[selectedPlan]?.split(" — ")[0]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">{role.description}</p>
                </div>
                <ArrowRight className={`flex-shrink-0 w-4 h-4 ${role.accentText} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </button>
            );
          })}
        </div>

        {/* Free note */}
        <p className="text-center text-xs text-slate-400 mt-5 flex items-center justify-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          NGOs &amp; Volunteers always join free — no credit card required
        </p>

        {/* Login link */}
        <p className="text-center text-sm text-slate-500 mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-[#0A1F44] font-semibold hover:text-[#ffcc33] transition-colors">
            Log in
          </a>
        </p>

      </div>
    </div>
  );
}
