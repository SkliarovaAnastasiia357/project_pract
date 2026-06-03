import assert from "node:assert/strict";

import { ApiClientError, MOCK_DB_KEY } from "../../src/shared/api/contracts.ts";
import { mockApi, resetMockApiState } from "../../src/shared/api/mockApi.ts";
import { writeJson } from "../../src/shared/storage.ts";

async function expectApiError(
  callback: () => Promise<unknown>,
  expectedMessage: string,
  expectedField?: { name: string; value: string },
): Promise<void> {
  try {
    await callback();
    assert.fail("ожидалась ошибка API, но запрос завершился успешно");
  } catch (error) {
    assert.equal(error instanceof ApiClientError, true, "ошибка должна иметь тип ApiClientError");

    const apiError = error as ApiClientError;
    assert.equal(apiError.message, expectedMessage, "ошибка API должна содержать ожидаемое сообщение");

    if (expectedField) {
      assert.equal(
        apiError.fieldErrors?.[expectedField.name],
        expectedField.value,
        `ошибка поля ${expectedField.name} должна содержать ожидаемое сообщение`,
      );
    }
  }
}

export async function runMockApiTests(): Promise<void> {
  resetMockApiState();

  const registrationSession = await mockApi.register({
    email: "frontend@example.com",
    name: "Frontend Dev",
    password: "StrongPass1",
    confirmPassword: "StrongPass1",
  });

  assert.equal(registrationSession.user.email, "frontend@example.com", "регистрация должна возвращать пользователя");
  assert.equal(registrationSession.token.startsWith("mock-token-"), true, "регистрация должна возвращать mock jwt");

  const restoredRegistrationSession = await mockApi.restoreSession();
  assert.deepEqual(
    restoredRegistrationSession,
    registrationSession,
    "mockApi должен восстанавливать активную сессию после перезагрузки клиента",
  );

  const initialProfile = await mockApi.getProfile(registrationSession.token);
  assert.deepEqual(initialProfile.skills, [], "у нового пользователя список навыков должен быть пустым");
  assert.equal(initialProfile.bio, "", "у нового пользователя описание должно быть пустым");

  const updatedProfile = await mockApi.updateProfile(registrationSession.token, {
    bio: "Делаю интерфейсы для IT-команд.",
  });
  assert.equal(updatedProfile.bio, "Делаю интерфейсы для IT-команд.", "описание профиля должно обновляться");

  const profileWithSkill = await mockApi.addSkill(registrationSession.token, { name: "React" });
  assert.equal(profileWithSkill.skills.length, 1, "навык должен добавляться в профиль");
  assert.equal(profileWithSkill.skills[0]?.name, "React", "название навыка должно сохраняться");

  await expectApiError(
    () => mockApi.addSkill(registrationSession.token, { name: "React" }),
    "Навык уже добавлен",
    { name: "name", value: "Навык уже добавлен" },
  );

  const profileWithoutSkill = await mockApi.deleteSkill(registrationSession.token, profileWithSkill.skills[0]!.id);
  assert.deepEqual(profileWithoutSkill.skills, [], "навык должен удаляться без перезагрузки профиля");

  const emptyProjects = await mockApi.listProjects(registrationSession.token);
  assert.deepEqual(emptyProjects, [], "у нового пользователя список проектов должен быть пустым");

  await expectApiError(
    () =>
      mockApi.createProject(registrationSession.token, {
        title: "",
        description: "Описание",
        stack: "React, TypeScript",
        roles: "Frontend developer",
      }),
    "Исправьте ошибки в форме проекта",
    { name: "title", value: "Название проекта обязательно" },
  );

  const createdProject = await mockApi.createProject(registrationSession.token, {
    title: "Teamnova App",
    description: "Платформа для поиска IT-команд.",
    stack: "React, TypeScript, Go",
    roles: "Frontend developer, QA",
  });
  assert.equal(createdProject.title, "Teamnova App", "проект должен успешно создаваться");

  const fetchedProject = await mockApi.getProject(registrationSession.token, createdProject.id);
  assert.equal(fetchedProject.description, "Платформа для поиска IT-команд.", "проект должен загружаться для редактирования");

  const updatedProject = await mockApi.updateProject(registrationSession.token, createdProject.id, {
    title: "Teamnova Workspace",
    description: "Обновлённое описание.",
    stack: "React, TypeScript, Go",
    roles: "Frontend developer, QA, PM",
  });
  assert.equal(updatedProject.title, "Teamnova Workspace", "проект должен обновляться");
  assert.equal(updatedProject.roles.includes("PM"), true, "изменения ролей должны сохраняться");

  const listWithProject = await mockApi.listProjects(registrationSession.token);
  assert.equal(listWithProject.length, 1, "после создания проект должен появляться в списке");

  await mockApi.deleteProject(registrationSession.token, createdProject.id);
  const projectsAfterDelete = await mockApi.listProjects(registrationSession.token);
  assert.deepEqual(projectsAfterDelete, [], "после удаления проект должен исчезать из списка");

  await mockApi.logout(registrationSession.token);
  await expectApiError(
    () => mockApi.getProfile(registrationSession.token),
    "Требуется авторизация",
  );

  writeJson(MOCK_DB_KEY, {
    users: [
      {
        id: "user-legacy-owner",
        email: "legacy-owner@example.com",
        name: "Legacy Owner",
        password: "StrongPass1",
        bio: "",
        skills: [],
        createdAt: "2026-05-12T00:00:00.000Z",
      },
      {
        id: "user-legacy-participant",
        email: "legacy-participant@example.com",
        name: "Legacy Participant",
        password: "StrongPass1",
        bio: "",
        skills: [],
        createdAt: "2026-05-12T00:00:00.000Z",
      },
    ],
    projects: [
      {
        id: "project-legacy",
        userId: "user-legacy-owner",
        title: "Legacy Project",
        description: "Old mock payload without applications array.",
        stack: "React",
        roles: "QA",
        updatedAt: "2026-05-12T00:00:00.000Z",
      },
      {
        id: "project-title-only",
        userId: "user-legacy-owner",
        title: "React Title Only",
        description: "Title match must not increase match percent.",
        stack: "Go",
        roles: "Backend developer",
        updatedAt: "2026-05-13T00:00:00.000Z",
      },
    ],
    sessions: [{ token: "legacy-token", userId: "user-legacy-participant" }],
  });

  const legacyResults = await mockApi.searchProjects("legacy-token", { query: "React" });
  assert.equal(legacyResults.length, 2, "старый mock payload без applications должен мигрировать на чтении");
  assert.equal(legacyResults[0]!.id, "project-legacy", "проект с совпадением в стеке должен быть выше совпадения только в названии");
  assert.equal(legacyResults[0]!.matchPercent, 100, "совпадение в стеке должно давать полный процент для одного токена");
  assert.equal(legacyResults[1]!.matchPercent, 0, "совпадение в названии не должно повышать процент мэтчинга");
  assert.equal(legacyResults[0]!.applicationStatus, null, "у legacy проекта без заявок должен быть пустой статус");

  resetMockApiState();
  const demoOwner = await mockApi.register({
    email: "demo-owner@example.com",
    name: "Demo Owner",
    password: "StrongPass1",
    confirmPassword: "StrongPass1",
  });

  const seeded = await mockApi.seedDemoWorkspace(demoOwner.token);
  assert.equal(seeded.projectsCreated, 1, "demo seed должен создать реальный проект");
  assert.equal(seeded.applicantsCreated, 3, "demo seed должен создать реальных кандидатов");
  assert.equal(seeded.applicationsCreated, 3, "demo seed должен создать реальные заявки");

  const seededProjects = await mockApi.listProjects(demoOwner.token);
  assert.equal(seededProjects.length, 1, "demo проект должен быть виден в обычном списке проектов");

  const seededIncoming = await mockApi.listIncomingApplications(demoOwner.token);
  assert.equal(seededIncoming.length, 3, "demo заявки должны быть видны как обычные входящие заявки");
  assert.equal(
    seededIncoming.some((application) => application.status === "accepted"),
    true,
    "demo seed должен содержать принятого участника для показа команды",
  );

  const metrics = await mockApi.getDashboardMetrics(demoOwner.token);
  assert.equal(metrics.ownedProjectsCount, 1, "dashboard должен считать проекты из реальных mock-данных");
  assert.equal(metrics.searchableUsersCount, 3, "dashboard должен считать реальных demo-кандидатов");
  assert.equal(metrics.incomingApplicationsCount, 3, "dashboard должен считать реальные заявки");
  assert.equal(metrics.acceptedTeamMembersCount, 1, "dashboard должен считать принятых участников");
  assert.equal(metrics.demoExpiresAt, seeded.expiresAt, "dashboard должен показывать TTL demo-данных");

  const cleanup = await mockApi.cleanupDemoWorkspace(demoOwner.token);
  assert.equal(cleanup.projectsDeleted, 1, "cleanup должен удалить demo-проект");
  assert.equal(cleanup.usersDeleted, 3, "cleanup должен удалить demo-кандидатов");
  assert.equal(cleanup.applicationsDeleted, 3, "cleanup должен удалить demo-заявки");
  assert.equal((await mockApi.listProjects(demoOwner.token)).length, 0, "после cleanup demo-проекты должны исчезнуть");

  writeJson(MOCK_DB_KEY, {
    users: [
      {
        id: "user-expired-owner",
        email: "expired-owner@example.com",
        name: "Expired Owner",
        password: "StrongPass1",
        bio: "",
        skills: [],
        createdAt: "2026-05-12T00:00:00.000Z",
      },
      {
        id: "user-expired-demo",
        email: "demo-expired@example.com",
        name: "Expired Candidate",
        password: "StrongPass1",
        bio: "",
        skills: [],
        createdAt: "2026-05-12T00:00:00.000Z",
      },
    ],
    projects: [
      {
        id: "project-expired-demo",
        userId: "user-expired-owner",
        title: "Demo expired",
        description: "Expired demo project",
        stack: "React",
        roles: "Frontend",
        updatedAt: "2026-05-12T00:00:00.000Z",
      },
    ],
    applications: [
      {
        id: "application-expired-demo",
        projectId: "project-expired-demo",
        applicantId: "user-expired-demo",
        message: "Expired demo application",
        status: "pending",
        createdAt: "2026-05-12T00:00:00.000Z",
        updatedAt: "2026-05-12T00:00:00.000Z",
      },
    ],
    sessions: [{ token: "expired-owner-token", userId: "user-expired-owner" }],
    demo: [
      {
        ownerId: "user-expired-owner",
        expiresAt: "2026-05-12T00:00:00.000Z",
        projectIds: ["project-expired-demo"],
        userIds: ["user-expired-demo"],
        applicationIds: ["application-expired-demo"],
      },
    ],
  });

  const expiredMetrics = await mockApi.getDashboardMetrics("expired-owner-token");
  assert.equal(expiredMetrics.ownedProjectsCount, 0, "expired demo cleanup должен выполняться автоматически");
  assert.equal(expiredMetrics.searchableUsersCount, 0, "expired demo users не должны оставаться в поиске");
}
