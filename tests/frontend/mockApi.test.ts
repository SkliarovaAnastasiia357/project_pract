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
    ],
    sessions: [{ token: "legacy-token", userId: "user-legacy-participant" }],
  });

  const legacyResults = await mockApi.searchProjects("legacy-token", { query: "React" });
  assert.equal(legacyResults.length, 1, "старый mock payload без applications должен мигрировать на чтении");
  assert.equal(legacyResults[0]!.applicationStatus, null, "у legacy проекта без заявок должен быть пустой статус");
}
