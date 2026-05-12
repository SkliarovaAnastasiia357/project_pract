import type { FastifyInstance } from "fastify";
import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { projects, skills, userSkills, users } from "../../db/schema.js";
import { ApiError } from "../errors.js";
import { requireAuth } from "../middleware/requireAuth.js";

const projectSchema = z.object({
  title: z.string().trim().min(1, "Название проекта обязательно").max(80, "Название проекта не должно превышать 80 символов"),
  description: z.string().trim().min(1, "Опишите идею проекта").max(500, "Описание не должно превышать 500 символов"),
  stack: z.string().trim().max(160, "Стек не должно превышать 160 символов").default(""),
  roles: z.string().trim().max(160, "Роли не должно превышать 160 символов").default(""),
});

const projectParamsSchema = z.object({
  projectId: z.string().uuid("Некорректный идентификатор проекта"),
});

function projectResponse(project: typeof projects.$inferSelect) {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    stack: project.stack,
    roles: project.roles,
    updatedAt: project.updatedAt,
  };
}

function searchPattern(query: string): string {
  return `%${query.replace(/[%_]/g, "\\$&")}%`;
}

export async function registerProjectRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/projects", { preHandler: requireAuth }, async (req) => {
    const rows = await app.deps.db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, req.user!.id))
      .orderBy(desc(projects.updatedAt));

    return rows.map(projectResponse);
  });

  app.post("/api/projects", { preHandler: requireAuth }, async (req, reply) => {
    const input = projectSchema.parse(req.body);
    const [project] = await app.deps.db
      .insert(projects)
      .values({ ownerId: req.user!.id, ...input })
      .returning();

    if (!project) {
      throw new ApiError("Внутренняя ошибка сервера", 500);
    }

    reply.code(201);
    return projectResponse(project);
  });

  app.get("/api/projects/:projectId", { preHandler: requireAuth }, async (req) => {
    const { projectId } = projectParamsSchema.parse(req.params);
    const [project] = await app.deps.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, req.user!.id)))
      .limit(1);

    if (!project) {
      throw new ApiError("Проект не найден", 404);
    }

    return projectResponse(project);
  });

  app.put("/api/projects/:projectId", { preHandler: requireAuth }, async (req) => {
    const { projectId } = projectParamsSchema.parse(req.params);
    const input = projectSchema.parse(req.body);
    const [project] = await app.deps.db
      .update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, req.user!.id)))
      .returning();

    if (!project) {
      throw new ApiError("Проект не найден", 404);
    }

    return projectResponse(project);
  });

  app.delete("/api/projects/:projectId", { preHandler: requireAuth }, async (req, reply) => {
    const { projectId } = projectParamsSchema.parse(req.params);
    const deleted = await app.deps.db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, req.user!.id)))
      .returning({ id: projects.id });

    if (deleted.length === 0) {
      throw new ApiError("Проект не найден", 404);
    }

    reply.code(204);
    return null;
  });

  app.get("/api/search/projects", { preHandler: requireAuth }, async (req) => {
    const { q = "" } = req.query as { q?: string };
    const query = q.trim();
    const pattern = searchPattern(query);
    const statusExpr = sql<string | null>`(
      select pa.status
      from project_applications pa
      where pa.project_id = ${projects.id} and pa.applicant_id = ${req.user!.id}
      limit 1
    )`;

    const base = app.deps.db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        stack: projects.stack,
        roles: projects.roles,
        updatedAt: projects.updatedAt,
        ownerId: users.id,
        ownerName: users.name,
        applicationStatus: statusExpr,
      })
      .from(projects)
      .innerJoin(users, eq(users.id, projects.ownerId));

    const rows = query
      ? await base
          .where(or(
            ilike(projects.title, pattern),
            ilike(projects.description, pattern),
            ilike(projects.stack, pattern),
            ilike(projects.roles, pattern),
          ))
          .orderBy(desc(projects.updatedAt))
      : await base.orderBy(desc(projects.updatedAt));

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      stack: row.stack,
      roles: row.roles,
      updatedAt: row.updatedAt,
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      applicationStatus: row.applicationStatus ?? null,
    }));
  });

  app.get("/api/search/users", { preHandler: requireAuth }, async (req) => {
    const { q = "" } = req.query as { q?: string };
    const query = q.trim();

    const base = app.deps.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        bio: users.bio,
        skillId: skills.id,
        skillName: skills.name,
      })
      .from(users)
      .leftJoin(userSkills, eq(userSkills.userId, users.id))
      .leftJoin(skills, eq(skills.id, userSkills.skillId));

    const rows = await base.where(ne(users.id, req.user!.id));

    const byUser = new Map<string, { id: string; email: string; name: string; bio: string; skills: { id: string; name: string }[] }>();
    for (const row of rows) {
      const user = byUser.get(row.id) ?? { id: row.id, email: row.email, name: row.name, bio: row.bio, skills: [] };
      if (row.skillId && row.skillName && !user.skills.some((skill) => skill.id === row.skillId)) {
        user.skills.push({ id: row.skillId, name: row.skillName });
      }
      byUser.set(row.id, user);
    }

    return [...byUser.values()]
      .filter((user) => {
        if (!query) {
          return true;
        }

        const normalizedQuery = query.toLowerCase();
        return [user.name, user.bio, ...user.skills.map((skill) => skill.name)]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .map((user) => ({
      ...user,
      skills: user.skills.sort((left, right) => left.name.localeCompare(right.name, "ru")),
    }));
  });
}
