import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { dualAuthMiddleware } from '../lib/auth.js';

export async function leaderboardRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/leaderboard/global', async (req, reply) => {
    const query = z
      .object({ category: z.string().optional(), window: z.enum(['all', 'week']).optional() })
      .parse(req.query);

    let q = supabase
      .from('leaderboard_entries')
      .select('*, profiles:user_id(display_name, avatar_url)')
      .order('best_score', { ascending: false })
      .limit(100);

    if (query.category) q = q.eq('category', query.category);
    if (query.window === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      q = q.gte('achieved_at', weekAgo);
    }

    const { data, error } = await q;
    if (error) return reply.status(500).send({ error: error.message });
    return { entries: data };
  });

  // Friends leaderboard — requires auth
  fastify.get('/leaderboard/friends', { preHandler: dualAuthMiddleware as never }, async (req, reply) => {
    const user = req.user;
    if (!user || user.type !== 'authenticated') {
      return reply.status(401).send({ error: 'Authenticated user required' });
    }

    const query = z.object({ category: z.string().optional() }).parse(req.query);

    const { data: follows } = await supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', user.id);

    const friendIds = (follows ?? []).map((f) => f.followee_id);
    friendIds.push(user.id); // include self

    let q = supabase
      .from('leaderboard_entries')
      .select('*, profiles:user_id(display_name, avatar_url)')
      .in('user_id', friendIds)
      .order('best_score', { ascending: false });

    if (query.category) q = q.eq('category', query.category);

    const { data, error } = await q;
    if (error) return reply.status(500).send({ error: error.message });
    return { entries: data };
  });
}
