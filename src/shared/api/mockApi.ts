import { normalizeEmail, validateLoginForm, validateRegistrationForm } from "../../features/auth/forms.ts";
import { validateProjectInput } from "../../features/projects/project-form.ts";
import { clearKey, readJson, writeJson } from "../storage.ts";
import type {
  AuthSession,
  ApplicationDecisionInput,
  ApplicationInput,
  ApplicationStatus,
  DashboardMetrics,
  DemoWorkspaceCleanupResult,
  DemoWorkspaceSeedResult,
  IncomingApplication,
  Profile,
  ProfileInput,
  Project,
  ProjectApplication,
  ProjectInput,
  ProjectSearchResult,
  RegisterInput,
  SearchInput,
  Skill,
  SkillInput,
  User,
  UserSearchResult,
} from "../types.ts";
import { ApiClientError, MOCK_DB_KEY, type ApiClient } from "./contracts.ts";

type UserRecord = User & {
  password: string;
  skills: Skill[];
  createdAt: string;
};

type ProjectRecord = Project & {
  userId: string;
};

type ApplicationRecord = ProjectApplication;

type SessionRecord = {
  token: string;
  userId: string;
};

type DemoRecord = {
  ownerId: string;
  expiresAt: string;
  projectIds: string[];
  userIds: string[];
  applicationIds: string[];
};

type MockDatabase = {
  users: UserRecord[];
  projects: ProjectRecord[];
  applications: ApplicationRecord[];
  sessions: SessionRecord[];
  demo: DemoRecord[];
};

const initialDatabase: MockDatabase = {
  users: [],
  projects: [],
  applications: [],
  sessions: [],
  demo: [],
};

function cloneDatabase(database: MockDatabase): MockDatabase {
  return JSON.parse(JSON.stringify(database)) as MockDatabase;
}

function readDatabase(): MockDatabase {
  const storedDatabase = readJson(MOCK_DB_KEY, initialDatabase) as Partial<MockDatabase>;

  const database = cloneDatabase({
    users: storedDatabase.users ?? [],
    projects: storedDatabase.projects ?? [],
    applications: storedDatabase.applications ?? [],
    sessions: storedDatabase.sessions ?? [],
    demo: storedDatabase.demo ?? [],
  });

  const cleaned = cleanupExpiredDemoRecords(database);
  if (cleaned.changed) {
    writeDatabase(cleaned.database);
  }

  return cleaned.database;
}

function writeDatabase(database: MockDatabase): void {
  writeJson(MOCK_DB_KEY, database);
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function waitForMock(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 120));
}

function toPublicUser(user: UserRecord): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio,
  };
}

function toProfile(user: UserRecord): Profile {
  return {
    bio: user.bio,
    skills: [...user.skills],
  };
}

function requireUserByToken(token: string): { database: MockDatabase; user: UserRecord } {
  const database = readDatabase();
  const session = database.sessions.find((entry) => entry.token === token);

  if (!session) {
    throw new ApiClientError("Требуется авторизация", 401);
  }

  const user = database.users.find((entry) => entry.id === session.userId);

  if (!user) {
    throw new ApiClientError("Пользователь не найден", 404);
  }

  return { database, user };
}

function createSession(database: MockDatabase, user: UserRecord): AuthSession {
  const token = createId("mock-token");
  database.sessions = database.sessions.filter((session) => session.userId !== user.id);
  database.sessions.push({ token, userId: user.id });

  return {
    token,
    user: toPublicUser(user),
  };
}

function toSession(user: UserRecord, token: string): AuthSession {
  return {
    token,
    user: toPublicUser(user),
  };
}

function normalizeProjectInput(input: ProjectInput): ProjectInput {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    stack: input.stack.trim(),
    roles: input.roles.trim(),
  };
}

function findProject(database: MockDatabase, userId: string, projectId: string): ProjectRecord {
  const project = database.projects.find((entry) => entry.userId === userId && entry.id === projectId);

  if (!project) {
    throw new ApiClientError("Проект не найден", 404);
  }

  return project;
}

function findProjectById(database: MockDatabase, projectId: string): ProjectRecord {
  const project = database.projects.find((entry) => entry.id === projectId);

  if (!project) {
    throw new ApiClientError("Проект не найден", 404);
  }

  return project;
}

function matchesQuery(values: string[], input: SearchInput): boolean {
  const query = input.query.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(query));
}

function toProjectSearchResult(database: MockDatabase, project: ProjectRecord, userId: string): ProjectSearchResult {
  const owner = database.users.find((entry) => entry.id === project.userId);
  const application = database.applications.find((entry) => entry.projectId === project.id && entry.applicantId === userId);

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    stack: project.stack,
    roles: project.roles,
    updatedAt: project.updatedAt,
    ownerId: project.userId,
    ownerName: owner?.name ?? "Пользователь",
    applicationStatus: application?.status ?? null,
  };
}

function toUserSearchResult(user: UserRecord): UserSearchResult {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    skills: [...user.skills].sort((left, right) => left.name.localeCompare(right.name, "ru")),
  };
}

function toIncomingApplication(database: MockDatabase, application: ApplicationRecord): IncomingApplication {
  const project = findProjectById(database, application.projectId);
  const applicant = database.users.find((entry) => entry.id === application.applicantId);

  if (!applicant) {
    throw new ApiClientError("Пользователь не найден", 404);
  }

  return {
    id: application.id,
    message: application.message,
    status: application.status,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    project: {
      id: project.id,
      title: project.title,
    },
    applicant: toUserSearchResult(applicant),
  };
}

function countUnique(values: string[]): number {
  return new Set(values).size;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function cleanupDemoRecords(database: MockDatabase, ownerId: string): DemoWorkspaceCleanupResult {
  const demoRecords = database.demo.filter((record) => record.ownerId === ownerId);
  const projectIds = new Set(demoRecords.flatMap((record) => record.projectIds));
  const userIds = new Set(demoRecords.flatMap((record) => record.userIds));
  const applicationIds = new Set(demoRecords.flatMap((record) => record.applicationIds));
  const applicationIdsForProjects = database.applications
    .filter((application) => projectIds.has(application.projectId))
    .map((application) => application.id);

  for (const id of applicationIdsForProjects) {
    applicationIds.add(id);
  }

  const result = {
    projectsDeleted: countUnique([...projectIds].filter((id) => database.projects.some((project) => project.id === id))),
    usersDeleted: countUnique([...userIds].filter((id) => database.users.some((user) => user.id === id))),
    applicationsDeleted: countUnique(
      [...applicationIds].filter((id) => database.applications.some((application) => application.id === id)),
    ),
  };

  database.applications = database.applications.filter((application) => !applicationIds.has(application.id));
  database.projects = database.projects.filter((project) => !projectIds.has(project.id));
  database.users = database.users.filter((user) => !userIds.has(user.id));
  database.sessions = database.sessions.filter((session) => !userIds.has(session.userId));
  database.demo = database.demo.filter((record) => record.ownerId !== ownerId);

  return result;
}

function cleanupExpiredDemoRecords(database: MockDatabase): { database: MockDatabase; changed: boolean } {
  const now = Date.now();
  const expiredOwnerIds = database.demo
    .filter((record) => Date.parse(record.expiresAt) <= now)
    .map((record) => record.ownerId);

  if (expiredOwnerIds.length === 0) {
    return { database, changed: false };
  }

  for (const ownerId of uniqueStrings(expiredOwnerIds)) {
    cleanupDemoRecords(database, ownerId);
  }

  return { database, changed: true };
}

function createDemoUser(ownerId: string, suffix: string, name: string, bio: string, skills: string[]): UserRecord {
  return {
    id: createId(`demo-user-${suffix}`),
    email: `demo+${ownerId.slice(0, 8)}-${suffix}@teamnova.local`,
    name,
    password: "DemoPass1",
    bio,
    skills: skills.map((skill) => ({ id: createId("demo-skill"), name: skill })),
    createdAt: new Date().toISOString(),
  };
}

function getDashboardMetrics(database: MockDatabase, user: UserRecord): DashboardMetrics {
  const ownedProjectIds = new Set(database.projects.filter((project) => project.userId === user.id).map((project) => project.id));
  const incomingApplications = database.applications.filter((application) => ownedProjectIds.has(application.projectId));
  const demoExpiresAt = database.demo
    .filter((record) => record.ownerId === user.id)
    .map((record) => record.expiresAt)
    .sort()[0] ?? null;

  return {
    ownedProjectsCount: ownedProjectIds.size,
    searchableProjectsCount: database.projects.length,
    searchableUsersCount: Math.max(0, database.users.length - 1),
    incomingApplicationsCount: incomingApplications.length,
    pendingApplicationsCount: incomingApplications.filter((application) => application.status === "pending").length,
    acceptedTeamMembersCount: incomingApplications.filter((application) => application.status === "accepted").length,
    profileSkillsCount: user.skills.length,
    demoExpiresAt,
  };
}

export function resetMockApiState(): void {
  clearKey(MOCK_DB_KEY);
}

export const mockApi: ApiClient = {
  async restoreSession(): Promise<AuthSession | null> {
    await waitForMock();

    const database = readDatabase();
    const activeSession = database.sessions.at(-1);

    if (!activeSession) {
      return null;
    }

    const user = database.users.find((entry) => entry.id === activeSession.userId);

    if (!user) {
      return null;
    }

    return toSession(user, activeSession.token);
  },

  async register(input: RegisterInput): Promise<AuthSession> {
    await waitForMock();

    const errors = validateRegistrationForm(input);
    const database = readDatabase();
    const normalizedEmail = normalizeEmail(input.email);

    if (database.users.some((user) => user.email === normalizedEmail)) {
      errors.email = "Пользователь с таким email уже существует";
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiClientError("Исправьте ошибки в форме регистрации", 400, errors);
    }

    const user: UserRecord = {
      id: createId("user"),
      email: normalizedEmail,
      name: input.name.trim(),
      password: input.password,
      bio: "",
      skills: [],
      createdAt: new Date().toISOString(),
    };

    database.users.push(user);
    const session = createSession(database, user);
    writeDatabase(database);

    return session;
  },

  async login(input) {
    await waitForMock();

    const errors = validateLoginForm(input);

    if (Object.keys(errors).length > 0) {
      throw new ApiClientError("Исправьте ошибки в форме входа", 400, errors);
    }

    const database = readDatabase();
    const user = database.users.find(
      (entry) => entry.email === normalizeEmail(input.email) && entry.password === input.password,
    );

    if (!user) {
      throw new ApiClientError("Неверный email или пароль", 401);
    }

    const session = createSession(database, user);
    writeDatabase(database);

    return session;
  },

  async logout(token) {
    await waitForMock();

    const database = readDatabase();
    database.sessions = database.sessions.filter((session) => session.token !== token);
    writeDatabase(database);
  },

  async getMe(token) {
    await waitForMock();
    const { user } = requireUserByToken(token);
    return toPublicUser(user);
  },

  async getProfile(token) {
    await waitForMock();
    const { user } = requireUserByToken(token);
    return toProfile(user);
  },

  async updateProfile(token, input: ProfileInput) {
    await waitForMock();
    const { database, user } = requireUserByToken(token);
    const bio = input.bio.trim();

    if (bio.length > 400) {
      throw new ApiClientError("Исправьте ошибки в профиле", 400, {
        bio: "Описание не должно превышать 400 символов",
      });
    }

    user.bio = bio;
    writeDatabase(database);

    return toProfile(user);
  },

  async addSkill(token, input: SkillInput) {
    await waitForMock();
    const { database, user } = requireUserByToken(token);
    const normalizedSkill = input.name.trim();

    if (!normalizedSkill) {
      throw new ApiClientError("Исправьте ошибки в навыках", 400, {
        name: "Введите навык",
      });
    }

    if (user.skills.some((skill) => skill.name.toLowerCase() === normalizedSkill.toLowerCase())) {
      throw new ApiClientError("Навык уже добавлен", 400, {
        name: "Навык уже добавлен",
      });
    }

    user.skills.push({
      id: createId("skill"),
      name: normalizedSkill,
    });
    writeDatabase(database);

    return toProfile(user);
  },

  async deleteSkill(token, skillId) {
    await waitForMock();
    const { database, user } = requireUserByToken(token);
    user.skills = user.skills.filter((skill) => skill.id !== skillId);
    writeDatabase(database);
    return toProfile(user);
  },

  async listProjects(token) {
    await waitForMock();
    const { user } = requireUserByToken(token);

    return readDatabase()
      .projects
      .filter((project) => project.userId === user.id)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((project) => ({ ...project }));
  },

  async createProject(token, input: ProjectInput) {
    await waitForMock();
    const { database, user } = requireUserByToken(token);
    const normalizedInput = normalizeProjectInput(input);
    const errors = validateProjectInput(normalizedInput);

    if (Object.keys(errors).length > 0) {
      throw new ApiClientError("Исправьте ошибки в форме проекта", 400, errors);
    }

    const project: ProjectRecord = {
      id: createId("project"),
      userId: user.id,
      updatedAt: new Date().toISOString(),
      ...normalizedInput,
    };

    database.projects.push(project);
    writeDatabase(database);

    return { ...project };
  },

  async getProject(token, projectId) {
    await waitForMock();
    const { database, user } = requireUserByToken(token);
    return { ...findProject(database, user.id, projectId) };
  },

  async updateProject(token, projectId, input: ProjectInput) {
    await waitForMock();
    const { database, user } = requireUserByToken(token);
    const normalizedInput = normalizeProjectInput(input);
    const errors = validateProjectInput(normalizedInput);

    if (Object.keys(errors).length > 0) {
      throw new ApiClientError("Исправьте ошибки в форме проекта", 400, errors);
    }

    const project = findProject(database, user.id, projectId);
    project.title = normalizedInput.title;
    project.description = normalizedInput.description;
    project.stack = normalizedInput.stack;
    project.roles = normalizedInput.roles;
    project.updatedAt = new Date().toISOString();
    writeDatabase(database);

    return { ...project };
  },

  async deleteProject(token, projectId) {
    await waitForMock();
    const { database, user } = requireUserByToken(token);
    findProject(database, user.id, projectId);
    database.projects = database.projects.filter((project) => !(project.userId === user.id && project.id === projectId));
    database.applications = database.applications.filter((application) => application.projectId !== projectId);
    writeDatabase(database);
  },

  async searchProjects(token, input) {
    await waitForMock();
    const { database, user } = requireUserByToken(token);

    return database.projects
      .filter((project) =>
        matchesQuery([project.title, project.description, project.stack, project.roles], input),
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((project) => toProjectSearchResult(database, project, user.id));
  },

  async searchUsers(token, input) {
    await waitForMock();
    const { database, user } = requireUserByToken(token);

    return database.users
      .filter((entry) => entry.id !== user.id)
      .filter((entry) =>
        matchesQuery([entry.name, entry.bio, ...entry.skills.map((skill) => skill.name)], input),
      )
      .map(toUserSearchResult);
  },

  async getDashboardMetrics(token): Promise<DashboardMetrics> {
    await waitForMock();
    const { database, user } = requireUserByToken(token);
    return getDashboardMetrics(database, user);
  },

  async seedDemoWorkspace(token): Promise<DemoWorkspaceSeedResult> {
    await waitForMock();
    const { database, user } = requireUserByToken(token);
    cleanupDemoRecords(database, user.id);

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const project: ProjectRecord = {
      id: createId("demo-project"),
      userId: user.id,
      title: "Demo · AI подбор команды",
      description: "Реальный демо-проект Teamnova: подбор участников, заявки и состав команды.",
      stack: "React, TypeScript, Fastify, PostgreSQL",
      roles: "Frontend developer, QA engineer, UX researcher",
      updatedAt: new Date().toISOString(),
    };
    const demoUsers = [
      createDemoUser(user.id, "react", "Алина React", "Frontend engineer: React, TypeScript, дизайн-системы.", [
        "React",
        "TypeScript",
        "UI",
      ]),
      createDemoUser(user.id, "qa", "Максим QA", "QA engineer: тест-планы, регрессия, Playwright.", [
        "QA",
        "Playwright",
        "Postman",
      ]),
      createDemoUser(user.id, "ux", "София UX", "UX researcher: CJM, прототипы, интервью пользователей.", [
        "UX",
        "Figma",
        "Research",
      ]),
    ];
    const statuses: ApplicationStatus[] = ["pending", "accepted", "rejected"];
    const applications: ApplicationRecord[] = demoUsers.map((demoUser, index) => {
      const now = new Date().toISOString();
      return {
        id: createId("demo-application"),
        projectId: project.id,
        applicantId: demoUser.id,
        message: `Demo-заявка: ${demoUser.name} хочет присоединиться к проекту.`,
        status: statuses[index]!,
        createdAt: now,
        updatedAt: now,
      };
    });

    database.projects.push(project);
    database.users.push(...demoUsers);
    database.applications.push(...applications);
    database.demo.push({
      ownerId: user.id,
      expiresAt,
      projectIds: [project.id],
      userIds: demoUsers.map((demoUser) => demoUser.id),
      applicationIds: applications.map((application) => application.id),
    });
    writeDatabase(database);

    return {
      projectsCreated: 1,
      applicantsCreated: demoUsers.length,
      applicationsCreated: applications.length,
      expiresAt,
    };
  },

  async cleanupDemoWorkspace(token): Promise<DemoWorkspaceCleanupResult> {
    await waitForMock();
    const { database, user } = requireUserByToken(token);
    const result = cleanupDemoRecords(database, user.id);
    writeDatabase(database);
    return result;
  },

  async applyToProject(token, projectId, input: ApplicationInput) {
    await waitForMock();
    const { database, user } = requireUserByToken(token);
    const project = findProjectById(database, projectId);
    const message = input.message.trim();

    if (project.userId === user.id) {
      throw new ApiClientError("Нельзя отправить заявку в собственный проект", 400);
    }

    if (message.length > 400) {
      throw new ApiClientError("Исправьте ошибки в заявке", 400, {
        message: "Сообщение не должно превышать 400 символов",
      });
    }

    if (database.applications.some((application) => application.projectId === projectId && application.applicantId === user.id)) {
      throw new ApiClientError("Заявка уже отправлена", 409);
    }

    const now = new Date().toISOString();
    const application: ApplicationRecord = {
      id: createId("application"),
      projectId,
      applicantId: user.id,
      message,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    database.applications.push(application);
    writeDatabase(database);

    return { ...application };
  },

  async listIncomingApplications(token) {
    await waitForMock();
    const { database, user } = requireUserByToken(token);
    const ownedProjectIds = new Set(database.projects.filter((project) => project.userId === user.id).map((project) => project.id));

    return database.applications
      .filter((application) => ownedProjectIds.has(application.projectId))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((application) => toIncomingApplication(database, application));
  },

  async decideApplication(token, applicationId, input: ApplicationDecisionInput) {
    await waitForMock();
    const { database, user } = requireUserByToken(token);
    const application = database.applications.find((entry) => entry.id === applicationId);

    if (!application) {
      throw new ApiClientError("Заявка не найдена", 404);
    }

    const project = findProjectById(database, application.projectId);

    if (project.userId !== user.id) {
      throw new ApiClientError("Недостаточно прав для изменения заявки", 403);
    }

    const nextStatus: ApplicationStatus = input.status;
    application.status = nextStatus;
    application.updatedAt = new Date().toISOString();
    writeDatabase(database);

    return { ...application };
  },
};
