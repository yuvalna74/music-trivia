import { redis } from '../lib/redis.js';
import { randomBytes } from 'crypto';

const SESSION_TTL = 2 * 60 * 60;      // 2h active
const SESSION_IDLE_TTL = 30 * 60;     // 30min idle

export type TeamState = {
  id: string;
  name: string;
  score: number;
  ready: boolean;
  lastActive: number;
};

export type RoundState = {
  roundNumber: number;
  currentTeamIndex: number;
  phase: 'lobby' | 'picking' | 'playing' | 'result' | 'ended';
  trackId?: string;
  trackName?: string;
  artistName?: string;
  clipStartMs?: number;
};

export type GameSession = {
  id: string;
  code: string;
  hostUserId: string;
  teams: TeamState[];
  round: RoundState;
  maxRoundsPerTeam: number;
  createdAt: number;
};

function sessionKey(code: string): string {
  return `session:${code}`;
}

export function generateCode(): string {
  return randomBytes(3).toString('hex').toUpperCase();
}

export async function createSession(hostUserId: string, sessionId: string): Promise<GameSession> {
  const code = generateCode();
  const session: GameSession = {
    id: sessionId,
    code,
    hostUserId,
    teams: [],
    round: { roundNumber: 0, currentTeamIndex: 0, phase: 'lobby' },
    maxRoundsPerTeam: 3,
    createdAt: Date.now(),
  };
  await redis.setex(sessionKey(code), SESSION_TTL, JSON.stringify(session));
  return session;
}

export async function getSession(code: string): Promise<GameSession | null> {
  const raw = await redis.get(sessionKey(code));
  if (!raw) return null;
  return JSON.parse(raw) as GameSession;
}

export async function saveSession(session: GameSession): Promise<void> {
  await redis.setex(sessionKey(session.code), SESSION_IDLE_TTL, JSON.stringify(session));
}

export async function deleteSession(code: string): Promise<void> {
  await redis.del(sessionKey(code));
}

export async function addTeam(code: string, teamId: string, name: string): Promise<GameSession | null> {
  const session = await getSession(code);
  if (!session) return null;
  if (session.teams.length >= 10) return null;
  session.teams.push({ id: teamId, name, score: 0, ready: false, lastActive: Date.now() });
  await saveSession(session);
  return session;
}

export async function setTeamReady(code: string, teamId: string, ready: boolean): Promise<GameSession | null> {
  const session = await getSession(code);
  if (!session) return null;
  const team = session.teams.find((t) => t.id === teamId);
  if (team) {
    team.ready = ready;
    team.lastActive = Date.now();
  }
  await saveSession(session);
  return session;
}

export async function removeIdleTeams(code: string): Promise<GameSession | null> {
  const session = await getSession(code);
  if (!session) return null;
  const idleThreshold = Date.now() - 2 * 60 * 1000;
  session.teams = session.teams.filter((t) => t.lastActive > idleThreshold);
  await saveSession(session);
  return session;
}

export async function refreshSessionTTL(code: string): Promise<void> {
  await redis.expire(sessionKey(code), SESSION_TTL);
}
