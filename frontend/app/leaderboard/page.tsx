'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { createClient } from '../../lib/supabase/browser';
import { CATEGORY_NAMES } from '../../lib/constants';

type Entry = {
  id: string;
  user_id: string;
  category: string;
  best_score: number;
  achieved_at: string;
  profiles: { display_name: string; avatar_url: string } | null;
};

type Tab = 'global' | 'friends';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('global');
  const [category, setCategory] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
  }, []);

  useEffect(() => {
    loadEntries();
  }, [tab, category, accessToken]);

  async function loadEntries() {
    const params = new URLSearchParams();
    if (category) params.set('category', category);

    const path = tab === 'friends' ? '/leaderboard/friends' : '/leaderboard/global';
    const res = await api.get<{ entries: Entry[] }>(
      `${path}?${params}`,
      accessToken ?? undefined,
    ).catch(() => ({ entries: [] }));

    setEntries(res.entries ?? []);
  }

  return (
    <main className="min-h-screen bg-black flex flex-col items-start pt-12 px-6">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-white">Leaderboard</h1>
          <a href="/" className="text-zinc-500 hover:text-white transition-colors text-sm">← Home</a>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['global', 'friends'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-green-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategory('')}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${!category ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}
          >
            All
          </button>
          {CATEGORY_NAMES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat === category ? '' : cat)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${category === cat ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Entries */}
        <div className="space-y-2">
          {entries.length === 0 && (
            <p className="text-zinc-600 text-center py-12 text-sm">No entries yet</p>
          )}
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl ${i === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-zinc-900'}`}
            >
              <span className={`text-sm font-bold w-6 text-center ${i === 0 ? 'text-yellow-400' : 'text-zinc-500'}`}>
                {i + 1}
              </span>
              {entry.profiles?.avatar_url ? (
                <img src={entry.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-700" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{entry.profiles?.display_name ?? 'Anonymous'}</p>
                <p className="text-zinc-500 text-xs">{entry.category}</p>
              </div>
              <span className={`font-black ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>
                {entry.best_score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
