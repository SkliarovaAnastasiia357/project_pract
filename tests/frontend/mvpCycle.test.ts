import assert from "node:assert/strict";

import { ApiClientError } from "../../src/shared/api/contracts.ts";
import { mockApi, resetMockApiState } from "../../src/shared/api/mockApi.ts";

async function expectApiError(callback: () => Promise<unknown>, expectedStatus: number): Promise<void> {
  try {
    await callback();
    assert.fail("ожидалась ошибка API");
  } catch (error) {
    assert.equal(error instanceof ApiClientError, true, "ошибка должна быть ApiClientError");
    assert.equal((error as ApiClientError).status, expectedStatus, "статус ошибки должен совпадать");
  }
}

export async function runMvpCycleTests(): Promise<void> {
  resetMockApiState();

  const owner = await mockApi.register({
    email: "owner@example.com",
    name: "Owner",
    password: "StrongPass1",
    confirmPassword: "StrongPass1",
  });
  const project = await mockApi.createProject(owner.token, {
    title: "Teamnova Match",
    description: "Платформа для поиска участников в IT-проекты.",
    stack: "React, TypeScript, Fastify",
    roles: "Frontend developer, QA",
  });

  const participant = await mockApi.register({
    email: "participant@example.com",
    name: "Participant",
    password: "StrongPass1",
    confirmPassword: "StrongPass1",
  });
  await mockApi.updateProfile(participant.token, { bio: "Frontend engineer with React experience." });
  await mockApi.addSkill(participant.token, { name: "React" });

  const projectSearch = await mockApi.searchProjects(participant.token, { query: "React" });
  assert.equal(projectSearch.length, 1, "поиск должен найти проект по тегу стека");
  assert.equal(projectSearch[0]!.id, project.id, "найденный проект должен совпадать с созданным");
  assert.equal(projectSearch[0]!.applicationStatus, null, "до отклика у проекта нет статуса заявки");

  const application = await mockApi.applyToProject(participant.token, project.id, {
    message: "Готов помочь с React UI.",
  });
  assert.equal(application.status, "pending", "новая заявка должна быть pending");

  await expectApiError(
    () => mockApi.applyToProject(participant.token, project.id, { message: "Повторная заявка." }),
    409,
  );

  const incoming = await mockApi.listIncomingApplications(owner.token);
  assert.equal(incoming.length, 1, "владелец должен видеть входящую заявку");
  assert.equal(incoming[0]!.applicant.email, "participant@example.com", "заявка должна содержать заявителя");

  const accepted = await mockApi.decideApplication(owner.token, application.id, { status: "accepted" });
  assert.equal(accepted.status, "accepted", "владелец должен принимать заявку");
  const rejected = await mockApi.decideApplication(owner.token, application.id, { status: "rejected" });
  assert.equal(rejected.status, "rejected", "владелец должен отклонять заявку");

  const userSearch = await mockApi.searchUsers(owner.token, { query: "React" });
  assert.equal(userSearch.length, 1, "поиск пользователей должен находить участника по навыку");
  assert.equal(userSearch[0]!.email, "participant@example.com", "найденный пользователь должен совпадать");

  const projectSearchAfterDecision = await mockApi.searchProjects(participant.token, { query: "React" });
  assert.equal(
    projectSearchAfterDecision[0]!.applicationStatus,
    "rejected",
    "после решения владелец статус заявки должен отражаться в поиске",
  );
}
