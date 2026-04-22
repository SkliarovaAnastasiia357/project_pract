import { SignJWT, jwtVerify, errors as joseErrors } from "jose";

export const ISSUER = "teamnova";

export class TokenExpired extends Error {
  constructor() {
    super("token expired");
    this.name = "TokenExpired";
  }
}

export class InvalidToken extends Error {
  constructor() {
    super("invalid token");
    this.name = "InvalidToken";
  }
}

export type IssueOptions = { userId: string; secret: string; ttlSec: number };
export type VerifyOptions = { token: string; secret: string };

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function issueAccessToken(opts: IssueOptions): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(ISSUER)
    .setSubject(opts.userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + opts.ttlSec)
    .sign(secretKey(opts.secret));
}

export async function verifyAccessToken(
  opts: VerifyOptions,
): Promise<{ userId: string }> {
  try {
    const { payload } = await jwtVerify(opts.token, secretKey(opts.secret), {
      issuer: ISSUER,
    });
    if (typeof payload.sub !== "string") throw new InvalidToken();
    return { userId: payload.sub };
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) throw new TokenExpired();
    if (err instanceof InvalidToken) throw err;
    throw new InvalidToken();
  }
}
