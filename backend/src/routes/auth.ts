import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { dualAuthMiddleware, requireAuthenticated } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', dualAuthMiddleware);
  fastify.addHook('preHandler', requireAuthenticated as never);

  fastify.post('/auth/store-spotify-tokens', async (req, reply) => {
    const user = req.user as { type: 'authenticated'; id: string };
    const body = z
      .object({
        spotifyAccessToken: z.string(),
        spotifyRefreshToken: z.string().optional(),
        expiresIn: z.number().optional().default(3600),
      })
      .parse(req.body);

    const expiresAt = new Date(Date.now() + body.expiresIn * 1000).toISOString();

    await supabase.from('user_spotify_tokens').upsert({
      user_id: user.id,
      access_token: body.spotifyAccessToken,
      refresh_token: body.spotifyRefreshToken ?? '',
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });

    return { ok: true };
  });
}
