'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/browser';
import { api } from '../../lib/api';
import { CATEGORY_NAMES } from '../../lib/constants';
import SoloGame from '../../components/SoloGame';

type GameState =
  | { phase: 'pick-category' }
  | { phase: 'playing'; gameId: string; category: string; accessToken: string };

export default function SoloPage() {
  const [gameState, setGameState] = useState<GameState>({ phase: 'pick-category' });
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startGame(category: string) {
    setLoading(category);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const res = await api.post<{ gameId: string }>(
        '/solo/start',
        { category },
        session.access_token,
      );
      setGameState({ phase: 'playing', gameId: res.gameId, category, accessToken: session.access_token });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  if (gameState.phase === 'playing') {
    return (
      <SoloGame
        gameId={gameState.gameId}
        category={gameState.category}
        accessToken={gameState.accessToken}
        onFinish={() => setGameState({ phase: 'pick-category' })}
      />
    );
  }

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-white">Solo Mode</h1>
          <p className="text-zinc-400 mt-1 text-sm">Pick a category to start</p>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {CATEGORY_NAMES.map((cat) => (
            <button
              key={cat}
              onClick={() => startGame(cat)}
              disabled={loading !== null}
              className="bg-zinc-900 hover:bg-zinc-800 active:scale-95 transition-all text-white font-semibold py-4 px-3 rounded-2xl text-sm border border-zinc-800 hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === cat ? '...' : cat}
            </button>
          ))}
        </div>

        <a href="/" className="block text-center text-zinc-500 hover:text-white transition-colors text-sm">
          ← Back
        </a>
      </div>
    </main>
  );
}
