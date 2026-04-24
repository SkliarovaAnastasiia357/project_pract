import assert from "node:assert/strict";

import { mockApi, resetMockApiState } from "../../src/shared/api/mockApi.ts";
import { expectApiError } from "./testUtils.ts";

export async function runProjectsChecklistTests(): Promise<void> {
  resetMockApiState();

  const session = await mockApi.register({
    email: "projects-checklist@example.com",
    name: "Projects QA",
    password: "StrongPass1",
    confirmPassword: "StrongPass1",
  });

  const createdProject = await mockApi.createProject(session.token, {
    title: "Sprint 3 Checklist",
    description: "Платформа для поиска участников и сборки команды.",
    stack: "React, TypeScript, Node.js",
    roles: "Frontend developer, QA",
  });
  assert.equal(createdProject.title, "Sprint 3 Checklist", "проект должен создаваться");

  const fetchedProject = await mockApi.getProject(session.token, createdProject.id);
  assert.equal(fetchedProject.description, createdProject.description, "созданный проект должен читаться по id");

  const updatedProject = await mockApi.updateProject(session.token, createdProject.id, {
    title: "Sprint 3 Checklist Updated",
    description: "Обновлённое описание проекта для регресса.",
    stack: "React, TypeScript, Fastify",
    roles: "Frontend developer, Backend developer, QA",
  });
  assert.equal(updatedProject.title, "Sprint 3 Checklist Updated", "проект должен редактироваться");
  assert.equal(updatedProject.roles.includes("Backend developer"), true, "обновлённые роли должны сохраняться");

  const listAfterUpdate = await mockApi.listProjects(session.token);
  assert.equal(listAfterUpdate.length, 1, "после создания проект должен появляться в списке");

  await mockApi.deleteProject(session.token, createdProject.id);
  const listAfterDelete = await mockApi.listProjects(session.token);
  assert.deepEqual(listAfterDelete, [], "после удаления проект должен исчезать из списка");

  await expectApiError(
    () =>
      mockApi.createProject(session.token, {
        title: "",
        description: "",
        stack: "React",
        roles: "QA",
      }),
    "Исправьте ошибки в форме проекта",
    { name: "title", value: "Название проекта обязательно" },
  );

  const boundaryProject = await mockApi.createProject(session.token, {
    title: "t".repeat(80),
    description: "d".repeat(500),
    stack: "s".repeat(160),
    roles: "r".repeat(160),
  });
  assert.equal(boundaryProject.title.length, 80, "название длиной 80 символов должно быть допустимо");
  assert.equal(boundaryProject.description.length, 500, "описание длиной 500 символов должно быть допустимо");
  assert.equal(boundaryProject.stack.length, 160, "стек длиной 160 символов должен быть допустим");
  assert.equal(boundaryProject.roles.length, 160, "роли длиной 160 символов должны быть допустимы");

  await expectApiError(
    () =>
      mockApi.createProject(session.token, {
        title: "t".repeat(81),
        description: "Описание проекта",
        stack: "React",
        roles: "QA",
      }),
    "Исправьте ошибки в форме проекта",
    { name: "title", value: "Название проекта не должно превышать 80 символов" },
  );

  await expectApiError(
    () =>
      mockApi.createProject(session.token, {
        title: "Новый проект",
        description: "d".repeat(501),
        stack: "React",
        roles: "QA",
      }),
    "Исправьте ошибки в форме проекта",
    { name: "description", value: "Описание не должно превышать 500 символов" },
  );

  await expectApiError(
    () =>
      mockApi.createProject(session.token, {
        title: "Новый проект",
        description: "Описание проекта",
        stack: "s".repeat(161),
        roles: "QA",
      }),
    "Исправьте ошибки в форме проекта",
    { name: "stack", value: "Стек не должно превышать 160 символов" },
  );

  await expectApiError(
    () =>
      mockApi.createProject(session.token, {
        title: "Новый проект",
        description: "Описание проекта",
        stack: "React",
        roles: "r".repeat(161),
      }),
    "Исправьте ошибки в форме проекта",
    { name: "roles", value: "Роли не должно превышать 160 символов" },
  );
}
