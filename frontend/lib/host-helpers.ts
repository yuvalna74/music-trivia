import { api } from './api';

export async function getRandomTrackForHost(accessToken: string): Promise<{
  id: string;
  name: string;
  artist: string;
  artistNames: string[];
  uri: string;
} | null> {
  const res = await api.post<{
    track: { trackId: string; trackName: string; artistName: string; artistNames: string[] };
    gameId: string;
  }>(
    '/solo/start',
    { category: 'Random' },
    accessToken,
  ).catch(() => null);

  if (!res) return null;
  const t = res.track;
  return {
    id: t.trackId,
    name: t.trackName,
    artist: t.artistName,
    artistNames: t.artistNames,
    uri: `spotify:track:${t.trackId}`,
  };
}
