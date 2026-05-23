import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { dualAuthMiddleware, requireAuthenticated } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';
import { getRandomTrack, CATEGORY_NAMES, refreshUserSpotifyToken } from '../services/spotify.js';
import { fuzzyMatch, matchArtist } from '../services/matching.js';
import { calculateRoundScore } from '../services/scoring.js';

const ROUNDS_PER_GAME = 10;

const startSchema = z.object({ category: z.string() });
const submitSchema = z.object({
  gameId: z.string().uuid(),
  trackId: z.string(),
  songAnswer: z.string(),
  artistAnswer: z.string(),
});

export async function soloRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', dualAuthMiddleware);
  fastify.addHook('preHandler', requireAuthenticated as never);

  fastify.get('/solo/categories', async () => ({ categories: CATEGORY_NAMES }));

  fastify.post('/solo/start', async (req, reply) => {
    const user = req.user as { type: 'authenticated'; id: string };
    const body = startSchema.parse(req.body);

    const track = await getRandomTrack(body.category);
    if (!track) return reply.status(500).send({ error: 'Could not fetch track' });

    const { data: game, error } = await supabase
      .from('solo_games')
      .insert({ user_id: user.id, category: body.category })
      .select()
      .single();
    if (error || !game) return reply.status(500).send({ error: 'DB error' });

    // Get user's Spotify access token for playback
    const spotifyToken = await refreshUserSpotifyToken(user.id);

    return {
      gameId: game.id,
      track: { ...track, spotifyToken },
      roundNumber: 1,
      totalRounds: ROUNDS_PER_GAME,
    };
  });

  fastify.post('/solo/next-round', async (req, reply) => {
    const user = req.user as { type: 'authenticated'; id: string };
    const body = z.object({ gameId: z.string().uuid(), category: z.string() }).parse(req.body);

    const { data: game } = await supabase
      .from('solo_games')
      .select('id, songs_correct, artists_correct, total_score')
      .eq('id', body.gameId)
      .eq('user_id', user.id)
      .single();
    if (!game) return reply.status(404).send({ error: 'Game not found' });

    const { count } = await supabase
      .from('round_results')
      .select('*', { count: 'exact', head: true })
      .eq('solo_game_id', body.gameId);

    if ((count ?? 0) >= ROUNDS_PER_GAME) {
      return reply.status(400).send({ error: 'Game already complete' });
    }

    const track = await getRandomTrack(body.category);
    if (!track) return reply.status(500).send({ error: 'Could not fetch track' });

    const spotifyToken = await refreshUserSpotifyToken(user.id);

    return {
      track: { ...track, spotifyToken },
      roundNumber: (count ?? 0) + 1,
      totalRounds: ROUNDS_PER_GAME,
    };
  });

  fastify.post('/solo/submit-answer', async (req, reply) => {
    const user = req.user as { type: 'authenticated'; id: string };
    const body = submitSchema.parse(req.body);

    const { data: game } = await supabase
      .from('solo_games')
      .select('*')
      .eq('id', body.gameId)
      .eq('user_id', user.id)
      .single();
    if (!game) return reply.status(404).send({ error: 'Game not found' });

    // Fetch canonical track info via Spotify API
    const SpotifyWebApi = (await import('spotify-web-api-node')).default;
    const client = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });
    const ccRes = await client.clientCredentialsGrant();
    client.setAccessToken(ccRes.body.access_token);
    const trackRes = await client.getTrack(body.trackId);
    const track = trackRes.body;

    const artistNames = track.artists.map((a) => a.name);
    const songCorrect = fuzzyMatch(track.name, body.songAnswer);
    const artistCorrect = matchArtist(artistNames, body.artistAnswer);
    const { pointsAwarded } = calculateRoundScore(songCorrect, artistCorrect);

    await supabase.from('round_results').insert({
      solo_game_id: body.gameId,
      track_id: body.trackId,
      track_name: track.name,
      artist_name: artistNames[0],
      song_answer: body.songAnswer,
      artist_answer: body.artistAnswer,
      song_correct: songCorrect,
      artist_correct: artistCorrect,
      points_awarded: pointsAwarded,
    });

    await supabase
      .from('solo_games')
      .update({
        total_score: game.total_score + pointsAwarded,
        songs_correct: game.songs_correct + (songCorrect ? 1 : 0),
        artists_correct: game.artists_correct + (artistCorrect ? 1 : 0),
      })
      .eq('id', body.gameId);

    return {
      songCorrect,
      artistCorrect,
      pointsAwarded,
      canonicalSong: track.name,
      canonicalArtist: artistNames[0],
    };
  });

  fastify.post('/solo/finish', async (req, reply) => {
    const user = req.user as { type: 'authenticated'; id: string };
    const body = z.object({ gameId: z.string().uuid() }).parse(req.body);

    const { data: game } = await supabase
      .from('solo_games')
      .select('*')
      .eq('id', body.gameId)
      .eq('user_id', user.id)
      .single();
    if (!game) return reply.status(404).send({ error: 'Game not found' });

    // Upsert leaderboard entry
    await supabase.from('leaderboard_entries').upsert(
      { user_id: user.id, category: game.category, best_score: game.total_score, achieved_at: new Date().toISOString() },
      { onConflict: 'user_id,category', ignoreDuplicates: false },
    );

    // Track segmentation event
    await supabase.from('segmentation_events').insert({
      user_id: user.id,
      event: 'solo_game_completed',
      metadata: { category: game.category, score: game.total_score },
    });

    return { game };
  });
}
