import { OnboardingStep } from "../client/src/contexts/onboarding-context";

export const volunteerOnboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Synerxus!",
    description: "Let's get you started on your volunteer journey. This quick guide will show you the key features.",
    userType: "volunteer",
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    description: "View your impact metrics, active projects, and quick stats all in one place. This is your volunteer hub.",
    targetSelector: '[data-testid="dashboard-kpis"]',
    userType: "volunteer",
  },
  {
    id: "opportunities",
    title: "Find Opportunities",
    description: "Discover volunteer opportunities that match your skills and interests. Start making an impact today!",
    targetSelector: '[data-testid="nav-find-opportunities"]',
    actions: ["Click to explore"],
    userType: "volunteer",
  },
  {
    id: "log-activity",
    title: "Log Your Activity",
    description: "Record your volunteer hours and impact. This helps track your contributions and generate impact reports.",
    targetSelector: '[data-testid="nav-log-activity"]',
    actions: ["Start logging"],
    userType: "volunteer",
  },
  {
    id: "impact",
    title: "Track Your Impact",
    description: "See visualizations of your impact, contributions, and progress toward SDG goals.",
    targetSelector: '[data-testid="nav-my-impact"]',
    actions: ["View impact"],
    userType: "volunteer",
  },
  {
    id: "profile",
    title: "Build Your Profile",
    description: "Complete your profile to help organizations find the perfect match for you.",
    targetSelector: '[data-testid="nav-profile"]',
    actions: ["Complete profile"],
    userType: "volunteer",
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Start exploring and making a difference. Remember, you can always restart this guide from your settings.",
    userType: "volunteer",
  },
];

export const organizationOnboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Synerxus!",
    description: "Let's get your organization set up to manage volunteers and track impact effectively.",
    userType: "organization",
  },
  {
    id: "dashboard",
    title: "Organization Dashboard",
    description: "Monitor your KPIs, volunteer team, and projects. This is your command center for managing impact.",
    targetSelector: '[data-testid="dashboard-kpis"]',
    userType: "organization",
  },
  {
    id: "projects",
    title: "Create & Manage Projects",
    description: "Set up projects and tasks to organize your volunteer work and track progress.",
    targetSelector: '[data-testid="nav-projects-&-tasks"]',
    actions: ["Manage projects"],
    userType: "organization",
  },
  {
    id: "volunteers",
    title: "Manage Volunteers",
    description: "View your volunteer team, their contributions, and assign them to tasks.",
    targetSelector: '[data-testid="nav-volunteers"]',
    actions: ["View team"],
    userType: "organization",
  },
  {
    id: "impact",
    title: "Track Organization Impact",
    description: "Visualize your organization's impact, SDG alignment, and volunteer contributions.",
    targetSelector: '[data-testid="nav-impact-visualization"]',
    actions: ["View impact"],
    userType: "organization",
  },
  {
    id: "reports",
    title: "Generate Impact Reports",
    description: "Create comprehensive reports to share your organization's impact with stakeholders.",
    targetSelector: '[data-testid="dashboard-reports"]',
    actions: ["Create report"],
    userType: "organization",
  },
  {
    id: "complete",
    title: "You're Ready to Go!",
    description: "Start managing your volunteers and creating impact. Visit settings anytime to restart this guide.",
    userType: "organization",
  },
];
