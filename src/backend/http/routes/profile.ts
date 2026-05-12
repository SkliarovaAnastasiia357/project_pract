import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { skills, userSkills, users } from "../../db/schema.js";
import { ApiError } from "../errors.js";
import { requireAuth } from "../middleware/requireAuth.js";

const profileSchema = z.object({
  bio: z.string().max(400, "Описание не должно превышать 400 символов").default(""),
});

const skillSchema = z.object({
  name: z.string().trim().min(1, "Введите навык").max(80, "Навык не должен превышать 80 символов"),
});

const skillParamsSchema = z.object({
  skillId: z.string().uuid("Некорректный идентификатор навыка"),
});

function normalizeSkillName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeSkillKey(name: string): string {
  return normalizeSkillName(name).toLowerCase();
}

async function getProfile(app: FastifyInstance, userId: string) {
  const rows = await app.deps.db
    .select({
      bio: users.bio,
      skillId: skills.id,
      skillName: skills.name,
    })
    .from(users)
    .leftJoin(userSkills, eq(userSkills.userId, users.id))
    .leftJoin(skills, eq(skills.id, userSkills.skillId))
    .where(eq(users.id, userId));

  if (rows.length === 0) {
    throw new ApiError("Требуется авторизация", 401);
  }

  return {
    bio: rows[0]!.bio,
    skills: rows
      .filter((row) => row.skillId && row.skillName)
      .map((row) => ({ id: row.skillId!, name: row.skillName! }))
      .sort((left, right) => left.name.localeCompare(right.name, "ru")),
  };
}

export async function registerProfileRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/profile", { preHandler: requireAuth }, async (req) => {
    return getProfile(app, req.user!.id);
  });

  app.patch("/api/profile", { preHandler: requireAuth }, async (req) => {
    const input = profileSchema.parse(req.body);
    const [user] = await app.deps.db
      .update(users)
      .set({ bio: input.bio.trim(), updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning();

    if (!user) {
      throw new ApiError("Требуется авторизация", 401);
    }

    return getProfile(app, req.user!.id);
  });

  app.post("/api/profile/skills", { preHandler: requireAuth }, async (req, reply) => {
    const input = skillSchema.parse(req.body);
    const name = normalizeSkillName(input.name);
    const normalizedName = normalizeSkillKey(name);

    let [skill] = await app.deps.db
      .insert(skills)
      .values({ name, normalizedName })
      .onConflictDoNothing({ target: skills.normalizedName })
      .returning();

    skill ??= (await app.deps.db
      .select()
      .from(skills)
      .where(eq(skills.normalizedName, normalizedName))
      .limit(1))[0];

    if (!skill) {
      throw new ApiError("Внутренняя ошибка сервера", 500);
    }

    const inserted = await app.deps.db
      .insert(userSkills)
      .values({ userId: req.user!.id, skillId: skill.id })
      .onConflictDoNothing({ target: [userSkills.userId, userSkills.skillId] })
      .returning({ userId: userSkills.userId });

    if (inserted.length === 0) {
      throw new ApiError("Навык уже добавлен", 409, { name: "Навык уже добавлен" });
    }

    reply.code(201);
    return getProfile(app, req.user!.id);
  });

  app.delete("/api/profile/skills/:skillId", { preHandler: requireAuth }, async (req) => {
    const { skillId } = skillParamsSchema.parse(req.params);
    await app.deps.db
      .delete(userSkills)
      .where(and(eq(userSkills.userId, req.user!.id), eq(userSkills.skillId, skillId)));

    return getProfile(app, req.user!.id);
  });
}
