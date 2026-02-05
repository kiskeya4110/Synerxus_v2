import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
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

      const data: SyncResponse = await response.json();

      // Update local state
      setDbUser(data.user);
      setIsNewUser(data.isNewUser);

      // Store in localStorage for persistence
      localStorage.setItem("currentUserId", String(data.user.id));
      localStorage.setItem("userType", data.user.userType);

      return data;
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
      setUser(firebaseUser);

      if (firebaseUser) {
        // Try to sync with backend to get DB user
        // Don't pass userType here - just check if user exists
        const syncResult = await syncWithBackend(firebaseUser);
        if (syncResult) {
          setDbUser(syncResult.user);
        }
      } else {
        setDbUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [syncWithBackend]);

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
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

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
      console.error("Error signing in with email:", error);

      // Provide specific error messages based on Firebase error codes
      let errorMessage = "Failed to sign in. Please try again.";
      const errorCode = error?.code;

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
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Sync with backend to create the user record
      const syncResult = await syncWithBackend(result.user, userType, displayName);

      if (!syncResult) {
        toast({
          title: "Registration Error",
          description: "Account created but failed to sync with server. Please contact support.",
          variant: "destructive",
        });
      }

      return result.user;
    } catch (error: any) {
      console.error("Error signing up:", error);

      let errorMessage = "Failed to create account. Please try again.";
      const errorCode = error?.code;

      if (errorCode === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      } else if (errorCode === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use at least 8 characters.";
      } else if (errorCode === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      }

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
