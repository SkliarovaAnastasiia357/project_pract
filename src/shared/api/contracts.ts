import type {
  ApiFieldErrors,
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

export const MOCK_DB_KEY = "teamnova.mock-db.v1";

export class ApiClientError extends Error {
  status: number;
  fieldErrors?: ApiFieldErrors;

  constructor(message: string, status = 400, fieldErrors?: ApiFieldErrors) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export interface ApiClient {
  register(input: RegisterInput): Promise<AuthSession>;
  login(input: LoginInput): Promise<AuthSession>;
  logout(token: string): Promise<void>;
  getMe(token: string): Promise<User>;
  getProfile(token: string): Promise<Profile>;
  updateProfile(token: string, input: ProfileInput): Promise<Profile>;
  addSkill(token: string, input: SkillInput): Promise<Profile>;
  deleteSkill(token: string, skillId: string): Promise<Profile>;
  listProjects(token: string): Promise<Project[]>;
  createProject(token: string, input: ProjectInput): Promise<Project>;
  getProject(token: string, projectId: string): Promise<Project>;
  updateProject(token: string, projectId: string, input: ProjectInput): Promise<Project>;
  deleteProject(token: string, projectId: string): Promise<void>;
}
