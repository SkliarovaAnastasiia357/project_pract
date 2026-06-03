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
  return value.trim().toLowerCase().replace(/ё/g, "е");
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^a-zа-я0-9+#.]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
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

function hasTokenMatch(token: string, values: string[]): boolean {
  for (const value of values) {
    if (value === token) {
      return true;
    }

    if (token.length > 1 && (value.includes(token) || token.includes(value))) {
      return true;
    }
  }

  return false;
}

function findMatchedQueryTokens(query: string, project: MatchScoreInput["project"]): string[] {
  const queryTokens = unique(tokenize(query));
  const requirementTokens = [...new Set([...tokenize(project.stack), ...tokenize(project.roles)])];

  return queryTokens.filter((token) => hasTokenMatch(token, requirementTokens));
}

function findMatchedFields(matchedTokens: string[], project: MatchScoreInput["project"]): string[] {
  const stackTokens = tokenize(project.stack);
  const roleTokens = tokenize(project.roles);
  const fields: string[] = [];

  if (matchedTokens.some((token) => hasTokenMatch(token, roleTokens))) {
    fields.push("роли");
  }

  if (matchedTokens.some((token) => hasTokenMatch(token, stackTokens))) {
    fields.push("стек");
  }

  return fields;
}

export function scoreProjectMatch(input: MatchScoreInput): ProjectMatchScore {
  const queryTokens = unique(tokenize(input.query));
  const matchedQuery = findMatchedQueryTokens(input.query, input.project);
  const matchedRoles = matchedQuery.filter((token) => hasTokenMatch(token, tokenize(input.project.roles)));
  const matchedFields = findMatchedFields(matchedQuery, input.project);
  const score = queryTokens.length > 0 ? Math.round((matchedQuery.length / queryTokens.length) * 100) : 0;
  const reasons: string[] = [];

  if (matchedQuery.length > 0) {
    reasons.push(`Совпали токены запроса: ${matchedQuery.join(", ")}`);
  }

  if (matchedFields.length > 0) {
    reasons.push(`Учитывались только поля: ${matchedFields.join(", ")}`);
  }

  if (reasons.length === 0) {
    reasons.push("Совпадений в ролях и стеке нет.");
  }

  return {
    score,
    matchedSkills: [],
    matchedRoles,
    matchedQuery: matchedFields,
    reasons,
  };
}
