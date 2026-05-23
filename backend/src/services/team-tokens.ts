import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const TEAM_TOKEN_SECRET = process.env.TEAM_TOKEN_SECRET!;
const TTL_SECONDS = 2 * 60 * 60; // 2 hours

export type TeamTokenPayload = {
  sessionId: string;
  teamId: string;
  name: string;
};

export function issueTeamToken(payload: TeamTokenPayload): string {
  return jwt.sign(
    { ...payload, tokenId: randomBytes(8).toString('hex') },
    TEAM_TOKEN_SECRET,
    { expiresIn: TTL_SECONDS },
  );
}

export function verifyTeamToken(token: string): TeamTokenPayload | null {
  try {
    const claims = jwt.verify(token, TEAM_TOKEN_SECRET) as jwt.JwtPayload;
    if (!claims.sessionId || !claims.teamId) return null;
    return {
      sessionId: claims.sessionId as string,
      teamId: claims.teamId as string,
      name: claims.name as string,
    };
  } catch {
    return null;
  }
}
