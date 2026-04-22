import { hash as argonHash, verify as argonVerify, Algorithm } from "@node-rs/argon2";

export const ARGON2_PARAMS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return argonHash(plain, ARGON2_PARAMS);
}

export async function verifyPassword(stored: string, plain: string): Promise<boolean> {
  try {
    return await argonVerify(stored, plain, ARGON2_PARAMS);
  } catch {
    return false;
  }
}

// needsRehash is not exported by @node-rs/argon2 v2.x — parse the PHC string manually.
// Format: $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
function parseArgon2Params(stored: string): { m: number; t: number; p: number } | null {
  const match = stored.match(/^\$argon2id\$v=\d+\$m=(\d+),t=(\d+),p=(\d+)\$/);
  if (!match) return null;
  return { m: Number(match[1]), t: Number(match[2]), p: Number(match[3]) };
}

export function passwordNeedsRehash(stored: string): boolean {
  const params = parseArgon2Params(stored);
  if (!params) return true;
  return (
    params.m !== ARGON2_PARAMS.memoryCost ||
    params.t !== ARGON2_PARAMS.timeCost ||
    params.p !== ARGON2_PARAMS.parallelism
  );
}

// Precomputed at import time so user-not-found paths can call dummyVerify for timing safety.
export const DUMMY_HASH: Promise<string> = argonHash("__dummy_never_matches__", ARGON2_PARAMS);

export async function dummyVerify(plain: string): Promise<void> {
  const h = await DUMMY_HASH;
  await argonVerify(h, plain, ARGON2_PARAMS).catch(() => false);
}
