import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { initializeAccountSync, stopAccountSync } from "./cloud-sync";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  syncing: boolean;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let active = true;
    const applyUser = async (next: User | null) => {
      if (!active) return;
      setUser(next);
      if (next) {
        setSyncing(true);
        try {
          await initializeAccountSync(next.id);
        } finally {
          if (active) setSyncing(false);
        }
      } else {
        stopAccountSync();
      }
      if (active) setReady(true);
    };

    void supabase.auth.getUser().then(({ data }) => applyUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
      void applyUser(session?.user ?? null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
      stopAccountSync();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    ready,
    syncing,
    sendMagicLink: async (email) => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [ready, syncing, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}