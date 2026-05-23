import SpotifyWebApi from 'spotify-web-api-node';
import { supabase } from '../lib/supabase.js';

const CATEGORIES: Record<string, string> = {
  'Pop 2000s': '2000s-pop',
  '90s Rock': '90s-rock',
  'Hip-Hop': 'hip-hop',
  'EDM': 'electronic',
  'Indie': 'indie',
  'Latin': 'latin',
  'Soundtracks': 'soundtracks',
  'Random': 'pop',
};

export const CATEGORY_NAMES = Object.keys(CATEGORIES);

function makeClient(): SpotifyWebApi {
  return new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });
}

async function getAppToken(): Promise<string> {
  const client = makeClient();
  const data = await client.clientCredentialsGrant();
  return data.body.access_token;
}

export async function getRandomTrack(category: string): Promise<{
  trackId: string;
  trackName: string;
  artistName: string;
  artistNames: string[];
  previewUrl: string | null;
} | null> {
  const genre = CATEGORIES[category] ?? 'pop';
  const token = await getAppToken();
  const client = makeClient();
  client.setAccessToken(token);

  // Search for tracks in the genre
  const offset = Math.floor(Math.random() * 100);
  const res = await client.searchTracks(`genre:${genre}`, { limit: 1, offset });
  const track = res.body.tracks?.items?.[0];
  if (!track) return null;

  const artistNames = track.artists.map((a) => a.name);
  return {
    trackId: track.id,
    trackName: track.name,
    artistName: artistNames[0],
    artistNames,
    previewUrl: track.preview_url,
  };
}

export async function getTrackForPlayback(
  trackId: string,
  userAccessToken: string,
): Promise<{ uri: string; durationMs: number } | null> {
  const client = makeClient();
  client.setAccessToken(userAccessToken);
  const res = await client.getTrack(trackId);
  const track = res.body;
  return { uri: track.uri, durationMs: track.duration_ms };
}

export async function refreshUserSpotifyToken(userId: string): Promise<string | null> {
  const { data: tokenRow } = await supabase
    .from('user_spotify_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!tokenRow) return null;

  if (new Date(tokenRow.expires_at) > new Date(Date.now() + 60_000)) {
    return tokenRow.access_token;
  }

  const client = makeClient();
  client.setRefreshToken(tokenRow.refresh_token);
  const data = await client.refreshAccessToken();
  const newToken = data.body.access_token;
  const expiresAt = new Date(Date.now() + data.body.expires_in * 1000).toISOString();

  await supabase.from('user_spotify_tokens').upsert({
    user_id: userId,
    access_token: newToken,
    refresh_token: tokenRow.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  return newToken;
}
