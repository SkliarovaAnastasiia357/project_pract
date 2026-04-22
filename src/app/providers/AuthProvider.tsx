import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";

import { apiClient } from "../../shared/api/index.ts";
import { SESSION_TOKEN_KEY } from "../../shared/api/contracts.ts";
import { clearKey, storage } from "../../shared/storage.ts";
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
  const initialToken = storage.getItem(SESSION_TOKEN_KEY);
  const [status, setStatus] = useState<AuthStatus>(initialToken ? "booting" : "anonymous");
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = storage.getItem(SESSION_TOKEN_KEY);

    if (!token) {
      setStatus("anonymous");
      return undefined;
    }

    const bootToken = token;

    async function bootstrapSession() {
      try {
        const user = await apiClient.getMe(bootToken);

        if (cancelled) {
          return;
        }

        setSession({ token: bootToken, user });
        setStatus("authenticated");
      } catch {
        clearKey(SESSION_TOKEN_KEY);

        if (!cancelled) {
          setSession(null);
          setStatus("anonymous");
        }
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  function persistSession(nextSession: AuthSession | null) {
    setSession(nextSession);

    if (nextSession) {
      storage.setItem(SESSION_TOKEN_KEY, nextSession.token);
      setStatus("authenticated");
      return;
    }

    clearKey(SESSION_TOKEN_KEY);
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
