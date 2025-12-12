/**
 * Response Sanitization Utilities
 *
 * Remove sensitive fields from API responses before sending to clients.
 * Prevents accidental exposure of internal data, tokens, or PII.
 */

/**
 * Fields to always remove from user objects
 */
const SENSITIVE_USER_FIELDS = [
  'firebaseUid',
  'password',
  'passwordHash',
  'resetToken',
  'resetTokenExpiry',
  'verificationToken',
  'twoFactorSecret',
  'apiKey',
  'refreshToken',
];

/**
 * Fields to always remove from organization objects
 */
const SENSITIVE_ORG_FIELDS = [
  'stripeCustomerId',
  'stripeSubscriptionId',
  'internalNotes',
  'adminNotes',
  'apiKey',
  'webhookSecret',
];

/**
 * Remove sensitive fields from a user object
 */
export function sanitizeUser<T extends Record<string, any>>(user: T | null | undefined): Partial<T> | null {
  if (!user) return null;

  const sanitized = { ...user };

  for (const field of SENSITIVE_USER_FIELDS) {
    delete (sanitized as any)[field];
  }

  return sanitized;
}

/**
 * Sanitize an array of users
 */
export function sanitizeUsers<T extends Record<string, any>>(users: T[]): Partial<T>[] {
  return users.map(user => sanitizeUser(user)).filter((u): u is Partial<T> => u !== null);
}

/**
 * Remove sensitive fields from an organization object
 */
export function sanitizeOrganization<T extends Record<string, any>>(org: T | null | undefined): Partial<T> | null {
  if (!org) return null;

  const sanitized = { ...org };

  for (const field of SENSITIVE_ORG_FIELDS) {
    delete (sanitized as any)[field];
  }

  return sanitized;
}

/**
 * Sanitize an array of organizations
 */
export function sanitizeOrganizations<T extends Record<string, any>>(orgs: T[]): Partial<T>[] {
  return orgs.map(org => sanitizeOrganization(org)).filter((o): o is Partial<T> => o !== null);
}

/**
 * Generic sanitizer - removes specified fields from any object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T | null | undefined,
  fieldsToRemove: string[]
): Partial<T> | null {
  if (!obj) return null;

  const sanitized = { ...obj };

  for (const field of fieldsToRemove) {
    delete (sanitized as any)[field];
  }

  return sanitized;
}

/**
 * Deep sanitize - recursively remove sensitive fields from nested objects
 */
export function deepSanitize<T>(
  obj: T,
  fieldsToRemove: string[] = SENSITIVE_USER_FIELDS
): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item, fieldsToRemove)) as T;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive fields
      if (fieldsToRemove.includes(key)) {
        continue;
      }

      // Recursively sanitize nested objects
      sanitized[key] = deepSanitize(value, fieldsToRemove);
    }

    return sanitized as T;
  }

  return obj;
}

/**
 * Sanitize user with relations (e.g., user with organization)
 */
export function sanitizeUserWithRelations(
  user: Record<string, any> | null | undefined
): Record<string, any> | null {
  if (!user) return null;

  const sanitized = sanitizeUser(user);

  if (sanitized && (user as any).organization) {
    (sanitized as any).organization = sanitizeOrganization((user as any).organization);
  }

  return sanitized as Record<string, any>;
}

/**
 * Mask email address for display
 * john.doe@example.com -> j***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;

  const [local, domain] = email.split('@');
  if (local.length <= 1) return `*@${domain}`;

  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 3))}@${domain}`;
}

/**
 * Mask phone number for display
 * +1234567890 -> +1***890
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone;

  const visibleStart = phone.slice(0, 2);
  const visibleEnd = phone.slice(-3);

  return `${visibleStart}${'*'.repeat(phone.length - 5)}${visibleEnd}`;
}

/**
 * Mask IP address for logging
 * 192.168.1.100 -> 192.168.*.*
 */
export function maskIp(ip: string): string {
  if (!ip) return ip;

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
  }

  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return `${parts.slice(0, 4).join(':')}:*:*:*:*`;
    }
  }

  return 'masked';
}

/**
 * Create a public profile from user data
 * Only includes fields safe for public display
 */
export function toPublicProfile(user: Record<string, any> | null): Record<string, any> | null {
  if (!user) return null;

  return {
    id: user.id,
    displayName: user.displayName,
    userType: user.userType,
    profileImage: user.profileImage,
    bio: user.bio,
    location: user.location,
    skills: user.skills,
    createdAt: user.createdAt,
    // Explicitly exclude everything else
  };
}

/**
 * Create a list of public profiles
 */
export function toPublicProfiles(users: Record<string, any>[]): Record<string, any>[] {
  return users.map(toPublicProfile).filter((u): u is Record<string, any> => u !== null);
}

export default {
  sanitizeUser,
  sanitizeUsers,
  sanitizeOrganization,
  sanitizeOrganizations,
  sanitizeObject,
  deepSanitize,
  sanitizeUserWithRelations,
  maskEmail,
  maskPhone,
  maskIp,
  toPublicProfile,
  toPublicProfiles,
};
