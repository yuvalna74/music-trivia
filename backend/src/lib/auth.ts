import jwt from 'jsonwebtoken';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from './supabase.js';

const TEAM_TOKEN_SECRET = process.env.TEAM_TOKEN_SECRET!;

export type AuthenticatedUser = {
  type: 'authenticated';
  id: string;
  email?: string;
};

export type TeamUser = {
  type: 'team';
  sessionId: string;
  teamId: string;
  name: string;
};

export type RequestUser = AuthenticatedUser | TeamUser;

declare module 'fastify' {
  interface FastifyRequest {
    user?: RequestUser;
  }
}

function extractBearer(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

export async function dualAuthMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = extractBearer(req);
  if (!token) {
    return reply.status(401).send({ error: 'No authorization token' });
  }

  // Try Supabase JWT first (using admin client — no secret needed)
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      req.user = { type: 'authenticated', id: user.id, email: user.email };
      return;
    }
  } catch {
    // not a valid Supabase JWT — fall through to team token
  }

  // Try team session token
  try {
    const claims = jwt.verify(token, TEAM_TOKEN_SECRET) as jwt.JwtPayload;
    if (claims.sessionId && claims.teamId) {
      req.user = {
        type: 'team',
        sessionId: claims.sessionId as string,
        teamId: claims.teamId as string,
        name: claims.name as string,
      };
      return;
    }
  } catch {
    // invalid team token
  }

  return reply.status(401).send({ error: 'Invalid token' });
}

export function requireAuthenticated(req: FastifyRequest, reply: FastifyReply): void {
  if (!req.user || req.user.type !== 'authenticated') {
    reply.status(403).send({ error: 'Authenticated user required' });
  }
}

export function requireTeam(req: FastifyRequest, reply: FastifyReply): void {
  if (!req.user || req.user.type !== 'team') {
    reply.status(403).send({ error: 'Team session required' });
  }
}
