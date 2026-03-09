import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react";
import {
  User,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

// Database user type from backend
interface DbUser {
  id: number;
  firebaseUid: string;
  email: string;
  displayName: string;
  username: string;
  userType: string;
  isAdmin: boolean;
  profileImageUrl?: string;
  createdAt: string;
}

// Sync response from /api/users/firebase-sync
interface SyncResponse {
  user: DbUser;
  isNewUser: boolean;
}

interface AuthContextType {
  user: User | null;
  dbUser: DbUser | null;
  loading: boolean;
  isNewUser: boolean;
  signInWithGoogle: (userType?: string) => Promise<{ user: User; isNewUser: boolean } | null>;
  signInWithEmail: (email: string, password: string) => Promise<User | null>;
  signUp: (email: string, password: string, userType?: string, displayName?: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  syncWithBackend: (firebaseUser: User, userType?: string, displayName?: string) => Promise<SyncResponse | null>;
  clearNewUserFlag: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const { toast } = useToast();
  // Prevents onAuthStateChanged from overwriting state during demo login
  const ignoreNextNullAuthRef = useRef(false);

  /**
   * Restore demo user from stored JWT token (used on page load when no Firebase session exists).
   * If no token is available, the session is stale and gets cleared to force re-login.
   */
  const restoreDemoUser = useCallback(async () => {
    const storedToken = localStorage.getItem('authToken');
    if (!storedToken) {
      // No JWT stored — clear stale demo session so user is sent to login
      localStorage.removeItem('sessionType');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('userType');
      return;
    }
    try {
      const response = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${storedToken}` },
      });
      if (response.ok) {
        const userData = await response.json();
        setDbUser(userData);
      } else {
        // Token is expired/invalid — clear demo session
        localStorage.removeItem('sessionType');
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('userType');
      }
    } catch (err) {
      console.error('[Auth] Failed to restore demo user:', err);
    }
  }, []);

  /**
   * Sync Firebase user with backend database
   * - For new users: Creates user in DB with userType
   * - For existing users: Returns existing DB user
   */
  const syncWithBackend = useCallback(async (
    firebaseUser: User,
    userType?: string,
    displayName?: string
  ): Promise<SyncResponse | null> => {
    try {
      // Get Firebase ID token for authentication
      const idToken = await firebaseUser.getIdToken();

      const response = await fetch("/api/users/firebase-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: displayName || firebaseUser.displayName || firebaseUser.email?.split("@")[0],
          userType: userType,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Sync failed" }));
        throw new Error(error.message || "Failed to sync with backend");
      }

      const data = await response.json();

      // Backend returns user data directly, not nested under 'user'
      const user = data.user || data;
      const isNewUser = data.isNewUser ?? false;

      // Update local state
      setDbUser(user);
      setIsNewUser(isNewUser);

      // Store in localStorage for persistence
      localStorage.setItem("currentUserId", String(user.id));
      localStorage.setItem("userType", user.userType);
      localStorage.setItem("sessionType", "firebase");

      // Store JWT token for authenticated API calls (used as fallback when Firebase is unavailable)
      if (data.jwtToken) {
        localStorage.setItem("authToken", data.jwtToken);
      }

      return { user, isNewUser };
    } catch (error) {
      console.error("Backend sync error:", error);
      // Don't show toast here - let the caller handle the error display
      return null;
    }
  }, []);

  // Clear new user flag (after role selection dialog is handled)
  const clearNewUserFlag = useCallback(() => {
    setIsNewUser(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // When demo login signs out of Firebase to clear a stale session,
      // skip this null state change to avoid overwriting the demo user
      if (!firebaseUser && ignoreNextNullAuthRef.current) {
        ignoreNextNullAuthRef.current = false;
        setLoading(false);
        return;
      }

      const sessionType = localStorage.getItem("sessionType");

      if (firebaseUser) {
        // FIREWALL: If a demo session is active, a Firebase auth event means a stale
        // session from a different user was detected. Sign it out and keep the demo user.
        if (sessionType === "demo") {
          console.log("[Auth] Stale Firebase session detected during demo session — clearing Firebase.");
          ignoreNextNullAuthRef.current = true;
          try { await firebaseSignOut(auth); } catch (_) { ignoreNextNullAuthRef.current = false; }
          await restoreDemoUser();
          setLoading(false);
          return;
        }

        setUser(firebaseUser);
        // Try to sync with backend to get DB user
        // Don't pass userType here - just check if user exists
        const syncResult = await syncWithBackend(firebaseUser);
        if (syncResult) {
          setDbUser(syncResult.user);
        }
      } else {
        setUser(null);
        // If a demo session is stored, restore from JWT rather than clearing the user
        if (sessionType === "demo") {
          await restoreDemoUser();
        } else {
          setDbUser(null);
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [syncWithBackend, restoreDemoUser]);

  const signInWithGoogle = async (userType?: string) => {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      // Sync with backend to check if user exists
      const syncResult = await syncWithBackend(result.user, userType);

      if (syncResult) {
        // Return both the Firebase user and whether they're new
        return { user: result.user, isNewUser: syncResult.isNewUser };
      }

      // If sync failed but Firebase auth succeeded, still return user
      return { user: result.user, isNewUser: true };
    } catch (error) {
      console.error("Error signing in with Google:", error);
      toast({
        title: "Authentication Error",
        description: "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    console.log("[Auth] signInWithEmail called for:", email);

    // Helper to add timeout to promises
    const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
      ]);
    };

    try {
      console.log("[Auth] Calling Firebase signInWithEmailAndPassword...");
      const result = await withTimeout(
        signInWithEmailAndPassword(auth, email, password),
        10000,
        "Firebase authentication timed out"
      );
      console.log("[Auth] Firebase sign-in successful:", result.user.uid);

      // Sync with backend to get user data
      const syncResult = await syncWithBackend(result.user);

      if (!syncResult) {
        toast({
          title: "Account Not Found",
          description: "Please sign up first or check your credentials.",
          variant: "destructive",
        });
        // Sign out from Firebase if no backend user exists
        await firebaseSignOut(auth);
        throw new Error("No backend user found");
      }

      return result.user;
    } catch (error: any) {
      console.error("[Auth] Error signing in with email:", error.code, error.message, error);

      const errorCode = error?.code;

      // Check if Firebase is not configured, email auth not enabled, user doesn't exist, or timed out
      // This allows demo mode users (created directly in DB) to log in even with real Firebase config
      const shouldFallbackToDemo =
        errorCode === "auth/invalid-api-key" ||
        errorCode === "auth/configuration-not-found" ||
        errorCode === "auth/operation-not-allowed" ||
        errorCode === "auth/admin-restricted-operation" ||
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/invalid-credential" ||
        errorCode === "auth/network-request-failed" ||
        error?.message?.includes("demo-key") ||
        error?.message?.includes("invalid-api-key") ||
        error?.message?.includes("timed out");

      if (shouldFallbackToDemo) {
        console.log("[Auth] Firebase auth failed, trying backend lookup. Error:", errorCode || error?.message);

        try {
          // Try to find user by email in backend using firebase-sync with isLoginAttempt flag
          console.log("[Auth] Attempting backend login for:", email);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch("/api/users/firebase-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firebaseUid: `demo_login_${Date.now()}`,
              email,
              isLoginAttempt: true,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            // Check if it's an existing user (isNewUser: false)
            if (data && !data.isNewUser) {
              const user = data.user || data;
              // Sign out from Firebase first to clear any stale session from a different user.
              // Set the ignore flag so onAuthStateChanged(null) doesn't wipe our new user.
              ignoreNextNullAuthRef.current = true;
              try { await firebaseSignOut(auth); } catch (_) { ignoreNextNullAuthRef.current = false; }
              setDbUser(user);
              localStorage.setItem("currentUserId", String(user.id));
              localStorage.setItem("userType", user.userType || "volunteer");
              localStorage.setItem("sessionType", "demo");
              if (data.jwtToken) {
                localStorage.setItem("authToken", data.jwtToken);
              }
              console.log("[Auth] Demo login successful for existing user:", user.email);

              return {
                uid: user.firebaseUid || `demo_${user.id}`,
                email: user.email,
                displayName: user.displayName,
                getIdToken: async () => "demo-token",
              } as any;
            }
          }
        } catch (backendError: any) {
          console.error("[Auth] Backend lookup failed:", backendError.message);
        }

        toast({
          title: "Account Not Found",
          description: "No account found with this email. Please sign up first.",
          variant: "destructive",
        });
        throw new Error("No account found");
      }

      // Provide specific error messages based on Firebase error codes
      let errorMessage = "Failed to sign in. Please try again.";

      if (errorCode === "auth/user-not-found") {
        errorMessage = "No account found with this email. Please check your email or register first.";
      } else if (errorCode === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again or reset your password.";
      } else if (errorCode === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      } else if (errorCode === "auth/user-disabled") {
        errorMessage = "This account has been disabled. Please contact support.";
      } else if (errorCode === "auth/too-many-requests") {
        errorMessage = "Too many failed login attempts. Please try again later or reset your password.";
      } else if (errorCode === "auth/invalid-credential") {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      }

      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, userType?: string, displayName?: string) => {
    console.log("[Auth] signUp called for:", email, "userType:", userType);
    try {
      console.log("[Auth] Calling Firebase createUserWithEmailAndPassword...");
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log("[Auth] Firebase user created:", result.user.uid);

      // Sync with backend to create the user record
      console.log("[Auth] Syncing with backend...");
      const syncResult = await syncWithBackend(result.user, userType, displayName);
      console.log("[Auth] Backend sync result:", syncResult);

      if (!syncResult) {
        toast({
          title: "Registration Error",
          description: "Account created but failed to sync with server. Please contact support.",
          variant: "destructive",
        });
      }

      return result.user;
    } catch (error: any) {
      console.error("[Auth] Error signing up:", error.code, error.message);

      // Check if Firebase is not configured or email auth not enabled - fallback to direct backend creation
      const errorCode = error?.code;
      if (errorCode === "auth/invalid-api-key" || errorCode === "auth/configuration-not-found" ||
          errorCode === "auth/operation-not-allowed" || errorCode === "auth/admin-restricted-operation" ||
          error?.message?.includes("demo-key") || error?.message?.includes("invalid-api-key")) {
        console.log("[Auth] Firebase auth not available, using demo mode signup. Error:", errorCode);

        // Create user directly in backend without Firebase
        const demoUid = `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const response = await fetch("/api/users/firebase-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firebaseUid: demoUid,
            email,
            displayName: displayName || email.split("@")[0],
            userType,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setDbUser(data.user || data);
          localStorage.setItem("currentUserId", String(data.user?.id || data.id));
          localStorage.setItem("userType", userType || "volunteer");
          localStorage.setItem("sessionType", "demo");
          if (data.jwtToken) {
            localStorage.setItem("authToken", data.jwtToken);
          }

          // Return a mock user object for compatibility
          return {
            uid: demoUid,
            email,
            displayName: displayName || email.split("@")[0],
            getIdToken: async () => "demo-token",
          } as any;
        } else {
          const errorData = await response.json().catch(() => ({ message: "Registration failed" }));
          throw new Error(errorData.message || "Failed to create account");
        }
      }

      let errorMessage = "Failed to create account. Please try again.";

      if (errorCode === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      } else if (errorCode === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use at least 8 characters.";
      } else if (errorCode === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      } else if (errorCode === "auth/operation-not-allowed") {
        errorMessage = "Email/Password sign-in is not enabled. Please contact support.";
      } else if (errorCode === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your connection and try again.";
      }

      console.error("[Auth] Showing error toast:", errorMessage);
      toast({
        title: "Registration Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Clear local state
      setDbUser(null);
      setIsNewUser(false);
      // Clear all auth-related localStorage items
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('userType');
      localStorage.removeItem('authToken');
      localStorage.removeItem('sessionType');
      localStorage.removeItem('profileComplete');
      localStorage.removeItem('isNewSignup');
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('lastLoginTime');
      localStorage.removeItem('pendingOrganizationName');
      // Redirect to landing page after sign out
      window.location.href = '/';
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const value = {
    user,
    dbUser,
    loading,
    isNewUser,
    signInWithGoogle,
    signInWithEmail,
    signUp,
    signOut,
    syncWithBackend,
    clearNewUserFlag
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
