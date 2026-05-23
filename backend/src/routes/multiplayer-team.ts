import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { dualAuthMiddleware, requireTeam } from '../lib/auth.js';
import { getSession, addTeam, setTeamReady, saveSession } from '../services/session.js';
import { issueTeamToken } from '../services/team-tokens.js';
import { fuzzyMatch, matchArtist } from '../services/matching.js';
import { calculateRoundScore } from '../services/scoring.js';
import { randomBytes } from 'crypto';

export async function multiplayerTeamRoutes(fastify: FastifyInstance): Promise<void> {
  // Rate-limited join endpoint — no auth required
  fastify.post('/multiplayer/team/join', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const body = z.object({ code: z.string().min(6).max(6), teamName: z.string().min(1).max(30) }).parse(req.body);

    const session = await getSession(body.code.toUpperCase());
    if (!session) return reply.status(404).send({ error: 'Session not found or expired' });
    if (session.round.phase !== 'lobby') return reply.status(400).send({ error: 'Game already started' });
    if (session.teams.length >= 10) return reply.status(400).send({ error: 'Session is full (max 10 teams)' });

    const teamId = randomBytes(8).toString('hex');
    const updatedSession = await addTeam(body.code.toUpperCase(), teamId, body.teamName);
    if (!updatedSession) return reply.status(500).send({ error: 'Could not join session' });

    const teamToken = issueTeamToken({ sessionId: session.id, teamId, name: body.teamName });

    return {
      teamId,
      teamToken,
      sessionState: {
        code: updatedSession.code,
        teams: updatedSession.teams.map((t) => ({ id: t.id, name: t.name, score: t.score, ready: t.ready })),
        phase: updatedSession.round.phase,
      },
    };
  });

  fastify.get('/multiplayer/team/session/:code', async (req, reply) => {
    const { code } = req.params as { code: string };
    const session = await getSession(code.toUpperCase());
    if (!session) return reply.status(404).send({ error: 'Session not found' });
    return {
      code: session.code,
      teams: session.teams.map((t) => ({ id: t.id, name: t.name, score: t.score, ready: t.ready })),
      phase: session.round.phase,
      roundNumber: session.round.roundNumber,
    };
  });

  // Team ready toggle — requires team token
  fastify.post(
    '/multiplayer/team/ready',
    { preHandler: [dualAuthMiddleware as never, requireTeam as never] },
    async (req, reply) => {
      const teamUser = req.user as { type: 'team'; sessionId: string; teamId: string };
      const body = z.object({ code: z.string(), ready: z.boolean() }).parse(req.body);

      const session = await setTeamReady(body.code.toUpperCase(), teamUser.teamId, body.ready);
      if (!session) return reply.status(404).send({ error: 'Session not found' });

      return { ok: true };
    },
  );

  // Submit answer — requires team token
  fastify.post(
    '/multiplayer/team/answer',
    { preHandler: [dualAuthMiddleware as never, requireTeam as never] },
    async (req, reply) => {
      const teamUser = req.user as { type: 'team'; sessionId: string; teamId: string };
      const body = z
        .object({
          code: z.string(),
          trackId: z.string(),
          trackName: z.string(),
          artistName: z.string(),
          artistNames: z.array(z.string()),
          songAnswer: z.string(),
          artistAnswer: z.string(),
        })
        .parse(req.body);

      const session = await getSession(body.code.toUpperCase());
      if (!session) return reply.status(404).send({ error: 'Session not found' });

      const currentTeam = session.teams[session.round.currentTeamIndex];
      if (currentTeam?.id !== teamUser.teamId) {
        return reply.status(403).send({ error: 'Not your turn' });
      }

      const songCorrect = fuzzyMatch(body.trackName, body.songAnswer);
      const artistCorrect = matchArtist(body.artistNames, body.artistAnswer);
      const { pointsAwarded } = calculateRoundScore(songCorrect, artistCorrect);

      currentTeam.score += pointsAwarded;
      currentTeam.lastActive = Date.now();
      session.round.phase = 'result';
      await saveSession(session);

      return {
        songCorrect,
        artistCorrect,
        pointsAwarded,
        teamScore: currentTeam.score,
        canonicalSong: body.trackName,
        canonicalArtist: body.artistName,
      };
    },
  );
}
