import { useAuth } from "./use-auth";

export function useCurrentUserId(): string | null {
  const { dbUser } = useAuth();
  return dbUser?.id?.toString() ?? localStorage.getItem('currentUserId');
}
