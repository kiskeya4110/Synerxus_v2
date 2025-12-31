import { OnboardingStep } from "../client/src/contexts/onboarding-context";

// ============================================
// FULL ONBOARDING STEPS (Control & Guided variants)
// ============================================

export const volunteerOnboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Synerxus!",
    description: "We're excited to have you join our global community of volunteers. This quick tour will show you how to discover opportunities, track your impact, and make a real difference in the world.",
    userType: "volunteer",
  },
  {
    id: "dashboard-kpis",
    title: "Your Impact at a Glance",
    description: "Your dashboard shows key metrics: hours logged, tasks completed, active projects, skills applied, and AIU (Annual Impact Units) earned. Click any metric card to see detailed breakdowns.",
    targetSelector: '[data-testid="kpi-hours"]',
    actions: ["Click a KPI card to see details", "Track your progress over time"],
    userType: "volunteer",
  },
  {
    id: "discover-opportunities",
    title: "Find Volunteer Opportunities",
    description: "Use the navigation to discover opportunities that match your skills and interests. Our AI-powered matching system suggests the best fits based on your profile.",
    targetSelector: '[data-testid="volunteer-nav-discover"], [data-testid="nav-discover"]',
    actions: ["Browse available opportunities", "Apply to projects that interest you"],
    userType: "volunteer",
  },
  {
    id: "view-projects",
    title: "Your Active Projects",
    description: "See all projects you're assigned to. Each project card shows your role, hours contributed, upcoming tasks, and the SDG goals you're supporting.",
    targetSelector: '[data-testid="volunteer-nav-my-projects"], [data-testid="nav-projects"]',
    actions: ["View your assigned projects", "Check upcoming tasks and deadlines"],
    userType: "volunteer",
  },
  {
    id: "log-activity",
    title: "Log Your Volunteer Hours",
    description: "Track every contribution! Log your hours, describe your activities, and record the impact you've made. This data helps generate reports for organizations.",
    targetSelector: '[data-testid="volunteer-nav-profile-menu"], [data-testid="button-pwa-menu"]',
    actions: ["Open the menu", "Select 'Log Activity'", "Enter hours and describe your work"],
    userType: "volunteer",
  },
  {
    id: "track-impact",
    title: "Visualize Your Impact",
    description: "See beautiful charts showing your contributions over time, SDG alignment, skills utilized, and total people reached. Share your impact story with the world!",
    targetSelector: '[data-testid="volunteer-nav-my-impact"], [data-testid="nav-impact"]',
    actions: ["View your impact metrics", "See your SDG contributions"],
    userType: "volunteer",
  },
  {
    id: "manage-profile",
    title: "Complete Your Profile",
    description: "A complete profile helps organizations find you for relevant opportunities. Add your skills, availability, interests, and professional background.",
    targetSelector: '[data-testid="volunteer-nav-profile-menu"]',
    actions: ["Click your profile menu", "Select 'Profile & Settings'", "Add your skills and interests"],
    userType: "volunteer",
  },
  {
    id: "sdg-alignment",
    title: "Support the UN SDGs",
    description: "Every hour you volunteer contributes to the UN Sustainable Development Goals. Track which SDGs you're supporting and how your efforts align with global impact objectives.",
    targetSelector: '[data-testid="kpi-sdgs"], [data-testid="kpi-aiu-earned"]',
    actions: ["See your SDG contributions", "Explore projects by SDG goal"],
    userType: "volunteer",
  },
  {
    id: "complete",
    title: "You're Ready to Make an Impact!",
    description: "Start exploring opportunities, logging your contributions, and tracking your global impact. Every hour counts toward building a better world. Welcome to the Synerxus community!",
    actions: ["Discover your first opportunity", "Complete your profile", "Log your first activity"],
    userType: "volunteer",
  },
];

export const organizationOnboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Synerxus!",
    description: "Your organization's command center for managing volunteers, tracking impact, and creating meaningful change. Let's set you up for success!",
    userType: "organization",
  },
  {
    id: "dashboard-overview",
    title: "Your Organization Dashboard",
    description: "Monitor everything at a glance: active volunteers, total hours contributed, project status, and SDG alignment. Use filters to view data by project, time period, or SDG goal.",
    targetSelector: '[data-testid="nav-tab-dashboard"]',
    actions: ["Explore your KPI metrics", "View volunteer activity"],
    userType: "organization",
  },
  {
    id: "manage-projects",
    title: "Manage Your Projects",
    description: "View and manage all your projects from one place. Create new projects, assign volunteers, and track progress from start to completion.",
    targetSelector: '[data-testid="nav-tab-projects"], [data-testid="menu-projects"]',
    actions: ["View your projects", "Create a new project", "Assign volunteers"],
    userType: "organization",
  },
  {
    id: "review-applications",
    title: "Review Volunteer Applications",
    description: "When volunteers apply to your opportunities, review their profiles, skills, and availability. Accept or decline applications and welcome new team members.",
    targetSelector: '[data-testid="nav-tab-applications"], [data-testid="menu-applications"]',
    actions: ["View pending applications", "Review volunteer profiles", "Accept or decline"],
    userType: "organization",
  },
  {
    id: "manage-volunteers",
    title: "Manage Your Volunteer Team",
    description: "View all volunteers assigned to your organization. See their skills, hours contributed, active projects, and performance metrics.",
    targetSelector: '[data-testid="nav-tab-volunteers"], [data-testid="menu-volunteers"]',
    actions: ["Browse your volunteer roster", "View individual profiles", "Assign to projects"],
    userType: "organization",
  },
  {
    id: "sdg-mapping",
    title: "SDG Goal Mapping",
    description: "Align your projects with UN Sustainable Development Goals. Track how volunteer hours contribute to each goal and generate SDG-focused reports.",
    targetSelector: '[data-testid="nav-tab-sdgs"], [data-testid="menu-sdgs"]',
    actions: ["Map projects to SDG goals", "View contribution breakdown"],
    userType: "organization",
  },
  {
    id: "messages",
    title: "Team Communication",
    description: "Stay connected with your volunteers through the messaging system. Send updates, answer questions, and coordinate with your team.",
    targetSelector: '[data-testid="nav-tab-messages"], [data-testid="menu-messages"]',
    actions: ["View your messages", "Send updates to volunteers"],
    userType: "organization",
  },
  {
    id: "notifications",
    title: "Stay Updated",
    description: "Receive notifications for new applications, task completions, milestone achievements, and important updates. Never miss an important event.",
    targetSelector: '[data-testid="notifications-button"]',
    actions: ["Check your notifications", "Respond to pending items"],
    userType: "organization",
  },
  {
    id: "settings",
    title: "Profile & Settings",
    description: "Customize your organization profile, manage team members, and configure notification preferences. Access all settings from the menu.",
    targetSelector: '[data-testid="more-menu-button"], [data-testid="profile-avatar"]',
    actions: ["Open settings menu", "Update organization profile", "Manage team members"],
    userType: "organization",
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Start creating projects, inviting volunteers, and tracking your organization's impact. You can restart this guide anytime from your profile settings.",
    actions: ["Create your first project", "Invite volunteers", "Explore your dashboard"],
    userType: "organization",
  },
];

export const csrOnboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Synerxus CSR!",
    description: "Your corporate social responsibility command center. Track employee volunteering, measure impact, and demonstrate your company's commitment to sustainable development.",
    userType: "corporate-partner" as any,
  },
  {
    id: "dashboard-kpis",
    title: "CSR Key Performance Indicators",
    description: "Monitor real-time metrics: active employees volunteering, total hours contributed, economic value generated, and ROI on your CSR investment. Click any KPI for detailed breakdowns.",
    targetSelector: '[data-testid="kpi-total-hours"], [data-testid="csr-kpi-hours"]',
    actions: ["Explore KPI details", "Track month-over-month progress"],
    userType: "corporate-partner" as any,
  },
  {
    id: "sdg-alignment",
    title: "SDG Impact Alignment",
    description: "See how your employee volunteer hours align with UN Sustainable Development Goals. Track contributions across all 17 SDGs and demonstrate your company's global impact.",
    targetSelector: '[data-testid="chart-sdg-alignment"], [data-testid="sdg-section"]',
    actions: ["View SDG distribution", "Identify focus areas"],
    userType: "corporate-partner" as any,
  },
  {
    id: "employee-engagement",
    title: "Employee Engagement Funnel",
    description: "Track your employees' journey from signup to active volunteering. Identify opportunities to boost participation and engagement across your organization.",
    targetSelector: '[data-testid="chart-employee-funnel"], [data-testid="engagement-section"]',
    actions: ["Analyze engagement stages", "Identify improvement areas"],
    userType: "corporate-partner" as any,
  },
  {
    id: "leaderboard",
    title: "Employee Leaderboard",
    description: "Recognize your top volunteer contributors. See who's leading in hours and impact. Use gamification to encourage friendly competition.",
    targetSelector: '[data-testid="csr-leaderboard"], [data-testid="leaderboard-section"]',
    actions: ["View top performers", "Recognize achievements"],
    userType: "corporate-partner" as any,
  },
  {
    id: "geographic-map",
    title: "Geographic Impact Map",
    description: "Visualize where your employees are making a difference globally. See project locations and volunteer participation by region.",
    targetSelector: '[data-testid="chart-geographic-impact"], [data-testid="map-section"]',
    actions: ["Explore global impact", "Filter by region"],
    userType: "corporate-partner" as any,
  },
  {
    id: "navigation",
    title: "Explore More Features",
    description: "Use the navigation menu to access Projects, Impact Reports, Team management, and Settings. Each section helps you manage your CSR program effectively.",
    targetSelector: '[data-testid="nav-csr-projects"], [data-testid="csr-nav-dashboard"]',
    actions: ["Navigate to Projects", "View Impact Reports", "Manage Team"],
    userType: "corporate-partner" as any,
  },
  {
    id: "impact-reports",
    title: "Generate CSR Impact Reports",
    description: "Create professional impact reports for stakeholders and sustainability disclosures. Export as branded PDFs with charts, metrics, and employee stories.",
    targetSelector: '[data-testid="nav-csr-reports"], [data-testid="csr-nav-reports"]',
    actions: ["Navigate to Reports", "Generate a report", "Export to PDF"],
    userType: "corporate-partner" as any,
  },
  {
    id: "complete",
    title: "Ready to Drive CSR Impact!",
    description: "Start tracking your corporate volunteering program, engaging employees, and demonstrating your company's commitment to social responsibility. Restart this guide anytime from settings.",
    actions: ["Explore your dashboard", "Set CSR goals", "Generate your first report"],
    userType: "corporate-partner" as any,
  },
];

// ============================================
// STREAMLINED ONBOARDING STEPS (Minimal variant - A/B Test)
// Focuses on 4-5 essential steps for faster onboarding
// ============================================

export const volunteerOnboardingStepsMinimal: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Synerxus!",
    description: "Let's get you started in under 2 minutes. We'll show you the key features to make an impact.",
    userType: "volunteer",
  },
  {
    id: "dashboard-quick",
    title: "Your Dashboard",
    description: "This is your home base. Track your hours, see active projects, and monitor your impact score - all at a glance.",
    targetSelector: '[data-testid="kpi-hours"]',
    actions: ["Explore your metrics"],
    userType: "volunteer",
  },
  {
    id: "discover-apply",
    title: "Find & Apply",
    description: "Discover volunteer opportunities that match your skills. Click any opportunity to learn more and apply.",
    targetSelector: '[data-testid="volunteer-nav-discover"], [data-testid="nav-discover"]',
    actions: ["Browse opportunities"],
    userType: "volunteer",
  },
  {
    id: "log-track",
    title: "Log Your Hours",
    description: "After volunteering, log your hours here. This tracks your contributions and generates impact reports.",
    targetSelector: '[data-testid="volunteer-nav-profile-menu"], [data-testid="button-pwa-menu"]',
    actions: ["Access Log Activity from menu"],
    userType: "volunteer",
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Start exploring opportunities and making an impact. Your profile menu has all the tools you need.",
    actions: ["Discover opportunities", "Complete your profile"],
    userType: "volunteer",
  },
];

export const organizationOnboardingStepsMinimal: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Synerxus!",
    description: "Let's get your organization set up in under 2 minutes. We'll cover the essentials.",
    userType: "organization",
  },
  {
    id: "dashboard-quick",
    title: "Your Dashboard",
    description: "Monitor volunteer activity, project status, and impact metrics - all in one place.",
    targetSelector: '[data-testid="nav-tab-dashboard"]',
    actions: ["View your KPIs"],
    userType: "organization",
  },
  {
    id: "manage-projects",
    title: "Manage Projects",
    description: "Create projects, assign volunteers, and track progress from this central hub.",
    targetSelector: '[data-testid="nav-tab-projects"], [data-testid="menu-projects"]',
    actions: ["Create or view projects"],
    userType: "organization",
  },
  {
    id: "review-volunteers",
    title: "Review Applications",
    description: "When volunteers apply, review their profiles and accept them to your projects.",
    targetSelector: '[data-testid="nav-tab-applications"], [data-testid="menu-applications"]',
    actions: ["Check pending applications"],
    userType: "organization",
  },
  {
    id: "complete",
    title: "You're Ready!",
    description: "Start creating projects and building your volunteer team. Use the menu for all features.",
    actions: ["Create your first project"],
    userType: "organization",
  },
];

export const csrOnboardingStepsMinimal: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Synerxus CSR!",
    description: "Quick setup for your corporate volunteering dashboard. Let's cover the key features.",
    userType: "corporate-partner" as any,
  },
  {
    id: "dashboard-quick",
    title: "CSR Dashboard",
    description: "Track employee participation, total hours, and ROI - your complete CSR command center.",
    targetSelector: '[data-testid="kpi-total-hours"], [data-testid="csr-kpi-hours"]',
    actions: ["Explore your metrics"],
    userType: "corporate-partner" as any,
  },
  {
    id: "sdg-overview",
    title: "SDG Impact",
    description: "See how employee volunteering aligns with UN Sustainable Development Goals.",
    targetSelector: '[data-testid="chart-sdg-alignment"], [data-testid="sdg-section"]',
    actions: ["View SDG breakdown"],
    userType: "corporate-partner" as any,
  },
  {
    id: "reports-quick",
    title: "Generate Reports",
    description: "Create professional CSR reports for stakeholders with one click.",
    targetSelector: '[data-testid="nav-csr-reports"], [data-testid="csr-nav-reports"]',
    actions: ["Access reports"],
    userType: "corporate-partner" as any,
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Start tracking your CSR program. Use the navigation to explore all features.",
    actions: ["Explore your dashboard"],
    userType: "corporate-partner" as any,
  },
];

// Helper to get steps based on variant
export function getOnboardingSteps(
  userType: 'volunteer' | 'organization' | 'corporate-partner',
  variant: 'full' | 'minimal' = 'full'
): OnboardingStep[] {
  if (variant === 'minimal') {
    switch (userType) {
      case 'volunteer':
        return volunteerOnboardingStepsMinimal;
      case 'organization':
        return organizationOnboardingStepsMinimal;
      case 'corporate-partner':
        return csrOnboardingStepsMinimal;
      default:
        return volunteerOnboardingStepsMinimal;
    }
  }

  // Full variant
  switch (userType) {
    case 'volunteer':
      return volunteerOnboardingSteps;
    case 'organization':
      return organizationOnboardingSteps;
    case 'corporate-partner':
      return csrOnboardingSteps;
    default:
      return volunteerOnboardingSteps;
  }
}
