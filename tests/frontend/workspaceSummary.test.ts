import assert from "node:assert/strict";

import { getWorkspaceSummary } from "../../src/features/profile/workspace-summary.ts";

export async function runWorkspaceSummaryTests(): Promise<void> {
  const emptySummary = getWorkspaceSummary({
    hasBio: false,
    skillsCount: 0,
    projectsCount: 0,
  });

  assert.equal(emptySummary.completionRatio, 0, "пустой профиль должен иметь нулевую готовность");
  assert.equal(emptySummary.completionLabel, "Профиль только создан", "для пустого профиля должен быть базовый статус");
  assert.equal(emptySummary.cards[0]?.title, "0 навыков", "карточка навыков должна отражать текущее количество");

  const filledSummary = getWorkspaceSummary({
    hasBio: true,
    skillsCount: 4,
    projectsCount: 2,
  });

  assert.equal(filledSummary.completionRatio, 100, "заполненный профиль должен быть полностью готов");
  assert.equal(filledSummary.completionLabel, "Профиль готов к поиску", "для заполненного профиля нужен позитивный статус");
  assert.equal(filledSummary.cards[1]?.title, "2 проекта", "карточка проектов должна отражать текущее количество");
}
