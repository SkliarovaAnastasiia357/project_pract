import type { ProjectMatch } from "../../shared/types.ts";

export type MatchScoreInput = {
  profileSkills: string[];
  query: string;
  project: {
    title: string;
    description: string;
    stack: string;
    roles: string;
  };
};

export type ProjectMatchScore = ProjectMatch;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function includesToken(haystack: string, needle: string): boolean {
  return normalize(haystack).includes(normalize(needle));
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = normalize(value);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value.trim());
  }

  return result;
}

function splitList(value: string): string[] {
  return value
    .split(/[,\n;/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function findSkillMatches(profileSkills: string[], project: MatchScoreInput["project"]): string[] {
  const searchableProjectText = `${project.stack} ${project.roles} ${project.description}`;
  return unique(profileSkills).filter((skill) => includesToken(searchableProjectText, skill));
}

function findRoleMatches(query: string, projectRoles: string): string[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return [];
  }

  return splitList(projectRoles)
    .filter((role) => includesToken(role, normalizedQuery) || includesToken(normalizedQuery, role))
    .map((role) => role.replace(/\s+developer$/i, "").trim())
    .filter(Boolean);
}

function findQueryMatches(query: string, project: MatchScoreInput["project"]): string[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return [];
  }

  const fields = [
    ["название", project.title],
    ["описание", project.description],
    ["стек", project.stack],
    ["роли", project.roles],
  ] as const;

  return fields.filter(([, value]) => includesToken(value, normalizedQuery)).map(([label]) => label);
}

export function scoreProjectMatch(input: MatchScoreInput): ProjectMatchScore {
  const matchedSkills = findSkillMatches(input.profileSkills, input.project);
  const matchedRoles = unique(findRoleMatches(input.query, input.project.roles));
  const matchedQuery = findQueryMatches(input.query, input.project);

  const skillScore = Math.min(65, matchedSkills.length * 35);
  const roleScore = matchedRoles.length > 0 ? 15 : 0;
  const queryScore = Math.min(20, matchedQuery.length * 10);
  const score = Math.min(100, skillScore + roleScore + queryScore);
  const reasons: string[] = [];

  if (matchedSkills.length > 0) {
    reasons.push(`Совпали навыки профиля: ${matchedSkills.join(", ")}`);
  }

  if (matchedRoles.length > 0) {
    reasons.push(`Запрос совпал с ролью: ${matchedRoles.join(", ")}`);
  }

  if (matchedQuery.length > 0) {
    reasons.push(`Запрос найден в полях проекта: ${matchedQuery.join(", ")}`);
  }

  if (reasons.length === 0) {
    reasons.push("Совпадение слабое: заполните навыки или уточните запрос.");
  }

  return {
    score,
    matchedSkills,
    matchedRoles,
    matchedQuery,
    reasons,
  };
}
