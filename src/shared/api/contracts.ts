import type {
  ApiFieldErrors,
  AuthSession,
  ApplicationDecisionInput,
  ApplicationInput,
  LoginInput,
  IncomingApplication,
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
  restoreSession(): Promise<AuthSession | null>;
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
  searchProjects(token: string, input: SearchInput): Promise<ProjectSearchResult[]>;
  searchUsers(token: string, input: SearchInput): Promise<UserSearchResult[]>;
  applyToProject(token: string, projectId: string, input: ApplicationInput): Promise<ProjectApplication>;
  listIncomingApplications(token: string): Promise<IncomingApplication[]>;
  decideApplication(token: string, applicationId: string, input: ApplicationDecisionInput): Promise<ProjectApplication>;
}
