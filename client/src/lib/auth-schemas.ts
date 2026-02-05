import { z } from "zod";

// ============================================================================
// AUTH SCHEMAS - Centralized Zod validation for auth forms
// ============================================================================

/**
 * Login form schema - email and password only
 */
export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Base signup schema - common fields for all user types
 */
export const signupBaseSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type SignupBaseFormData = z.infer<typeof signupBaseSchema>;

/**
 * User type enum matching backend
 */
export const UserTypes = {
  VOLUNTEER: "volunteer",
  ORGANIZATION: "organization",
  CORPORATE_PARTNER: "corporate-partner",
} as const;

export type UserType = typeof UserTypes[keyof typeof UserTypes];

/**
 * Validate user type string
 */
export function isValidUserType(type: string): type is UserType {
  return Object.values(UserTypes).includes(type as UserType);
}

/**
 * Get display name for user type
 */
export function getUserTypeDisplayName(type: UserType): string {
  switch (type) {
    case UserTypes.VOLUNTEER:
      return "Volunteer";
    case UserTypes.ORGANIZATION:
      return "Organization";
    case UserTypes.CORPORATE_PARTNER:
      return "Corporate Partner";
    default:
      return "User";
  }
}

/**
 * Get signup route for user type
 */
export function getSignupRoute(type: UserType): string {
  switch (type) {
    case UserTypes.VOLUNTEER:
      return "/signup/volunteer";
    case UserTypes.ORGANIZATION:
      return "/signup/organization";
    case UserTypes.CORPORATE_PARTNER:
      return "/signup/corporate";
    default:
      return "/signup";
  }
}

/**
 * Get dashboard route for user type (all go to unified dashboard now)
 */
export function getDashboardRoute(_type?: UserType): string {
  return "/dashboard";
}
