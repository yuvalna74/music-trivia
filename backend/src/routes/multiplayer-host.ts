import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { dualAuthMiddleware, requireAuthenticated } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';
import { createSession, getSession, saveSession, deleteSession } from '../services/session.js';

export async function multiplayerHostRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', dualAuthMiddleware);
  fastify.addHook('preHandler', requireAuthenticated as never);

  fastify.post('/multiplayer/host/create-session', async (req, reply) => {
    const user = req.user as { type: 'authenticated'; id: string };

    // Persist session record to Supabase (placeholder code, filled in after Redis session is created)
    const { data: sessionRecord, error } = await supabase
      .from('multiplayer_sessions')
      .insert({ host_user_id: user.id, code: 'TMP', status: 'lobby' })
      .select()
      .single();
    if (error || !sessionRecord) return reply.status(500).send({ error: 'DB error' });

    const session = await createSession(user.id, sessionRecord.id);

    // Update the DB record with the actual code
    await supabase
      .from('multiplayer_sessions')
      .update({ code: session.code })
      .eq('id', sessionRecord.id);

    return { sessionId: session.id, code: session.code };
  });

  fastify.post('/multiplayer/host/start-game', async (req, reply) => {
    const user = req.user as { type: 'authenticated'; id: string };
    const body = z.object({ code: z.string() }).parse(req.body);

    const session = await getSession(body.code);
    if (!session) return reply.status(404).send({ error: 'Session not found' });
    if (session.hostUserId !== user.id) return reply.status(403).send({ error: 'Not the host' });

    session.round.phase = 'playing';
    session.round.roundNumber = 1;
    session.round.currentTeamIndex = 0;
    await saveSession(session);

    await supabase
      .from('multiplayer_sessions')
      .update({ status: 'active' })
      .eq('id', session.id);

    return { session };
  });

  fastify.post('/multiplayer/host/end-session', async (req, reply) => {
    const user = req.user as { type: 'authenticated'; id: string };
    const body = z.object({ code: z.string() }).parse(req.body);

    const session = await getSession(body.code);
    if (!session) return reply.status(404).send({ error: 'Session not found' });
    if (session.hostUserId !== user.id) return reply.status(403).send({ error: 'Not the host' });

    // Persist final team scores
    for (const team of session.teams) {
      await supabase.from('multiplayer_teams').insert({
        session_id: session.id,
        name: team.name,
        score: team.score,
      });
    }

    await supabase
      .from('multiplayer_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', session.id);

    await deleteSession(body.code);

    return { ok: true };
  });
}
