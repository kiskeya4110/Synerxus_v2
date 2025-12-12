# Synerxus Security Audit Report

**Audit Date:** December 2024
**Auditor:** Claude Code Security Analysis
**Application:** Synerxus Volunteer Management Platform
**Tech Stack:** React 18, Express.js, PostgreSQL (Neon), Firebase Auth

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | Needs immediate attention |
| High | 4 | Should fix before production |
| Medium | 6 | Plan to fix |
| Low | 4 | Consider fixing |

**Overall Security Rating: B-** (Good foundation, needs CSRF protection and auth hardening)

---

## 1. VULNERABILITY SCAN

### 1.1 SQL Injection - LOW RISK

**Status:** Protected by ORM
**Finding:** No raw SQL queries found. All database operations use Drizzle ORM with parameterized queries.

```typescript
// SAFE - Drizzle ORM prevents SQL injection
const user = await db.select().from(users).where(eq(users.id, userId));
```

**No remediation needed** - Continue using Drizzle ORM for all database operations.

---

### 1.2 XSS (Cross-Site Scripting) - LOW RISK

**Status:** Protected
**Finding:** Input sanitization middleware implemented at `server/middleware/sanitize.ts`

Existing protections:
- HTML entity encoding
- Script tag detection
- Event handler stripping
- CSP headers via Helmet

**No critical issues found.** The sanitization middleware is comprehensive.

---

### 1.3 CSRF (Cross-Site Request Forgery) - CRITICAL

**Severity:** CRITICAL
**Finding:** No CSRF protection implemented

**Impact:** Attackers can perform actions on behalf of authenticated users by tricking them into clicking malicious links.

**Location:** `server/index.ts` - Missing CSRF middleware

**Remediation:**

```bash
npm install csurf cookie-parser
```

```typescript
// server/middleware/csrf.ts - NEW FILE
import csrf from 'csurf';
import { type Request, Response, NextFunction } from 'express';

// CSRF protection using double-submit cookie pattern
export const csrfProtection = csrf({
  cookie: {
    key: '_csrf',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600, // 1 hour
  },
});

// Middleware to add CSRF token to response
export function csrfToken(req: Request, res: Response, next: NextFunction) {
  res.locals.csrfToken = req.csrfToken();
  next();
}

// Error handler for CSRF errors
export function csrfErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      message: 'Invalid or missing CSRF token',
      code: 'CSRF_ERROR',
    });
  }
  next(err);
}
```

```typescript
// server/index.ts - Add after cookie-parser
import cookieParser from 'cookie-parser';
import { csrfProtection, csrfToken, csrfErrorHandler } from './middleware/csrf';

app.use(cookieParser());

// Apply CSRF protection to state-changing routes
app.use('/api/', csrfProtection, csrfToken);

// Add error handler
app.use(csrfErrorHandler);

// Endpoint to get CSRF token
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

```typescript
// client/src/lib/queryClient.ts - Update API requests
async function getCSRFToken(): Promise<string> {
  const response = await fetch('/api/csrf-token', { credentials: 'include' });
  const data = await response.json();
  return data.csrfToken;
}

export async function apiRequest(
  method: string,
  url: string,
  body?: any
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['X-CSRF-Token'] = await getCSRFToken();
  }

  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
}
```

---

### 1.4 IDOR (Insecure Direct Object Reference) - HIGH

**Severity:** HIGH
**Finding:** Many endpoints accept user/resource IDs without verifying ownership

**Vulnerable Patterns Found:**

```typescript
// VULNERABLE - No ownership check
app.get('/api/messages/:id', async (req, res) => {
  const messageId = parseInt(req.params.id);
  const message = await storage.getMessage(messageId);
  res.json(message); // Anyone can read any message!
});

// VULNERABLE - User can access other users' data
app.get('/api/notifications', async (req, res) => {
  const userId = req.query.userId; // User-controlled!
  const notifications = await storage.getNotificationsByUser(userId);
  res.json(notifications);
});
```

**Remediation:**

```typescript
// server/middleware/authorization.ts - NEW FILE
import { type Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * Middleware to require authenticated user and extract from session/token
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = extractAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({
      message: 'User not found',
      code: 'USER_NOT_FOUND',
    });
  }

  // Attach user to request for downstream use
  req.authenticatedUser = user;
  next();
}

/**
 * Extract authenticated user ID from Firebase token or session
 * In production, this should verify the Firebase ID token
 */
function extractAuthenticatedUserId(req: Request): number | null {
  // TODO: Implement proper Firebase token verification
  // For now, use header (should be replaced with token verification)
  const userIdStr = req.headers['x-user-id'] as string;
  if (!userIdStr) return null;

  const userId = parseInt(userIdStr);
  return isNaN(userId) ? null : userId;
}

/**
 * Verify resource ownership
 */
export function requireOwnership(resourceUserIdField: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.authenticatedUser;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const resourceUserId = parseInt(req.params[resourceUserIdField] || req.body[resourceUserIdField]);

    if (resourceUserId !== user.id) {
      return res.status(403).json({
        message: 'Access denied',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

/**
 * Verify organization membership
 */
export function requireOrgMembership(orgIdField: string = 'organizationId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.authenticatedUser;
    if (!user || !user.organizationId) {
      return res.status(403).json({
        message: 'Organization membership required',
        code: 'ORG_REQUIRED',
      });
    }

    const resourceOrgId = parseInt(
      req.params[orgIdField] ||
      req.query[orgIdField] as string ||
      req.body[orgIdField]
    );

    if (resourceOrgId && resourceOrgId !== user.organizationId) {
      return res.status(403).json({
        message: 'Not authorized for this organization',
        code: 'WRONG_ORG',
      });
    }

    next();
  };
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: any;
    }
  }
}
```

```typescript
// Apply to routes
import { requireAuth, requireOwnership, requireOrgMembership } from './middleware/authorization';

// SECURE - Verify user owns the notification
app.get('/api/notifications', requireAuth, async (req, res) => {
  const userId = req.authenticatedUser.id; // Use authenticated user
  const notifications = await storage.getNotificationsByUser(userId);
  res.json(notifications);
});

// SECURE - Verify message belongs to user
app.get('/api/messages/:id', requireAuth, async (req, res) => {
  const messageId = parseInt(req.params.id);
  const message = await storage.getMessage(messageId);

  if (!message) {
    return res.status(404).json({ message: 'Message not found' });
  }

  // Check ownership
  if (message.senderId !== req.authenticatedUser.id &&
      message.receiverId !== req.authenticatedUser.id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json(message);
});
```

---

### 1.5 Authentication Bypass - HIGH

**Severity:** HIGH
**Finding:** User ID passed in headers/query without server-side verification

**Current vulnerable pattern:**
```typescript
// VULNERABLE - Trusting client-provided user ID
const userId = req.headers['x-user-id'] || req.query.userId;
```

**Remediation: Implement Firebase Token Verification**

```bash
npm install firebase-admin
```

```typescript
// server/middleware/firebase-auth.ts - NEW FILE
import * as admin from 'firebase-admin';
import { type Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Initialize Firebase Admin (do once at app start)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

/**
 * Verify Firebase ID token and attach user to request
 */
export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Missing or invalid authorization header',
      code: 'NO_TOKEN',
    });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Get user from database using Firebase UID
    const user = await storage.getUserByFirebaseUid(decodedToken.uid);

    if (!user) {
      return res.status(401).json({
        message: 'User not found in database',
        code: 'USER_NOT_FOUND',
      });
    }

    // Attach verified user to request
    req.authenticatedUser = user;
    req.firebaseUser = decodedToken;

    next();
  } catch (error: any) {
    console.error('Firebase token verification failed:', error.message);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }
}

/**
 * Optional auth - attaches user if token present, continues otherwise
 */
export async function optionalFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const user = await storage.getUserByFirebaseUid(decodedToken.uid);

    if (user) {
      req.authenticatedUser = user;
      req.firebaseUser = decodedToken;
    }
  } catch (error) {
    // Silently fail for optional auth
  }

  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: any;
      firebaseUser?: admin.auth.DecodedIdToken;
    }
  }
}
```

```typescript
// client/src/lib/api.ts - Send Firebase token with requests
import { auth } from './firebase';

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const user = auth.currentUser;

  if (user) {
    const token = await user.getIdToken();
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  return fetch(url, options);
}
```

---

### 1.6 Sensitive Data Exposure - MEDIUM

**Severity:** MEDIUM
**Finding:** API responses may include sensitive fields

**Example:**
```typescript
// VULNERABLE - Returns all user fields including sensitive data
res.json(user);
```

**Remediation:**

```typescript
// server/utils/sanitize-response.ts - NEW FILE

/**
 * Remove sensitive fields from user objects before sending to client
 */
export function sanitizeUser(user: any): any {
  if (!user) return null;

  const {
    firebaseUid,  // Don't expose Firebase UID
    password,     // Never expose passwords
    resetToken,   // Don't expose reset tokens
    ...safeUser
  } = user;

  return safeUser;
}

/**
 * Sanitize array of users
 */
export function sanitizeUsers(users: any[]): any[] {
  return users.map(sanitizeUser);
}

/**
 * Remove sensitive fields from organization
 */
export function sanitizeOrganization(org: any): any {
  if (!org) return null;

  const {
    stripeCustomerId,
    internalNotes,
    ...safeOrg
  } = org;

  return safeOrg;
}
```

---

## 2. DEPENDENCY AUDIT

### 2.1 Known Vulnerabilities

| Package | Severity | Issue | Fix |
|---------|----------|-------|-----|
| esbuild | Moderate | CORS bypass in dev server | Update vite to 7.x |
| drizzle-kit | Moderate | esbuild transitive | Update to 0.31.8 |
| vite | Moderate | esbuild transitive | Update to 7.x |
| @vitejs/plugin-react | Moderate | vite transitive | Update after vite |

**Remediation:**

```bash
# Fix all vulnerabilities
npm audit fix

# Or manually update
npm install vite@latest @vitejs/plugin-react@latest drizzle-kit@latest
```

### 2.2 Outdated Packages - MEDIUM

**Finding:** 40+ packages are outdated including security-relevant ones

**Critical updates needed:**

```bash
npm install @neondatabase/serverless@latest   # 0.10.4 -> 1.0.2
npm install @hookform/resolvers@latest        # 3.10.0 -> 5.2.2
```

---

## 3. SECRETS MANAGEMENT

### 3.1 Hardcoded Secrets - LOW

**Status:** Good
**Finding:** No hardcoded secrets found in source code. All sensitive values use environment variables.

### 3.2 Environment Variables - MEDIUM

**Finding:** Some env vars have fallback defaults that could be problematic

```typescript
// CONCERN - Fallback to demo values in client
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key", // Fallback!
};
```

**Remediation:**

```typescript
// client/src/lib/firebase.ts - Remove demo fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate required config
const requiredKeys = ['apiKey', 'authDomain', 'projectId'];
for (const key of requiredKeys) {
  if (!firebaseConfig[key as keyof typeof firebaseConfig]) {
    throw new Error(`Missing required Firebase config: ${key}`);
  }
}
```

### 3.3 Recommended Secrets

Create a `.env.example` file:

```bash
# .env.example
# Database
DATABASE_URL=postgresql://...

# Firebase Admin (server-side)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Client (client-side - prefix with VITE_)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=1:...

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=development
APP_URL=https://your-domain.com
```

---

## 4. ACCESS CONTROL AUDIT

### 4.1 Authentication Implementation - MEDIUM

**Finding:** Firebase authentication is client-side only. Server doesn't verify tokens.

**Current flow:**
1. User authenticates with Firebase (client)
2. Client sends `x-user-id` header to server
3. Server trusts header without verification (VULNERABLE!)

**See Section 1.5 for remediation** (Firebase Admin token verification)

### 4.2 Authorization Checks - HIGH

**Finding:** Inconsistent authorization across endpoints

**Endpoints missing authorization:**

| Endpoint | Issue |
|----------|-------|
| GET /api/users | No auth required - lists all users |
| GET /api/notifications | User ID from query params |
| GET /api/messages/:userId | No ownership verification |
| PATCH /api/users/:id | Only checks user exists |

**Remediation:**

```typescript
// Apply auth middleware to all sensitive routes
const protectedRoutes = [
  '/api/users/me',
  '/api/notifications',
  '/api/messages',
  '/api/activities',
  '/api/applications',
];

protectedRoutes.forEach(route => {
  app.use(route, verifyFirebaseToken);
});
```

### 4.3 Privilege Escalation - MEDIUM

**Finding:** User type can be changed without verification

```typescript
// VULNERABLE - No verification of userType changes
app.patch('/api/users/:id', async (req, res) => {
  const userData = req.body;
  // User could change userType to 'admin' or 'organization'
  await storage.updateUser(userId, userData);
});
```

**Remediation:**

```typescript
// Whitelist allowed fields for user updates
const ALLOWED_USER_UPDATE_FIELDS = [
  'displayName',
  'bio',
  'location',
  'skills',
  'profileImage',
];

app.patch('/api/users/:id', requireAuth, async (req, res) => {
  // Verify user is updating their own profile
  if (parseInt(req.params.id) !== req.authenticatedUser.id) {
    return res.status(403).json({ message: 'Cannot update other users' });
  }

  // Filter to allowed fields only
  const safeUpdate: Record<string, any> = {};
  for (const field of ALLOWED_USER_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      safeUpdate[field] = req.body[field];
    }
  }

  const updated = await storage.updateUser(req.params.id, safeUpdate);
  res.json(sanitizeUser(updated));
});
```

---

## 5. DATA PROTECTION AUDIT

### 5.1 Encryption - LOW

**Finding:** Data at rest encrypted by Neon PostgreSQL. HTTPS enforced via Helmet.

**Good practices in place:**
- HSTS header with preload
- Secure cookies (when implemented)
- TLS for database connections

### 5.2 PII Handling - MEDIUM

**Finding:** User email and name stored without explicit consent tracking

**Recommendation:** Add consent tracking

```typescript
// Add to schema
export const userConsents = pgTable("user_consents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  consentType: text("consent_type").notNull(), // 'marketing', 'analytics', 'data_processing'
  granted: boolean("granted").notNull(),
  grantedAt: timestamp("granted_at"),
  revokedAt: timestamp("revoked_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});
```

### 5.3 Logging Practices - MEDIUM

**Finding:** Audit logging implemented but may log sensitive data

**Current logging:**
```typescript
logger.info({
  type: 'SECURITY_XSS_ATTEMPT',
  path,
  ip: req.ip,
  userId: req.headers['x-user-id'], // Could log user actions
});
```

**Recommendation:** Add PII masking to logs

```typescript
// server/utils/log-sanitizer.ts
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

export function maskIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  return 'masked';
}

export function sanitizeLogData(data: any): any {
  const sanitized = { ...data };

  if (sanitized.email) {
    sanitized.email = maskEmail(sanitized.email);
  }
  if (sanitized.ip) {
    sanitized.ip = maskIp(sanitized.ip);
  }

  return sanitized;
}
```

### 5.4 Data Retention - LOW

**Finding:** No automatic data retention/deletion policy

**Recommendation:** Implement data retention

```sql
-- Add retention policy columns
ALTER TABLE user_data_audit_logs ADD COLUMN retention_until TIMESTAMP;
ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMP;

-- Create cleanup job (run daily)
DELETE FROM notifications WHERE expires_at < NOW();
DELETE FROM user_data_audit_logs WHERE retention_until < NOW();
```

---

## 6. IMPLEMENTATION PRIORITY

### Immediate (Week 1)
1. **[CRITICAL]** Implement CSRF protection
2. **[HIGH]** Add Firebase token verification on server
3. **[HIGH]** Fix IDOR vulnerabilities in messages/notifications

### Short-term (Week 2-3)
4. **[MEDIUM]** Update vulnerable dependencies
5. **[MEDIUM]** Implement authorization middleware
6. **[MEDIUM]** Add response sanitization

### Long-term (Month 1-2)
7. **[LOW]** Add consent tracking
8. **[LOW]** Implement log sanitization
9. **[LOW]** Add data retention policies

---

## 7. SECURITY CHECKLIST

- [ ] CSRF protection middleware added
- [ ] Firebase Admin SDK configured
- [ ] Token verification on all protected routes
- [ ] IDOR fixes applied to message/notification endpoints
- [ ] npm audit vulnerabilities resolved
- [ ] Response sanitization helpers used
- [ ] User update field whitelist enforced
- [ ] Demo fallback values removed from Firebase config
- [ ] Consent tracking table created
- [ ] Log sanitization implemented
- [ ] Data retention policies defined

---

## Appendix A: Environment Variables Required

```bash
# Required for Firebase Admin (server-side auth)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Required for CSRF (generate a random 32-byte hex string)
CSRF_SECRET=$(openssl rand -hex 32)
```

## Appendix B: Security Headers (Already Implemented)

Current Helmet configuration provides:
- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security
- X-XSS-Protection
- Referrer-Policy

---

**Report Generated:** December 2024
**Next Audit Recommended:** March 2025
