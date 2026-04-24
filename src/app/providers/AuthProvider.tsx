import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";

import { apiClient } from "../../shared/api/index.ts";
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
  const initialToken: string | null = null;
  const [status, setStatus] = useState<AuthStatus>(initialToken ? "booting" : "anonymous");
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    // Task 16 will bootstrap the session via refreshSession() on mount.
    setStatus("anonymous");
    return undefined;
  }, []);

  function persistSession(nextSession: AuthSession | null) {
    setSession(nextSession);

    if (nextSession) {
      setStatus("authenticated");
      return;
    }

    setStatus("anonymous");
  }

  async function login(input: LoginInput): Promise<AuthSession> {
    const nextSession = await apiClient.login(input);
    persistSession(nextSession);
    return nextSession;
  }

  async function register(input: RegisterInput): Promise<AuthSession> {
    const nextSession = await apiClient.register(input);
    persistSession(nextSession);
    return nextSession;
  }

  async function logout(): Promise<void> {
    if (session) {
      try {
        await apiClient.logout(session.token);
      } catch {
        // Client state still has to be cleared even if the backend logout fails.
      }
    }

    persistSession(null);
  }

  function mergeCurrentUser(patch: Partial<User>) {
    setSession((currentSession) =>
      currentSession
        ? {
            ...currentSession,
            user: {
              ...currentSession.user,
              ...patch,
            },
          }
        : currentSession,
    );
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        session,
        login,
        register,
        logout,
        mergeCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
