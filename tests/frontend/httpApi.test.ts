import assert from "node:assert/strict";

import { httpApi } from "../../src/shared/api/httpApi.ts";
import * as authClient from "../../src/shared/api/authClient.ts";

type StubCall = { url: string; method: string; headers: Record<string, string>; body?: string };

function installFetch(
  handler: (call: StubCall, callIdx: number) => { status: number; body?: unknown },
): StubCall[] {
  const calls: StubCall[] = [];
  (globalThis as Record<string, unknown>).fetch = async (url: string, init?: RequestInit) => {
    const call: StubCall = {
      url,
      method: init?.method ?? "GET",
      headers: (init?.headers as Record<string, string>) ?? {},
      body: init?.body as string | undefined,
    };
    const idx = calls.length;
    calls.push(call);
    const r = handler(call, idx);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      statusText: "",
      async json() {
        return r.body ?? {};
      },
    } as Response;
  };
  return calls;
}

export async function runHttpApiTests(): Promise<void> {
  // Test 1: 401 triggers single refresh then retry
  authClient.setSession({ token: "expired", user: { id: "u", email: "a@example.com", name: "A", bio: "" } });
  const calls1 = installFetch((call, idx) => {
    if (call.url.endsWith("/api/me") && idx === 0) {
      return { status: 401, body: { message: "expired" } };
    }
    if (call.url.endsWith("/api/auth/refresh")) {
      return { status: 200, body: { token: "new-tok", user: { id: "u", email: "a@example.com", name: "A", bio: "" } } };
    }
    if (call.url.endsWith("/api/me") && idx === 2) {
      return { status: 200, body: { id: "u", email: "a@example.com", name: "A", bio: "" } };
    }
    return { status: 500 };
  });
  const me = await httpApi.getMe("expired");
  assert.equal(me.id, "u", "getMe должен вернуть пользователя после обновления токена");
  assert.equal(calls1.length, 3, "должно быть 3 запроса: оригинальный + refresh + повтор");
  assert.equal(
    calls1[2]!.headers.Authorization,
    "Bearer new-tok",
    "повторный запрос должен использовать новый токен",
  );

  // Test 2: concurrent 401s share one refresh call
  authClient.setSession({ token: "t", user: { id: "u", email: "a@example.com", name: "A", bio: "" } });
  let refreshCount = 0;
  installFetch((call) => {
    if (call.url.endsWith("/api/me")) {
      return call.headers.Authorization === "Bearer new"
        ? { status: 200, body: { id: "u", email: "a@example.com", name: "A", bio: "" } }
        : { status: 401 };
    }
    if (call.url.endsWith("/api/auth/refresh")) {
      refreshCount++;
      return { status: 200, body: { token: "new", user: { id: "u", email: "a@example.com", name: "A", bio: "" } } };
    }
    return { status: 500 };
  });
  const results = await Promise.all([httpApi.getMe("t"), httpApi.getMe("t"), httpApi.getMe("t")]);
  assert.equal(refreshCount, 1, "concurrent 401s должны делать только один /refresh запрос (single-flight)");
  assert.equal(results.length, 3, "все три параллельных запроса должны завершиться успешно");
  assert.equal(results[0]!.id, "u", "первый результат должен содержать корректный id");

  // Test 3: register skips refresh and sets credentials
  authClient.setSession(null);
  const calls3 = installFetch((call) => {
    if (call.url.endsWith("/api/register")) {
      return { status: 201, body: { token: "t", user: { id: "u", email: "a@example.com", name: "A", bio: "" } } };
    }
    return { status: 500 };
  });
  const res = await httpApi.register({
    email: "a@example.com",
    name: "A",
    password: "secret1",
    confirmPassword: "secret1",
  });
  assert.equal(res.token, "t", "register должен вернуть токен из ответа");
  assert.equal(calls3.length, 1, "register не должен вызывать дополнительных запросов");
  assert.ok(
    !calls3.some((c) => c.url.endsWith("/api/auth/refresh")),
    "register не должен вызывать /refresh",
  );

  // Test 4: Sprint 4 endpoints use expected REST contract
  authClient.setSession({ token: "mvp-token", user: { id: "u", email: "a@example.com", name: "A", bio: "" } });
  const calls4 = installFetch((call) => {
    if (call.url.endsWith("/api/search/projects?q=React")) return { status: 200, body: [] };
    if (call.url.endsWith("/api/search/users?q=React")) return { status: 200, body: [] };
    if (call.url.endsWith("/api/projects/project-1/applications")) {
      return {
        status: 201,
        body: {
          id: "application-1",
          projectId: "project-1",
          applicantId: "u",
          message: "Хочу в команду",
          status: "pending",
          createdAt: "2026-05-12T00:00:00.000Z",
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
      };
    }
    if (call.url.endsWith("/api/applications/incoming")) return { status: 200, body: [] };
    if (call.url.endsWith("/api/applications/application-1")) {
      return {
        status: 200,
        body: {
          id: "application-1",
          projectId: "project-1",
          applicantId: "u",
          message: "Хочу в команду",
          status: "rejected",
          createdAt: "2026-05-12T00:00:00.000Z",
          updatedAt: "2026-05-12T00:00:01.000Z",
        },
      };
    }
    return { status: 500 };
  });

  await httpApi.searchProjects("mvp-token", { query: "React" });
  await httpApi.searchUsers("mvp-token", { query: "React" });
  await httpApi.applyToProject("mvp-token", "project-1", { message: "Хочу в команду" });
  await httpApi.listIncomingApplications("mvp-token");
  const rejected = await httpApi.decideApplication("mvp-token", "application-1", { status: "rejected" });

  assert.deepEqual(
    calls4.map((call) => [call.method, call.url]),
    [
      ["GET", "/api/search/projects?q=React"],
      ["GET", "/api/search/users?q=React"],
      ["POST", "/api/projects/project-1/applications"],
      ["GET", "/api/applications/incoming"],
      ["PATCH", "/api/applications/application-1"],
    ],
    "Sprint 4 httpApi методы должны использовать ожидаемые URL и HTTP методы",
  );
  assert.equal(
    calls4[2]!.body,
    JSON.stringify({ message: "Хочу в команду" }),
    "applyToProject должен отправлять сообщение заявки",
  );
  assert.equal(
    calls4[4]!.body,
    JSON.stringify({ status: "rejected" }),
    "decideApplication должен отправлять выбранный статус",
  );
  assert.equal(rejected.status, "rejected", "decideApplication должен возвращать статус решения");
}
