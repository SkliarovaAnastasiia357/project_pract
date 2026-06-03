import assert from "node:assert/strict";

import { scoreProjectMatch } from "../../src/features/matching/match-score.ts";

export function runMatchScoreTests(): void {
  const match = scoreProjectMatch({
    profileSkills: ["React", "TypeScript", "QA"],
    query: "frontend react",
    project: {
      title: "Frontend workspace",
      description: "Product team needs a React engineer for a protected-route MVP.",
      stack: "React, TypeScript, Fastify",
      roles: "Frontend developer, UX researcher",
    },
  });

  assert.equal(match.score, 100, "совпадение всех токенов запроса в ролях и стеке должно давать максимум");
  assert.deepEqual(match.matchedSkills, [], "навыки профиля не должны влиять на процент проекта");
  assert.deepEqual(match.matchedRoles, ["frontend"], "совпавшие роли должны объяснять процент");
  assert.deepEqual(match.matchedQuery, ["роли", "стек"], "объяснение должно ссылаться только на роли и стек");

  const weakMatch = scoreProjectMatch({
    profileSkills: ["Python", "Data"],
    query: "data",
    project: {
      title: "Data pipeline",
      description: "ETL and analytics tasks.",
      stack: "PostgreSQL",
      roles: "Backend developer",
    },
  });

  assert.equal(weakMatch.score, 0, "совпадение только в названии или профиле не должно повышать score");
  assert.deepEqual(weakMatch.matchedSkills, [], "профильные навыки остаются вне расчета");
}
