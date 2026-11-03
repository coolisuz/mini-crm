import type { ReactNode } from "react";
import type { UserRole } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

type Props = {
  role: UserRole | UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
};

export function RoleGuard({ role, children, fallback = null }: Props) {
  const { user } = useSession();
  if (!user) return <>{fallback}</>;
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(user.role) ? <>{children}</> : <>{fallback}</>;
}
