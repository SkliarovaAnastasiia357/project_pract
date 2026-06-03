export type ProjectMatchInput = {
  query: string;
  stack: string;
  roles: string;
};

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^a-zа-я0-9+#.]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function hasRequirementMatch(token: string, requirementTokens: Set<string>): boolean {
  if (requirementTokens.has(token)) {
    return true;
  }

  return token.length > 1 && [...requirementTokens].some((requirementToken) =>
    requirementToken.includes(token) || token.includes(requirementToken),
  );
}

export function getProjectMatchPercent(input: ProjectMatchInput): number {
  const queryTokens = [...new Set(tokenize(input.query))];

  if (queryTokens.length === 0) {
    return 0;
  }

  const requirementTokens = new Set([...tokenize(input.stack), ...tokenize(input.roles)]);

  if (requirementTokens.size === 0) {
    return 0;
  }

  const matchedCount = queryTokens.filter((token) => hasRequirementMatch(token, requirementTokens)).length;

  return Math.round((matchedCount / queryTokens.length) * 100);
}
