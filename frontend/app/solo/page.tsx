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

  async function startGame(category: string) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await api.post<{ gameId: string }>(
      '/solo/start',
      { category },
      session.access_token,
    );
    setGameState({ phase: 'playing', gameId: res.gameId, category, accessToken: session.access_token });
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

        <div className="grid grid-cols-2 gap-3">
          {CATEGORY_NAMES.map((cat) => (
            <button
              key={cat}
              onClick={() => startGame(cat)}
              className="bg-zinc-900 hover:bg-zinc-800 active:scale-95 transition-all text-white font-semibold py-4 px-3 rounded-2xl text-sm border border-zinc-800 hover:border-zinc-600"
            >
              {cat}
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
