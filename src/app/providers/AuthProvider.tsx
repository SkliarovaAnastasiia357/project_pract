import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { apiClient } from "../../shared/api/index.ts";
import {
  setSession as setAuthClientSession,
  subscribeAuthBroadcast,
} from "../../shared/api/authClient.ts";
import type { AuthSession, AuthStatus, LoginInput, RegisterInput, User } from "../../shared/types.ts";

type AuthContextValue = {
  status: AuthStatus;
  session: AuthSession | null;
  login: (input: LoginInput) => Promise<AuthSession>;
  register: (input: RegisterInput) => Promise<AuthSession>;
  logout: () => Promise<void>;
  mergeCurrentUser: (patch: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("booting");
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await apiClient.restoreSession();
      if (cancelled) return;
      setAuthClientSession(restored);
      setSession(restored);
      setStatus(restored ? "authenticated" : "anonymous");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeAuthBroadcast((msg) => {
      if (msg.type === "refreshed") {
        setSession(msg.session);
        setStatus("authenticated");
      } else if (msg.type === "logout") {
        setSession(null);
        setStatus("anonymous");
      }
    });
    return unsub;
  }, []);

  function applySession(next: AuthSession | null): void {
    setSession(next);
    setAuthClientSession(next, { broadcast: true });
    setStatus(next ? "authenticated" : "anonymous");
  }

  async function login(input: LoginInput): Promise<AuthSession> {
    const next = await apiClient.login(input);
    applySession(next);
    return next;
  }

  async function register(input: RegisterInput): Promise<AuthSession> {
    const next = await apiClient.register(input);
    applySession(next);
    return next;
  }

  async function logout(): Promise<void> {
    if (session) {
      try {
        await apiClient.logout(session.token);
      } catch {
        // Ignore server errors on logout — always clear local state.
      }
    }
    applySession(null);
  }

  function mergeCurrentUser(patch: Partial<User>): void {
    setSession((current) =>
      current
        ? { ...current, user: { ...current.user, ...patch } }
        : current,
    );
  }

  return (
    <AuthContext.Provider
      value={{ status, session, login, register, logout, mergeCurrentUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
