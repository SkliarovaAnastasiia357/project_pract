import { and, eq, ilike, inArray, ne } from "drizzle-orm";
import type { Redis } from "ioredis";
import { hashPassword } from "../auth/password.js";
import type { Db } from "../db/client.js";
import { projectApplications, projects, skills, userSkills, users } from "../db/schema.js";

const DEMO_TTL_MS = 2 * 60 * 60 * 1000;
const DEMO_PROJECT_TITLE = "Demo · AI подбор команды";
const DEMO_PASSWORD = "DemoPass1";

type DemoRun = {
  ownerId: string;
  expiresAt: string;
  projectIds: string[];
  userIds: string[];
  applicationIds: string[];
};

type DashboardMetrics = {
  ownedProjectsCount: number;
  searchableProjectsCount: number;
  searchableUsersCount: number;
  incomingApplicationsCount: number;
  pendingApplicationsCount: number;
  acceptedTeamMembersCount: number;
  profileSkillsCount: number;
  demoExpiresAt: string | null;
};

type DemoWorkspaceSeedResult = {
  projectsCreated: number;
  applicantsCreated: number;
  applicationsCreated: number;
  expiresAt: string;
};

type DemoWorkspaceCleanupResult = {
  projectsDeleted: number;
  usersDeleted: number;
  applicationsDeleted: number;
};

function demoKey(ownerId: string): string {
  return `teamnova:demo:${ownerId}`;
}

function demoEmailPrefix(ownerId: string): string {
  return `demo+${ownerId.slice(0, 8)}`;
}

function normalizeSkillName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeSkillKey(name: string): string {
  return normalizeSkillName(name).toLowerCase();
}

async function readDemoRun(redis: Redis, ownerId: string): Promise<DemoRun | null> {
  const raw = await redis.get(demoKey(ownerId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DemoRun;
  } catch {
    await redis.del(demoKey(ownerId));
    return null;
  }
}

async function writeDemoRun(redis: Redis, run: DemoRun): Promise<void> {
  const ttlSeconds = Math.max(60, Math.ceil((Date.parse(run.expiresAt) - Date.now()) / 1000) + 24 * 60 * 60);
  await redis.set(demoKey(run.ownerId), JSON.stringify(run), "EX", ttlSeconds);
}

async function getOrCreateSkill(db: Db, name: string): Promise<string> {
  const normalizedName = normalizeSkillKey(name);
  let [skill] = await db
    .insert(skills)
    .values({ name: normalizeSkillName(name), normalizedName })
    .onConflictDoNothing({ target: skills.normalizedName })
    .returning();

  skill ??= (await db.select().from(skills).where(eq(skills.normalizedName, normalizedName)).limit(1))[0];

  if (!skill) {
    throw new Error(`Could not create demo skill ${name}`);
  }

  return skill.id;
}

async function attachSkills(db: Db, userId: string, skillNames: string[]): Promise<void> {
  for (const skillName of skillNames) {
    const skillId = await getOrCreateSkill(db, skillName);
    await db
      .insert(userSkills)
      .values({ userId, skillId })
      .onConflictDoNothing({ target: [userSkills.userId, userSkills.skillId] });
  }
}

async function fallbackDemoIds(db: Db, ownerId: string): Promise<Pick<DemoRun, "projectIds" | "userIds" | "applicationIds">> {
  const prefix = demoEmailPrefix(ownerId);
  const demoProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.ownerId, ownerId), eq(projects.title, DEMO_PROJECT_TITLE)));
  const demoUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(ilike(users.email, `${prefix}-%@teamnova.local`));
  const projectIds = demoProjects.map((project) => project.id);
  const userIds = demoUsers.map((user) => user.id);
  const applicationIds =
    projectIds.length > 0 || userIds.length > 0
      ? (await db
          .select({ id: projectApplications.id })
          .from(projectApplications)
          .where(
            projectIds.length > 0
              ? inArray(projectApplications.projectId, projectIds)
              : inArray(projectApplications.applicantId, userIds),
          )).map((application) => application.id)
      : [];

  return { projectIds, userIds, applicationIds };
}

export async function cleanupDemoWorkspace(db: Db, redis: Redis, ownerId: string): Promise<DemoWorkspaceCleanupResult> {
  const run = await readDemoRun(redis, ownerId);
  const ids = run ?? { ownerId, expiresAt: "", ...(await fallbackDemoIds(db, ownerId)) };
  const projectIds = [...new Set(ids.projectIds)];
  const userIds = [...new Set(ids.userIds)];
  const applicationIdsFromProjects =
    projectIds.length > 0
      ? (await db
          .select({ id: projectApplications.id })
          .from(projectApplications)
          .where(inArray(projectApplications.projectId, projectIds))).map((application) => application.id)
      : [];
  const applicationIdsFromUsers =
    userIds.length > 0
      ? (await db
          .select({ id: projectApplications.id })
          .from(projectApplications)
          .where(inArray(projectApplications.applicantId, userIds))).map((application) => application.id)
      : [];
  const applicationIds = [...new Set([...ids.applicationIds, ...applicationIdsFromProjects, ...applicationIdsFromUsers])];

  if (applicationIds.length > 0) {
    await db.delete(projectApplications).where(inArray(projectApplications.id, applicationIds));
  }
  if (projectIds.length > 0) {
    await db.delete(projects).where(inArray(projects.id, projectIds));
  }
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }

  await redis.del(demoKey(ownerId));

  return {
    projectsDeleted: projectIds.length,
    usersDeleted: userIds.length,
    applicationsDeleted: applicationIds.length,
  };
}

export async function seedDemoWorkspace(db: Db, redis: Redis, ownerId: string): Promise<DemoWorkspaceSeedResult> {
  await cleanupDemoWorkspace(db, redis, ownerId);

  const expiresAt = new Date(Date.now() + DEMO_TTL_MS).toISOString();
  const [project] = await db
    .insert(projects)
    .values({
      ownerId,
      title: DEMO_PROJECT_TITLE,
      description: "Живой демо-проект: подбор frontend, QA и UX участников в команду продукта.",
      stack: "React, TypeScript, Fastify, PostgreSQL",
      roles: "Frontend developer, QA engineer, UX researcher",
    })
    .returning();

  if (!project) {
    throw new Error("Could not create demo project");
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const prefix = demoEmailPrefix(ownerId);
  const demoUsers = await db
    .insert(users)
    .values([
      {
        email: `${prefix}-react@teamnova.local`,
        name: "Алина React",
        passwordHash,
        bio: "Frontend engineer: React, TypeScript, дизайн-системы.",
      },
      {
        email: `${prefix}-qa@teamnova.local`,
        name: "Максим QA",
        passwordHash,
        bio: "QA engineer: тест-планы, регрессия, Playwright.",
      },
      {
        email: `${prefix}-ux@teamnova.local`,
        name: "София UX",
        passwordHash,
        bio: "UX researcher: CJM, прототипы, интервью пользователей.",
      },
    ])
    .returning();

  await attachSkills(db, demoUsers[0]!.id, ["React", "TypeScript", "UI"]);
  await attachSkills(db, demoUsers[1]!.id, ["QA", "Playwright", "Postman"]);
  await attachSkills(db, demoUsers[2]!.id, ["UX", "Figma", "Research"]);

  const applications = await db
    .insert(projectApplications)
    .values([
      {
        projectId: project.id,
        applicantId: demoUsers[0]!.id,
        message: "Готова закрыть frontend и привести интерфейс к production-polish.",
        status: "pending",
      },
      {
        projectId: project.id,
        applicantId: demoUsers[1]!.id,
        message: "Возьму QA-gate, регрессию и ручные сценарии перед защитой.",
        status: "accepted",
      },
      {
        projectId: project.id,
        applicantId: demoUsers[2]!.id,
        message: "Помогу проверить UX-сценарий и улучшить форму заявки.",
        status: "rejected",
      },
    ])
    .returning();

  await writeDemoRun(redis, {
    ownerId,
    expiresAt,
    projectIds: [project.id],
    userIds: demoUsers.map((user) => user.id),
    applicationIds: applications.map((application) => application.id),
  });

  return {
    projectsCreated: 1,
    applicantsCreated: demoUsers.length,
    applicationsCreated: applications.length,
    expiresAt,
  };
}

export async function getDemoExpiresAt(redis: Redis, ownerId: string): Promise<string | null> {
  return (await readDemoRun(redis, ownerId))?.expiresAt ?? null;
}

export async function getDashboardMetrics(db: Db, redis: Redis, ownerId: string): Promise<DashboardMetrics> {
  const ownedProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, ownerId));
  const searchableProjects = await db.select({ id: projects.id }).from(projects);
  const searchableUsers = await db.select({ id: users.id }).from(users).where(ne(users.id, ownerId));
  const profileSkills = await db.select({ skillId: userSkills.skillId }).from(userSkills).where(eq(userSkills.userId, ownerId));
  const ownedProjectIds = ownedProjects.map((project) => project.id);
  const incomingApplications = ownedProjectIds.length > 0
    ? await db
        .select({ id: projectApplications.id, status: projectApplications.status })
        .from(projectApplications)
        .where(inArray(projectApplications.projectId, ownedProjectIds))
    : [];

  return {
    ownedProjectsCount: ownedProjects.length,
    searchableProjectsCount: searchableProjects.length,
    searchableUsersCount: searchableUsers.length,
    incomingApplicationsCount: incomingApplications.length,
    pendingApplicationsCount: incomingApplications.filter((application) => application.status === "pending").length,
    acceptedTeamMembersCount: incomingApplications.filter((application) => application.status === "accepted").length,
    profileSkillsCount: profileSkills.length,
    demoExpiresAt: await getDemoExpiresAt(redis, ownerId),
  };
}

export function startDemoCleanupJob(options: {
  db: Db;
  redis: Redis;
  intervalMs: number;
  logger: { info: (payload: unknown) => void; error: (payload: unknown) => void };
}): () => void {
  const run = async (): Promise<void> => {
    try {
      const keys = await options.redis.keys("teamnova:demo:*");
      for (const key of keys) {
        const raw = await options.redis.get(key);
        if (!raw) {
          continue;
        }
        const run = JSON.parse(raw) as DemoRun;
        if (Date.parse(run.expiresAt) <= Date.now()) {
          await cleanupDemoWorkspace(options.db, options.redis, run.ownerId);
          options.logger.info({ ownerId: run.ownerId, msg: "expired demo workspace cleaned" });
        }
      }
    } catch (err) {
      options.logger.error({ err: String(err) });
    }
  };

  const timer = setInterval(() => void run(), options.intervalMs);
  void run();
  return () => clearInterval(timer);
}
