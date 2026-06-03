import assert from "node:assert/strict";

import { getProjectMatchPercent } from "../../src/features/projects/project-match.ts";

export async function runProjectMatchTests(): Promise<void> {
  assert.equal(
    getProjectMatchPercent({
      query: "React QA",
      stack: "React, TypeScript",
      roles: "QA",
    }),
    100,
    "все токены запроса, найденные в ролях и стеке, должны давать 100%",
  );

  assert.equal(
    getProjectMatchPercent({
      query: "React Figma",
      stack: "React, TypeScript",
      roles: "QA",
    }),
    50,
    "процент должен считаться по каждому токену запроса отдельно",
  );

  assert.equal(
    getProjectMatchPercent({
      query: "Node",
      stack: "Node.js, Fastify",
      roles: "Backend developer",
    }),
    100,
    "частичное совпадение технологии внутри стека должно учитываться",
  );

  assert.equal(
    getProjectMatchPercent({
      query: "Teamnova",
      stack: "React",
      roles: "Frontend developer",
    }),
    0,
    "слово, не найденное в ролях и стеке, не должно повышать процент",
  );
}
