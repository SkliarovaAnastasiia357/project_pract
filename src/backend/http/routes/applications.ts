import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { projectApplications, projects, skills, userSkills, users } from "../../db/schema.js";
import { ApiError } from "../errors.js";
import { requireAuth } from "../middleware/requireAuth.js";

const applicationSchema = z.object({
  message: z.string().trim().max(400, "Сообщение не должно превышать 400 символов").default(""),
});

const decisionSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
});

const projectParamsSchema = z.object({
  projectId: z.string().uuid("Некорректный идентификатор проекта"),
});

const applicationParamsSchema = z.object({
  applicationId: z.string().uuid("Некорректный идентификатор заявки"),
});

function applicationResponse(application: typeof projectApplications.$inferSelect) {
  return {
    id: application.id,
    projectId: application.projectId,
    applicantId: application.applicantId,
    message: application.message,
    status: application.status,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

export async function registerApplicationRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/projects/:projectId/applications", { preHandler: requireAuth }, async (req, reply) => {
    const { projectId } = projectParamsSchema.parse(req.params);
    const input = applicationSchema.parse(req.body);
    const [project] = await app.deps.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw new ApiError("Проект не найден", 404);
    }

    if (project.ownerId === req.user!.id) {
      throw new ApiError("Нельзя отправить заявку в собственный проект", 400);
    }

    const [application] = await app.deps.db
      .insert(projectApplications)
      .values({ projectId, applicantId: req.user!.id, message: input.message })
      .onConflictDoNothing({ target: [projectApplications.projectId, projectApplications.applicantId] })
      .returning();

    if (!application) {
      throw new ApiError("Заявка уже отправлена", 409);
    }

    reply.code(201);
    return applicationResponse(application);
  });

  app.get("/api/applications/incoming", { preHandler: requireAuth }, async (req) => {
    const rows = await app.deps.db
      .select({
        id: projectApplications.id,
        message: projectApplications.message,
        status: projectApplications.status,
        createdAt: projectApplications.createdAt,
        updatedAt: projectApplications.updatedAt,
        projectId: projects.id,
        projectTitle: projects.title,
        applicantId: users.id,
        applicantEmail: users.email,
        applicantName: users.name,
        applicantBio: users.bio,
        skillId: skills.id,
        skillName: skills.name,
      })
      .from(projectApplications)
      .innerJoin(projects, eq(projects.id, projectApplications.projectId))
      .innerJoin(users, eq(users.id, projectApplications.applicantId))
      .leftJoin(userSkills, eq(userSkills.userId, users.id))
      .leftJoin(skills, eq(skills.id, userSkills.skillId))
      .where(eq(projects.ownerId, req.user!.id))
      .orderBy(desc(projectApplications.createdAt));

    const applications = new Map<string, {
      id: string;
      message: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      project: { id: string; title: string };
      applicant: { id: string; email: string; name: string; bio: string; skills: { id: string; name: string }[] };
    }>();

    for (const row of rows) {
      const application = applications.get(row.id) ?? {
        id: row.id,
        message: row.message,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        project: { id: row.projectId, title: row.projectTitle },
        applicant: {
          id: row.applicantId,
          email: row.applicantEmail,
          name: row.applicantName,
          bio: row.applicantBio,
          skills: [],
        },
      };

      if (row.skillId && row.skillName && !application.applicant.skills.some((skill) => skill.id === row.skillId)) {
        application.applicant.skills.push({ id: row.skillId, name: row.skillName });
      }

      applications.set(row.id, application);
    }

    return [...applications.values()].map((application) => ({
      ...application,
      applicant: {
        ...application.applicant,
        skills: application.applicant.skills.sort((left, right) => left.name.localeCompare(right.name, "ru")),
      },
    }));
  });

  app.patch("/api/applications/:applicationId", { preHandler: requireAuth }, async (req) => {
    const { applicationId } = applicationParamsSchema.parse(req.params);
    const input = decisionSchema.parse(req.body);
    const [application] = await app.deps.db
      .select({
        id: projectApplications.id,
        projectId: projectApplications.projectId,
        ownerId: projects.ownerId,
      })
      .from(projectApplications)
      .innerJoin(projects, eq(projects.id, projectApplications.projectId))
      .where(eq(projectApplications.id, applicationId))
      .limit(1);

    if (!application) {
      throw new ApiError("Заявка не найдена", 404);
    }

    if (application.ownerId !== req.user!.id) {
      throw new ApiError("Недостаточно прав для изменения заявки", 403);
    }

    const [updated] = await app.deps.db
      .update(projectApplications)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(projectApplications.id, applicationId))
      .returning();

    if (!updated) {
      throw new ApiError("Заявка не найдена", 404);
    }

    return applicationResponse(updated);
  });
}
