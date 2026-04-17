import { useAuth } from "./use-auth";

export function useUserType(): string | null {
  const { dbUser } = useAuth();
  return dbUser?.userType ?? localStorage.getItem('userType');
}
