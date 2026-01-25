import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType {
  user: User | null;
  dbUser: any | null;
  loading: boolean;
  signInWithGoogle: (userType?: string) => Promise<User | null>;
  signInWithEmail: (email: string, password: string) => Promise<User | null>;
  signUp: (email: string, password: string, userType?: string, displayName?: string) => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async (userType?: string) => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
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
      return result.user;
    } catch (error) {
      console.error("Error signing up:", error);
      toast({
        title: "Registration Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
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
    dbUser: null,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUp,
    signOut
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
