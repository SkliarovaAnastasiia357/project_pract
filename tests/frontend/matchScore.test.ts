import assert from "node:assert/strict";

import { scoreProjectMatch } from "../../src/features/matching/match-score.ts";

export function runMatchScoreTests(): void {
  const match = scoreProjectMatch({
    profileSkills: ["React", "TypeScript", "QA"],
    query: "frontend",
    project: {
      title: "Frontend workspace",
      description: "Product team needs a React engineer for a protected-route MVP.",
      stack: "React, TypeScript, Fastify",
      roles: "Frontend developer, UX researcher",
    },
  });

  assert.equal(match.score, 100, "полное совпадение по навыкам, роли и запросу должно давать максимум");
  assert.deepEqual(match.matchedSkills, ["React", "TypeScript"], "совпавшие навыки должны идти из реального профиля");
  assert.deepEqual(match.matchedRoles, ["Frontend"], "совпавшие роли должны объяснять процент");
  assert.equal(match.reasons.length >= 3, true, "матч должен иметь объяснение, а не только число");

  const weakMatch = scoreProjectMatch({
    profileSkills: ["Python"],
    query: "mobile",
    project: {
      title: "Data pipeline",
      description: "ETL and analytics tasks.",
      stack: "PostgreSQL, Python",
      roles: "Backend developer",
    },
  });

  assert.equal(weakMatch.score < match.score, true, "слабое совпадение должно давать меньший score");
  assert.deepEqual(weakMatch.matchedSkills, ["Python"], "частичное совпадение должно быть объяснено навыком");
}
