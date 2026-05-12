import type {
  AuthSession,
  ApplicationDecisionInput,
  ApplicationInput,
  IncomingApplication,
  LoginInput,
  Profile,
  ProfileInput,
  Project,
  ProjectApplication,
  ProjectInput,
  ProjectSearchResult,
  RegisterInput,
  SearchInput,
  SkillInput,
  User,
  UserSearchResult,
} from "../types.ts";
import { ApiClientError, type ApiClient } from "./contracts.ts";
import { getAccessToken, refreshSession, setSession, UnauthorizedError } from "./authClient.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE_URL: string = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ?? "";

type JsonPayload = Record<string, unknown> | undefined;

async function rawRequest(
  path: string,
  method: string,
  body?: JsonPayload,
  authToken?: string | null,
): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "Ошибка запроса";
    let fieldErrors: Record<string, string> | undefined;
    try {
      const payload = (await res.json()) as {
        message?: string;
        fieldErrors?: Record<string, string>;
        errors?: Record<string, string>;
      };
      message = payload.message ?? message;
      fieldErrors = payload.fieldErrors ?? payload.errors;
    } catch {
      message = res.statusText || message;
    }
    throw new ApiClientError(message, res.status, fieldErrors);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

type RequestOptions = { skipRefresh?: boolean };

async function request<T>(
  path: string,
  method: string,
  body?: JsonPayload,
  opts: RequestOptions = {},
): Promise<T> {
  const token = getAccessToken();
  let res = await rawRequest(path, method, body, token);
  if (res.status === 401 && !opts.skipRefresh) {
    const refreshed = await refreshSession(API_BASE_URL);
    if (!refreshed) throw new UnauthorizedError();
    res = await rawRequest(path, method, body, refreshed.token);
  }
  return handleResponse<T>(res);
}

export const httpApi: ApiClient = {
  async register(input: RegisterInput): Promise<AuthSession> {
    const session = await request<AuthSession>("/api/register", "POST", input, { skipRefresh: true });
    setSession(session);
    return session;
  },

  async login(input: LoginInput): Promise<AuthSession> {
    const session = await request<AuthSession>("/api/login", "POST", input, { skipRefresh: true });
    setSession(session);
    return session;
  },

  async logout(): Promise<void> {
    await request<void>("/api/logout", "POST", undefined, { skipRefresh: true });
    setSession(null);
  },

  getMe(_token: string): Promise<User> {
    return request<User>("/api/me", "GET");
  },

  getProfile(_token: string): Promise<Profile> {
    return request<Profile>("/api/profile", "GET");
  },

  updateProfile(_token: string, input: ProfileInput): Promise<Profile> {
    return request<Profile>("/api/profile", "PATCH", input);
  },

  addSkill(_token: string, input: SkillInput): Promise<Profile> {
    return request<Profile>("/api/profile/skills", "POST", input);
  },

  deleteSkill(_token: string, skillId: string): Promise<Profile> {
    return request<Profile>(`/api/profile/skills/${skillId}`, "DELETE");
  },

  listProjects(_token: string): Promise<Project[]> {
    return request<Project[]>("/api/projects", "GET");
  },

  createProject(_token: string, input: ProjectInput): Promise<Project> {
    return request<Project>("/api/projects", "POST", input);
  },

  getProject(_token: string, id: string): Promise<Project> {
    return request<Project>(`/api/projects/${id}`, "GET");
  },

  updateProject(_token: string, id: string, input: ProjectInput): Promise<Project> {
    return request<Project>(`/api/projects/${id}`, "PUT", input);
  },

  deleteProject(_token: string, id: string): Promise<void> {
    return request<void>(`/api/projects/${id}`, "DELETE");
  },

  searchProjects(_token: string, input: SearchInput): Promise<ProjectSearchResult[]> {
    const params = new URLSearchParams({ q: input.query });
    return request<ProjectSearchResult[]>(`/api/search/projects?${params.toString()}`, "GET");
  },

  searchUsers(_token: string, input: SearchInput): Promise<UserSearchResult[]> {
    const params = new URLSearchParams({ q: input.query });
    return request<UserSearchResult[]>(`/api/search/users?${params.toString()}`, "GET");
  },

  applyToProject(_token: string, projectId: string, input: ApplicationInput): Promise<ProjectApplication> {
    return request<ProjectApplication>(`/api/projects/${projectId}/applications`, "POST", input);
  },

  listIncomingApplications(_token: string): Promise<IncomingApplication[]> {
    return request<IncomingApplication[]>("/api/applications/incoming", "GET");
  },

  decideApplication(
    _token: string,
    applicationId: string,
    input: ApplicationDecisionInput,
  ): Promise<ProjectApplication> {
    return request<ProjectApplication>(`/api/applications/${applicationId}`, "PATCH", input);
  },
};
