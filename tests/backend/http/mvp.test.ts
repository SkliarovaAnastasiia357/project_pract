import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { describeWithContainers } from "../helpers/containerRuntime.js";
import { createTestApp, resetDb, type TestHarness } from "./helpers/testApp.js";

async function register(app: TestHarness["app"], email: string, name: string): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/register",
    payload: { email, name, password: "secret1", confirmPassword: "secret1" },
  });
  expect(res.statusCode).toBe(201);
  return res.json().token as string;
}

function auth(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}

describeWithContainers("MVP profile, projects, search and applications", () => {
  let h: TestHarness;

  beforeAll(async () => { h = await createTestApp(); }, 180_000);
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await resetDb(h.pool);
    await h.redis.flushall();
  });

  it("updates profile bio and skills through real API", async () => {
    const token = await register(h.app, "profile@example.com", "Profile User");

    const initial = await h.app.inject({
      method: "GET",
      url: "/api/profile",
      headers: auth(token),
    });
    expect(initial.statusCode).toBe(200);
    expect(initial.json()).toEqual({ bio: "", skills: [] });

    const bio = await h.app.inject({
      method: "PATCH",
      url: "/api/profile",
      headers: auth(token),
      payload: { bio: "React developer looking for product teams." },
    });
    expect(bio.statusCode).toBe(200);
    expect(bio.json().bio).toBe("React developer looking for product teams.");

    const skill = await h.app.inject({
      method: "POST",
      url: "/api/profile/skills",
      headers: auth(token),
      payload: { name: "React" },
    });
    expect(skill.statusCode).toBe(201);
    expect(skill.json().skills).toMatchObject([{ name: "React" }]);

    const duplicate = await h.app.inject({
      method: "POST",
      url: "/api/profile/skills",
      headers: auth(token),
      payload: { name: "react" },
    });
    expect(duplicate.statusCode).toBe(409);

    const skillId = skill.json().skills[0].id as string;
    const removed = await h.app.inject({
      method: "DELETE",
      url: `/api/profile/skills/${skillId}`,
      headers: auth(token),
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json().skills).toEqual([]);

    const invalidSkill = await h.app.inject({
      method: "DELETE",
      url: "/api/profile/skills/not-a-uuid",
      headers: auth(token),
    });
    expect(invalidSkill.statusCode).toBe(400);
  });

  it("runs project search and application workflow across two users", async () => {
    const ownerToken = await register(h.app, "owner@example.com", "Owner");
    const participantToken = await register(h.app, "participant@example.com", "Participant");

    const created = await h.app.inject({
      method: "POST",
      url: "/api/projects",
      headers: auth(ownerToken),
      payload: {
        title: "Teamnova Match",
        description: "Search service for IT teams.",
        stack: "React, TypeScript, Fastify",
        roles: "Frontend developer, QA",
      },
    });
    expect(created.statusCode).toBe(201);
    const projectId = created.json().id as string;

    await h.app.inject({
      method: "PATCH",
      url: "/api/profile",
      headers: auth(participantToken),
      payload: { bio: "Frontend engineer with React experience." },
    });
    await h.app.inject({
      method: "POST",
      url: "/api/profile/skills",
      headers: auth(participantToken),
      payload: { name: "React" },
    });
    await h.app.inject({
      method: "POST",
      url: "/api/profile/skills",
      headers: auth(participantToken),
      payload: { name: "Node.js" },
    });

    const projects = await h.app.inject({
      method: "GET",
      url: "/api/search/projects?q=React",
      headers: auth(participantToken),
    });
    expect(projects.statusCode).toBe(200);
    expect(projects.json()[0]).toMatchObject({
      id: projectId,
      title: "Teamnova Match",
      ownerName: "Owner",
      applicationStatus: null,
    });

    const application = await h.app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/applications`,
      headers: auth(participantToken),
      payload: { message: "I can help with React UI." },
    });
    expect(application.statusCode).toBe(201);
    const applicationId = application.json().id as string;

    const duplicate = await h.app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/applications`,
      headers: auth(participantToken),
      payload: { message: "Second try." },
    });
    expect(duplicate.statusCode).toBe(409);

    const incoming = await h.app.inject({
      method: "GET",
      url: "/api/applications/incoming",
      headers: auth(ownerToken),
    });
    expect(incoming.statusCode).toBe(200);
    const incomingBody = incoming.json();
    expect(incomingBody).toHaveLength(1);
    expect(incomingBody[0]).toMatchObject({
      id: applicationId,
      status: "pending",
      project: { id: projectId, title: "Teamnova Match" },
      applicant: { email: "participant@example.com", name: "Participant" },
    });
    expect(incomingBody[0].applicant.skills.map((skill: { name: string }) => skill.name).sort()).toEqual([
      "Node.js",
      "React",
    ]);

    const decision = await h.app.inject({
      method: "PATCH",
      url: `/api/applications/${applicationId}`,
      headers: auth(ownerToken),
      payload: { status: "accepted" },
    });
    expect(decision.statusCode).toBe(200);
    expect(decision.json().status).toBe("accepted");

    const users = await h.app.inject({
      method: "GET",
      url: "/api/search/users?q=React",
      headers: auth(ownerToken),
    });
    expect(users.statusCode).toBe(200);
    expect(users.json()).toMatchObject([
      {
        email: "participant@example.com",
        name: "Participant",
        skills: [{ name: "Node.js" }, { name: "React" }],
      },
    ]);

    const searchedAgain = await h.app.inject({
      method: "GET",
      url: "/api/search/projects?q=React",
      headers: auth(participantToken),
    });
    expect(searchedAgain.json()[0].applicationStatus).toBe("accepted");

    const invalidProject = await h.app.inject({
      method: "POST",
      url: "/api/projects/not-a-uuid/applications",
      headers: auth(participantToken),
      payload: { message: "Bad id." },
    });
    expect(invalidProject.statusCode).toBe(400);

    const invalidApplication = await h.app.inject({
      method: "PATCH",
      url: "/api/applications/not-a-uuid",
      headers: auth(ownerToken),
      payload: { status: "rejected" },
    });
    expect(invalidApplication.statusCode).toBe(400);
  });
});
