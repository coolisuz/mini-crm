import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { user } = useSession();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  const navItem = (to: string, label: string) => (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          "px-3 py-1.5 rounded-md text-sm transition-colors",
          isActive
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      {label}
    </NavLink>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-semibold">
              Mini-CRM
            </Link>
            <nav className="flex items-center gap-1">
              {navItem("/", "Objects")}
              {user?.role === "executor" && navItem("/my-tasks", "My tasks")}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user && (
              <>
                <span className="text-muted-foreground">
                  {user.full_name ?? user.email}
                </span>
                <Badge variant={user.role === "manager" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="container flex-1 py-6">
        <Outlet />
      </main>
    </div>
  );
}
