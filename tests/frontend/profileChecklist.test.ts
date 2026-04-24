import assert from "node:assert/strict";

import { mockApi, resetMockApiState } from "../../src/shared/api/mockApi.ts";
import { expectApiError } from "./testUtils.ts";

export async function runProfileChecklistTests(): Promise<void> {
  resetMockApiState();

  const session = await mockApi.register({
    email: "profile-checklist@example.com",
    name: "Profile QA",
    password: "StrongPass1",
    confirmPassword: "StrongPass1",
  });

  const savedBio = await mockApi.updateProfile(session.token, {
    bio: "  Делаю интерфейсы и тестовые сценарии для продукта.  ",
  });
  assert.equal(savedBio.bio, "Делаю интерфейсы и тестовые сценарии для продукта.", "описание должно сохраняться без лишних пробелов");

  const emptyBio = await mockApi.updateProfile(session.token, {
    bio: "   ",
  });
  assert.equal(emptyBio.bio, "", "пустое описание должно быть допустимо");

  const maxBio = await mockApi.updateProfile(session.token, {
    bio: "b".repeat(400),
  });
  assert.equal(maxBio.bio.length, 400, "описание длиной 400 символов должно сохраняться");

  await expectApiError(
    () => mockApi.updateProfile(session.token, { bio: "b".repeat(401) }),
    "Исправьте ошибки в профиле",
    { name: "bio", value: "Описание не должно превышать 400 символов" },
  );

  const firstSkillProfile = await mockApi.addSkill(session.token, { name: "  React  " });
  assert.equal(firstSkillProfile.skills.length, 1, "навык должен добавляться в профиль");
  assert.equal(firstSkillProfile.skills[0]?.name, "React", "название навыка должно нормализоваться");

  const secondSkillProfile = await mockApi.addSkill(session.token, { name: "TypeScript" });
  assert.equal(secondSkillProfile.skills.length, 2, "повторное добавление другого навыка должно быть успешным");

  await expectApiError(
    () => mockApi.addSkill(session.token, { name: "   " }),
    "Исправьте ошибки в навыках",
    { name: "name", value: "Введите навык" },
  );

  const profileAfterOneDelete = await mockApi.deleteSkill(session.token, secondSkillProfile.skills[0]!.id);
  assert.equal(profileAfterOneDelete.skills.length, 1, "удаление одного навыка не должно затрагивать остальные");

  const profileAfterLastDelete = await mockApi.deleteSkill(session.token, profileAfterOneDelete.skills[0]!.id);
  assert.deepEqual(profileAfterLastDelete.skills, [], "удаление последнего навыка должно оставлять пустой список");
}
