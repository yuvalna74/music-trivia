'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamEntryPage() {
  const [code, setCode] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase().slice(0, 6);
    if (cleaned.length < 6) return;
    router.push(`/multiplayer/team/${cleaned}`);
  }

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-white">Join a Game</h1>
          <p className="text-zinc-400 text-sm">Enter the 6-character code from the host</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            className="w-full bg-zinc-900 border border-zinc-700 focus:border-green-500 outline-none text-white text-center text-3xl font-black rounded-2xl px-4 py-5 tracking-[0.3em] uppercase transition-colors"
            autoComplete="off"
            autoFocus
          />
          <button
            type="submit"
            disabled={code.length < 6}
            className="w-full bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed active:scale-95 transition-all text-black font-bold py-4 rounded-full text-lg"
          >
            Join Game
          </button>
        </form>
      </div>
    </main>
  );
}
