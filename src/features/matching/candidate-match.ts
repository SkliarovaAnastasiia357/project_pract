import type { Project, UserSearchResult } from "../../shared/types.ts";

export type CandidateMatch = {
  score: number;
  stackScore: number;
  roleScore: number;
  matchedSkills: string[];
  matchedRole: string | null;
  reasons: string[];
};

export type RankedCandidate = {
  candidate: UserSearchResult;
  match: CandidateMatch;
};

const genericRoleTokens = new Set([
  "developer",
  "engineer",
  "specialist",
  "разработчик",
  "разработчица",
  "инженер",
  "специалист",
]);

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, "е");
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-zа-я0-9+#.]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function splitRequirements(value: string): string[] {
  const seen = new Set<string>();
  const requirements: string[] = [];

  for (const part of value.split(/[,;\n]+/)) {
    const label = part.trim();
    const key = normalize(label);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    requirements.push(label);
  }

  return requirements;
}

function valuesMatch(left: string, right: string): boolean {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  return (
    normalizedLeft.length > 1 &&
    normalizedRight.length > 1 &&
    (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
  );
}

function findMatchedSkills(requirements: string[], candidate: UserSearchResult): string[] {
  return requirements.filter((requirement) =>
    candidate.skills.some((skill) => valuesMatch(requirement, skill.name)),
  );
}

function findMatchedRole(roles: string[], candidate: UserSearchResult): string | null {
  const evidenceTokens = tokenize([candidate.bio, ...candidate.skills.map((skill) => skill.name)].join(" "));

  for (const role of roles) {
    const roleTokens = tokenize(role);
    const specificTokens = roleTokens.filter((token) => !genericRoleTokens.has(token));
    const tokensToMatch = specificTokens.length > 0 ? specificTokens : roleTokens;

    if (tokensToMatch.some((roleToken) => evidenceTokens.some((token) => valuesMatch(roleToken, token)))) {
      return role;
    }
  }

  return null;
}

function weightedScore(stackScore: number, roleScore: number, hasStack: boolean, hasRoles: boolean): number {
  const stackWeight = hasStack ? 60 : 0;
  const roleWeight = hasRoles ? 40 : 0;
  const totalWeight = stackWeight + roleWeight;

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round((stackScore * stackWeight + roleScore * roleWeight) / totalWeight);
}

export function scoreCandidateForProject(project: Project, candidate: UserSearchResult): CandidateMatch {
  const stackRequirements = splitRequirements(project.stack);
  const roleRequirements = splitRequirements(project.roles);
  const matchedSkills = findMatchedSkills(stackRequirements, candidate);
  const matchedRole = findMatchedRole(roleRequirements, candidate);
  const stackScore =
    stackRequirements.length > 0 ? Math.round((matchedSkills.length / stackRequirements.length) * 100) : 0;
  const roleScore = matchedRole ? 100 : 0;
  const score = weightedScore(
    stackScore,
    roleScore,
    stackRequirements.length > 0,
    roleRequirements.length > 0,
  );
  const reasons: string[] = [];

  if (stackRequirements.length === 0 && roleRequirements.length === 0) {
    reasons.push("В проекте не заполнены требования к кандидатам.");
  } else {
    if (matchedSkills.length > 0) {
      reasons.push(`Совпали технологии: ${matchedSkills.join(", ")}.`);
    }

    if (matchedRole) {
      reasons.push(`Подходит роль: ${matchedRole}.`);
    }

    if (reasons.length === 0) {
      reasons.push("Совпадений со стеком и ролями проекта не найдено.");
    }
  }

  return {
    score,
    stackScore,
    roleScore,
    matchedSkills,
    matchedRole,
    reasons,
  };
}

export function rankCandidatesForProject(
  project: Project,
  candidates: readonly UserSearchResult[],
): RankedCandidate[] {
  return candidates
    .map((candidate) => ({ candidate, match: scoreCandidateForProject(project, candidate) }))
    .sort((left, right) => {
      if (left.match.score !== right.match.score) {
        return right.match.score - left.match.score;
      }

      return left.candidate.name.localeCompare(right.candidate.name, "ru", { sensitivity: "base" });
    });
}

export function filterCandidateMatches(
  candidates: readonly RankedCandidate[],
  query: string,
  onlyMatched: boolean,
): RankedCandidate[] {
  const normalizedQuery = normalize(query);

  return candidates.filter((entry) => {
    if (onlyMatched && entry.match.score === 0) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      entry.candidate.name,
      entry.candidate.email,
      entry.candidate.bio,
      ...entry.candidate.skills.map((skill) => skill.name),
    ].some((value) => normalize(value).includes(normalizedQuery));
  });
}
