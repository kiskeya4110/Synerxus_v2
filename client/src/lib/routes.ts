export const ROUTES = {
  // Auth
  LOGIN: "/login",
  SIGNUP: "/signup",
  LOGOUT: "/logout",

  // Root
  ROOT: "/",

  // Volunteer
  VOLUNTEER_DASHBOARD: "/volunteer-dashboard",
  VOLUNTEER_PROFILE: "/volunteer-profile",
  VOLUNTEER_IMPACT_WALLET: "/impact-wallet",
  VOLUNTEER_OPPORTUNITIES: "/opportunities",
  VOLUNTEER_CALENDAR: "/calendar",

  // Organization (NGO)
  NGO_DASHBOARD: "/ngo-dashboard",
  NGO_PROJECTS: "/projects",
  NGO_VOLUNTEERS: "/volunteers",
  NGO_IMPACT_LOGS: "/impact-logs",

  // CSR / Corporate
  CSR_DASHBOARD: "/csr-dashboard",
  CSR_REPORTS: "/csr-reports",

  // Admin
  ADMIN: "/admin",

  // Shared
  SETTINGS: "/settings",
  PROFILE: "/profile",
  NOT_FOUND: "/404",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
