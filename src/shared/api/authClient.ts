import type { AuthSession, User } from "../types.ts";
import { ApiClientError } from "./contracts.ts";

type AccessHolder = {
  token: string | null;
  user: User | null;
};

const holder: AccessHolder = { token: null, user: null };
let inflight: Promise<AuthSession | null> | null = null;

export function getAccessToken(): string | null {
  return holder.token;
}

export function getCurrentUser(): User | null {
  return holder.user;
}

export function setSession(session: AuthSession | null): void {
  holder.token = session?.token ?? null;
  holder.user = session?.user ?? null;
}

export async function refreshSession(apiBase = ""): Promise<AuthSession | null> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`${apiBase}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setSession(null);
        return null;
      }
      const data = (await res.json()) as AuthSession;
      setSession(data);
      return data;
    } catch {
      setSession(null);
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export class UnauthorizedError extends ApiClientError {
  constructor() {
    super("Требуется авторизация", 401);
  }
}
