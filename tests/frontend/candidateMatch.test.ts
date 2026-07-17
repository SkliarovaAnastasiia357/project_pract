import assert from "node:assert/strict";

import {
  filterCandidateMatches,
  rankCandidatesForProject,
  scoreCandidateForProject,
} from "../../src/features/matching/candidate-match.ts";
import type { Project, UserSearchResult } from "../../src/shared/types.ts";

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    title: "Teamnova",
    description: "Подбор команды для IT-проекта",
    stack: "React, TypeScript, Fastify, PostgreSQL",
    roles: "Frontend developer, QA engineer, UX researcher",
    updatedAt: "2026-07-10T00:00:00.000Z",
    ...overrides,
  };
}

function candidate(
  id: string,
  name: string,
  bio: string,
  skills: string[],
): UserSearchResult {
  return {
    id,
    name,
    email: `${id}@teamnova.local`,
    bio,
    skills: skills.map((skill, index) => ({ id: `${id}-skill-${index}`, name: skill })),
  };
}

export function runCandidateMatchTests(): void {
  const frontendCandidate = candidate(
    "alina",
    "Алина React",
    "Frontend engineer: React, TypeScript, дизайн-системы.",
    ["React", "TypeScript", "UI"],
  );
  const frontendMatch = scoreCandidateForProject(project(), frontendCandidate);

  assert.equal(frontendMatch.score, 70, "два навыка из четырех и совпавшая роль должны давать 70%");
  assert.equal(frontendMatch.stackScore, 50, "покрытие стека должно считаться отдельно");
  assert.equal(frontendMatch.roleScore, 100, "совпавшая роль должна давать полный role score");
  assert.deepEqual(frontendMatch.matchedSkills, ["React", "TypeScript"]);
  assert.equal(frontendMatch.matchedRole, "Frontend developer");

  const qaCandidate = candidate("max", "Максим QA", "QA engineer: тест-планы и регрессия.", ["QA"]);
  const qaMatch = scoreCandidateForProject(project(), qaCandidate);

  assert.equal(qaMatch.score, 40, "кандидат только с совпавшей ролью должен получать роль-балл");
  assert.equal(qaMatch.stackScore, 0);
  assert.equal(qaMatch.roleScore, 100);
  assert.equal(qaMatch.matchedRole, "QA engineer");

  const normalizedMatch = scoreCandidateForProject(
    project({ stack: "React; REACT; Node.js", roles: "Тестёр" }),
    candidate("normalized", "Елена", "Тестер интерфейсов", ["react", "NODE"]),
  );

  assert.equal(normalizedMatch.score, 100, "регистр, дубли, частичное совпадение и ё/е должны нормализоваться");
  assert.deepEqual(normalizedMatch.matchedSkills, ["React", "Node.js"]);

  const emptyMatch = scoreCandidateForProject(
    project({ stack: "", roles: "" }),
    candidate("empty", "Пустой профиль", "", []),
  );

  assert.equal(emptyMatch.score, 0, "проект без требований не должен давать фиктивный процент");
  assert.match(emptyMatch.reasons[0] ?? "", /не заполнены/i);

  const tiedCandidates = [
    candidate("sofia", "София UX", "UX researcher", ["Figma"]),
    candidate("alina-tie", "Алина UX", "UX researcher", ["Figma"]),
  ];
  const originalOrder = tiedCandidates.map((entry) => entry.id);
  const ranked = rankCandidatesForProject(project({ stack: "", roles: "UX researcher" }), tiedCandidates);

  assert.deepEqual(
    ranked.map((entry) => entry.candidate.name),
    ["Алина UX", "София UX"],
    "одинаковый score должен стабильно сортироваться по русскому имени",
  );
  assert.deepEqual(
    tiedCandidates.map((entry) => entry.id),
    originalOrder,
    "ранжирование не должно менять исходный массив",
  );

  const filtered = filterCandidateMatches(ranked, "fig", true);
  assert.equal(filtered.length, 2, "поиск должен учитывать навыки кандидата");
  assert.equal(filterCandidateMatches(ranked, "несуществующий", false).length, 0);
  assert.deepEqual(
    ranked.map((entry) => entry.candidate.name),
    ["Алина UX", "София UX"],
    "фильтрация не должна менять ранжированный массив",
  );
}
