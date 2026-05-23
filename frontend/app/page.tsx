import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabase/server';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single();

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          {profile?.avatar_url && (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-16 h-16 rounded-full mx-auto border-2 border-zinc-700"
            />
          )}
          <h1 className="text-3xl font-black text-white">Music Trivia</h1>
          <p className="text-zinc-400 text-sm">
            Hey {profile?.display_name ?? 'there'}!
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/solo"
            className="block w-full bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-black font-bold py-5 px-6 rounded-2xl text-center text-lg"
          >
            Solo Mode
            <p className="text-xs font-normal mt-0.5 text-black/70">Play alone · Climb the leaderboard</p>
          </Link>

          <Link
            href="/multiplayer/host"
            className="block w-full bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all text-white font-bold py-5 px-6 rounded-2xl text-center text-lg"
          >
            Host a Party
            <p className="text-xs font-normal mt-0.5 text-white/70">Up to 10 teams · No accounts needed</p>
          </Link>

          <Link
            href="/multiplayer/team"
            className="block w-full bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all text-white font-bold py-5 px-6 rounded-2xl text-center text-lg"
          >
            Join a Game
            <p className="text-xs font-normal mt-0.5 text-white/70">Enter a code to join</p>
          </Link>

          <Link
            href="/leaderboard"
            className="block w-full text-zinc-400 hover:text-white transition-colors text-center py-3 text-sm"
          >
            Leaderboards →
          </Link>
        </div>
      </div>
    </main>
  );
}
