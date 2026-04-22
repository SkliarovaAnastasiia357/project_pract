import type {
  AuthSession,
  LoginInput,
  Profile,
  ProfileInput,
  Project,
  ProjectInput,
  RegisterInput,
  SkillInput,
  User,
} from "../types.ts";
import { ApiClientError, type ApiClient } from "./contracts.ts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

type JsonPayload = Record<string, unknown> | undefined;

async function request<T>(path: string, method: string, token?: string, body?: JsonPayload): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = "Ошибка запроса";
    let fieldErrors: Record<string, string> | undefined;

    try {
      const errorPayload = (await response.json()) as {
        message?: string;
        fieldErrors?: Record<string, string>;
        errors?: Record<string, string>;
      };
      message = errorPayload.message ?? message;
      fieldErrors = errorPayload.fieldErrors ?? errorPayload.errors;
    } catch {
      message = response.statusText || message;
    }

    throw new ApiClientError(message, response.status, fieldErrors);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const httpApi: ApiClient = {
  register(input: RegisterInput): Promise<AuthSession> {
    return request<AuthSession>("/api/register", "POST", undefined, input);
  },

  login(input: LoginInput): Promise<AuthSession> {
    return request<AuthSession>("/api/login", "POST", undefined, input);
  },

  logout(token: string): Promise<void> {
    return request<void>("/api/logout", "POST", token);
  },

  getMe(token: string): Promise<User> {
    return request<User>("/api/me", "GET", token);
  },

  getProfile(token: string): Promise<Profile> {
    return request<Profile>("/api/profile", "GET", token);
  },

  updateProfile(token: string, input: ProfileInput): Promise<Profile> {
    return request<Profile>("/api/profile", "PATCH", token, input);
  },

  addSkill(token: string, input: SkillInput): Promise<Profile> {
    return request<Profile>("/api/profile/skills", "POST", token, input);
  },

  deleteSkill(token: string, skillId: string): Promise<Profile> {
    return request<Profile>(`/api/profile/skills/${skillId}`, "DELETE", token);
  },

  listProjects(token: string): Promise<Project[]> {
    return request<Project[]>("/api/projects", "GET", token);
  },

  createProject(token: string, input: ProjectInput): Promise<Project> {
    return request<Project>("/api/projects", "POST", token, input);
  },

  getProject(token: string, projectId: string): Promise<Project> {
    return request<Project>(`/api/projects/${projectId}`, "GET", token);
  },

  updateProject(token: string, projectId: string, input: ProjectInput): Promise<Project> {
    return request<Project>(`/api/projects/${projectId}`, "PUT", token, input);
  },

  deleteProject(token: string, projectId: string): Promise<void> {
    return request<void>(`/api/projects/${projectId}`, "DELETE", token);
  },
};
