'use client';

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

let player: Spotify.Player | null = null;
let deviceId: string | null = null;

export function loadSpotifySDK(): Promise<void> {
  return new Promise((resolve) => {
    if (window.Spotify) {
      resolve();
      return;
    }
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
  });
}

export async function initPlayer(
  accessToken: string,
  onReady: (id: string) => void,
  onError: (msg: string) => void,
): Promise<void> {
  await loadSpotifySDK();

  player = new window.Spotify.Player({
    name: 'Music Trivia',
    getOAuthToken: (cb) => cb(accessToken),
    volume: 0.8,
  });

  player.addListener('ready', ({ device_id }) => {
    deviceId = device_id;
    onReady(device_id);
  });

  player.addListener('not_ready', () => onError('Player not ready'));
  player.addListener('initialization_error', ({ message }) => onError(message));
  player.addListener('authentication_error', ({ message }) => onError(message));
  player.addListener('account_error', ({ message }) => onError(message));

  await player.connect();
}

export async function playTrackClip(
  trackUri: string,
  accessToken: string,
  startMs = 30_000,
  durationMs = 10_000,
): Promise<void> {
  if (!deviceId) throw new Error('No Spotify device ready');

  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: [trackUri], position_ms: startMs }),
  });

  // Stop after clip duration
  setTimeout(async () => {
    await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }, durationMs);
}

export function getPlayer(): Spotify.Player | null {
  return player;
}

export function getDeviceId(): string | null {
  return deviceId;
}
