import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type UserRole } from "@/lib/supabase";

export type AppUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
};

type SessionState = {
  loading: boolean;
  session: Session | null;
  user: AppUser | null;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    loading: true,
    session: null,
    user: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function hydrate(session: Session | null) {
      if (!session) {
        if (!cancelled) setState({ loading: false, session: null, user: null });
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("id, email, full_name, role")
        .eq("id", session.user.id)
        .single();
      if (cancelled) return;
      if (error) {
        setState({ loading: false, session, user: null });
        return;
      }
      setState({ loading: false, session, user: data as AppUser });
    }

    supabase.auth.getSession().then(({ data }) => hydrate(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) =>
      hydrate(session),
    );

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside <SessionProvider>");
  }
  return ctx;
}
