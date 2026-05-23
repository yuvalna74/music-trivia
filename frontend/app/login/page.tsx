'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '../../lib/supabase/browser';

const ERROR_MESSAGES: Record<string, string> = {
  not_premium: 'Spotify Premium is required to play. Please upgrade and try again.',
  auth_failed: 'Authentication failed. Please try again.',
  no_provider_token: 'Could not connect to Spotify. Please try again.',
  spotify_check_failed: 'Could not verify your Spotify account. Please try again.',
};

function LoginContent() {
  const params = useSearchParams();
  const error = params.get('error');
  const supabase = createClient();

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes:
          'user-read-email user-read-private streaming user-modify-playback-state user-read-playback-state',
      },
    });
  }

  return (
    <div className="w-full max-w-sm space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-white tracking-tight">Music Trivia</h1>
        <p className="text-zinc-400 text-sm">Spotify-powered song guessing game</p>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
          {ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.'}
        </div>
      )}

      <button
        onClick={handleLogin}
        className="w-full bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-black font-bold py-4 px-6 rounded-full text-lg flex items-center justify-center gap-3"
      >
        <SpotifyIcon />
        Log in with Spotify
      </button>

      <p className="text-zinc-600 text-xs">
        Requires Spotify Premium for song playback
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <LoginContent />
      </Suspense>
    </main>
  );
}

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
