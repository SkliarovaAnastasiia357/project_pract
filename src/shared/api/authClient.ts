import type { AuthSession, User } from "../types.ts";
import { ApiClientError } from "./contracts.ts";

const CHANNEL_NAME = "tn-auth";

type AuthBroadcast =
  | { type: "refreshed"; session: AuthSession }
  | { type: "logout" };

const channel: BroadcastChannel | null =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as any).BroadcastChannel !== "undefined"
    ? new (globalThis as any).BroadcastChannel(CHANNEL_NAME)
    : null;

type Listener = (msg: AuthBroadcast) => void;
const listeners = new Set<Listener>();

if (channel) {
  channel.onmessage = (ev: MessageEvent<AuthBroadcast>) => {
    for (const l of listeners) l(ev.data);
  };
}

export function subscribeAuthBroadcast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(msg: AuthBroadcast): void {
  channel?.postMessage(msg);
}

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

export function setSession(session: AuthSession | null, options: { broadcast?: boolean } = {}): void {
  holder.token = session?.token ?? null;
  holder.user = session?.user ?? null;
  if (options.broadcast) {
    publish(session ? { type: "refreshed", session } : { type: "logout" });
  }
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
        setSession(null, { broadcast: true });
        return null;
      }
      const data = (await res.json()) as AuthSession;
      setSession(data, { broadcast: true });
      return data;
    } catch {
      setSession(null, { broadcast: true });
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
