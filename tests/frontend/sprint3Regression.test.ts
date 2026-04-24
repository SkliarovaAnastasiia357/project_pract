import assert from "node:assert/strict";

import { mockApi, resetMockApiState } from "../../src/shared/api/mockApi.ts";

export async function runSprint3RegressionTests(): Promise<void> {
  resetMockApiState();

  const session = await mockApi.register({
    email: "sprint3-regression@example.com",
    name: "Regression QA",
    password: "StrongPass1",
    confirmPassword: "StrongPass1",
  });

  const profileAfterBio = await mockApi.updateProfile(session.token, {
    bio: "Проверяю сквозные сценарии для профиля и проектов.",
  });
  assert.equal(profileAfterBio.bio, "Проверяю сквозные сценарии для профиля и проектов.", "после регистрации должно быть возможно заполнить профиль");

  const profileAfterSkills = await mockApi.addSkill(session.token, { name: "QA Automation" });
  assert.equal(profileAfterSkills.skills.length, 1, "после заполнения профиля должен добавляться навык");

  const project = await mockApi.createProject(session.token, {
    title: "Regression Flow",
    description: "Сквозной сценарий от регистрации до удаления проекта.",
    stack: "React, TypeScript",
    roles: "QA",
  });
  assert.equal(project.title, "Regression Flow", "после заполнения профиля должен создаваться проект");

  const editedProject = await mockApi.updateProject(session.token, project.id, {
    title: "Regression Flow Updated",
    description: "Обновлённый сценарий после редактирования проекта.",
    stack: "React, TypeScript, Fastify",
    roles: "QA, Backend developer",
  });
  assert.equal(editedProject.title, "Regression Flow Updated", "созданный проект должен редактироваться");

  let projects = await mockApi.listProjects(session.token);
  assert.equal(projects.length, 1, "после редактирования проект должен оставаться в списке");
  assert.equal(projects[0]?.title, "Regression Flow Updated", "список должен содержать обновлённый проект");

  await mockApi.deleteProject(session.token, project.id);
  projects = await mockApi.listProjects(session.token);
  assert.deepEqual(projects, [], "после удаления проект должен исчезать из списка");

  const finalProfile = await mockApi.getProfile(session.token);
  assert.equal(finalProfile.bio.length > 0, true, "профиль не должен теряться после CRUD проекта");
  assert.equal(finalProfile.skills.length, 1, "навыки профиля должны сохраниться после удаления проекта");
}
