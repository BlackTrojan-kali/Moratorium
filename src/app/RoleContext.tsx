import { useAuth } from './AuthContext';
// Existing dashboards consume this adapter; the server now owns the role.
export function useRole() {
  const { user } = useAuth();
  return { role: user?.role ?? 'employer' };
}
