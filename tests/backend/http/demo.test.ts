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

describeWithContainers("Dashboard and demo workspace", () => {
  let h: TestHarness;

  beforeAll(async () => { h = await createTestApp(); }, 180_000);
  afterAll(async () => { await h?.close(); });
  beforeEach(async () => {
    await resetDb(h.pool);
    await h.redis.flushall();
  });

  it("seeds real demo rows, reports dashboard metrics, and cleans them up", async () => {
    const token = await register(h.app, "owner-demo@example.com", "Owner Demo");

    const seed = await h.app.inject({
      method: "POST",
      url: "/api/demo/seed",
      headers: auth(token),
    });
    expect(seed.statusCode).toBe(201);
    expect(seed.json()).toMatchObject({
      projectsCreated: 1,
      applicantsCreated: 3,
      applicationsCreated: 3,
    });

    const projects = await h.app.inject({
      method: "GET",
      url: "/api/projects",
      headers: auth(token),
    });
    expect(projects.statusCode).toBe(200);
    expect(projects.json()).toHaveLength(1);

    const incoming = await h.app.inject({
      method: "GET",
      url: "/api/applications/incoming",
      headers: auth(token),
    });
    expect(incoming.statusCode).toBe(200);
    expect(incoming.json()).toHaveLength(3);
    expect(incoming.json().some((application: { status: string }) => application.status === "accepted")).toBe(true);

    const dashboard = await h.app.inject({
      method: "GET",
      url: "/api/dashboard",
      headers: auth(token),
    });
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.json()).toMatchObject({
      ownedProjectsCount: 1,
      searchableProjectsCount: 1,
      searchableUsersCount: 3,
      incomingApplicationsCount: 3,
      pendingApplicationsCount: 1,
      acceptedTeamMembersCount: 1,
    });
    expect(dashboard.json().demoExpiresAt).toBe(seed.json().expiresAt);

    const cleanup = await h.app.inject({
      method: "DELETE",
      url: "/api/demo",
      headers: auth(token),
    });
    expect(cleanup.statusCode).toBe(200);
    expect(cleanup.json()).toEqual({
      projectsDeleted: 1,
      usersDeleted: 3,
      applicationsDeleted: 3,
    });

    const dashboardAfterCleanup = await h.app.inject({
      method: "GET",
      url: "/api/dashboard",
      headers: auth(token),
    });
    expect(dashboardAfterCleanup.json()).toMatchObject({
      ownedProjectsCount: 0,
      searchableProjectsCount: 0,
      searchableUsersCount: 0,
      incomingApplicationsCount: 0,
    });
  });
});
