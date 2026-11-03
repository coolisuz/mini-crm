import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@/hooks/useSession";

export function RequireAuth() {
  const { loading, session, user } = useSession();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!session || !user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
