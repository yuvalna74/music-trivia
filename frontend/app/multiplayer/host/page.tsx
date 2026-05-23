'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '../../../lib/supabase/browser';
import { api } from '../../../lib/api';
import { connectSocket } from '../../../lib/socket';
import { initPlayer, playTrackClip } from '../../../lib/spotify-sdk';
import { getRandomTrackForHost } from '../../../lib/host-helpers';
import type { Socket } from 'socket.io-client';

type Phase = 'setup' | 'lobby' | 'playing' | 'ended';

type Team = { id: string; name: string; score: number; ready: boolean };

export default function HostPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [sessionCode, setSessionCode] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [accessToken, setAccessToken] = useState('');
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<{ id: string; name: string; artist: string; artistNames: string[]; uri: string } | null>(null);
  const [roundNumber, setRoundNumber] = useState(0);
  const [currentTeamName, setCurrentTeamName] = useState('');
  const socketRef = useRef<Socket | null>(null);

  async function createSession() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setAccessToken(session.access_token);

    const res = await api.post<{ code: string }>('/multiplayer/host/create-session', {}, session.access_token);
    setSessionCode(res.code);

    // Init Spotify player
    await initPlayer(
      session.provider_token ?? session.access_token,
      () => setPlayerReady(true),
      (e) => console.error('Spotify error:', e),
    );

    // Connect socket
    const sock = connectSocket(session.access_token, res.code);
    socketRef.current = sock;

    sock.on('team:joined', (data: Team) => {
      setTeams((prev) => [...prev.filter((t) => t.id !== data.id), data]);
    });

    sock.on('team:left', ({ teamId }: { teamId: string }) => {
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
    });

    setPhase('lobby');
  }

  async function startGame() {
    if (!playerReady) {
      alert('Spotify player not ready yet');
      return;
    }
    await api.post('/multiplayer/host/start-game', { code: sessionCode }, accessToken);
    setPhase('playing');
    setRoundNumber(1);
    socketRef.current?.emit('host:start-round', { roundNumber: 1 });
    await playNextTurn(0);
  }

  async function playNextTurn(teamIndex: number) {
    if (!teams[teamIndex]) return;
    const team = teams[teamIndex];
    setCurrentTeamName(team.name);

    const track = await getRandomTrackForHost(accessToken);
    if (!track) return;
    setCurrentTrack(track);

    socketRef.current?.emit('host:start-round', {
      trackId: track.id,
      trackName: track.name,
      artistName: track.artist,
      artistNames: track.artistNames,
    });

    // Play 10s clip on host device
    await playTrackClip(track.uri, accessToken);
  }

  async function revealResult(songCorrect: boolean, artistCorrect: boolean, points: number) {
    socketRef.current?.emit('host:reveal-result', { songCorrect, artistCorrect, points });
  }

  async function nextTurn() {
    socketRef.current?.emit('host:next-turn');
  }

  async function endSession() {
    await api.post('/multiplayer/host/end-session', { code: sessionCode }, accessToken);
    socketRef.current?.disconnect();
    setPhase('ended');
  }

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  if (phase === 'setup') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center space-y-6 w-full max-w-sm">
          <h1 className="text-3xl font-black text-white">Host a Game</h1>
          <p className="text-zinc-400 text-sm">Music plays on your device. Teams answer on theirs.</p>
          <button
            onClick={createSession}
            className="w-full bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all text-white font-bold py-4 rounded-full text-lg"
          >
            Create Session
          </button>
        </div>
      </main>
    );
  }

  if (phase === 'lobby') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-start pt-12 px-6">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white">Lobby</h2>
            <div className="bg-zinc-900 rounded-2xl p-6 space-y-2">
              <p className="text-zinc-400 text-sm">Game code</p>
              <p className="text-5xl font-black text-white tracking-[0.3em]">{sessionCode}</p>
              <p className="text-zinc-500 text-xs">Share this with your teams</p>
              <p className="text-zinc-500 text-xs">or they can go to: <span className="text-green-400">music-trivia.app/multiplayer/team/{sessionCode}</span></p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-zinc-400 text-sm">{teams.length} teams joined (max 10)</p>
            {teams.map((team) => (
              <div key={team.id} className="bg-zinc-900 rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-white font-medium">{team.name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${team.ready ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                  {team.ready ? 'Ready' : 'Waiting'}
                </span>
              </div>
            ))}
            {teams.length === 0 && (
              <p className="text-zinc-600 text-center py-8 text-sm">Waiting for teams to join...</p>
            )}
          </div>

          <button
            onClick={startGame}
            disabled={teams.length === 0}
            className="w-full bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed active:scale-95 transition-all text-black font-bold py-4 rounded-full text-lg"
          >
            Start Game ({teams.length} teams)
          </button>
        </div>
      </main>
    );
  }

  if (phase === 'ended') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center space-y-6 w-full max-w-sm">
          <h2 className="text-3xl font-black text-white">Game Over!</h2>
          <div className="space-y-2">
            {[...teams].sort((a, b) => b.score - a.score).map((team, i) => (
              <div key={team.id} className={`flex justify-between items-center px-4 py-3 rounded-xl ${i === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-zinc-900'}`}>
                <span className="text-white font-medium">{i + 1}. {team.name}</span>
                <span className={`font-bold ${i === 0 ? 'text-yellow-400' : 'text-zinc-300'}`}>{team.score} pts</span>
              </div>
            ))}
          </div>
          <a href="/" className="block w-full bg-white text-black font-bold py-4 rounded-full">
            Done
          </a>
        </div>
      </main>
    );
  }

  // Playing phase
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-start pt-8 px-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex justify-between items-center">
          <span className="text-zinc-400 text-sm">Round {roundNumber}</span>
          <span className="text-white font-bold">{currentTeamName}'s turn</span>
          <button onClick={endSession} className="text-zinc-600 hover:text-red-400 transition-colors text-xs">End Game</button>
        </div>

        {currentTrack && (
          <div className="bg-zinc-900 rounded-2xl p-6 text-center space-y-2">
            <p className="text-zinc-400 text-xs">Now playing for {currentTeamName}</p>
            <p className="text-white font-bold">{currentTrack.name}</p>
            <p className="text-zinc-400 text-sm">{currentTrack.artist}</p>
          </div>
        )}

        {/* Live scoreboard */}
        <div className="space-y-2">
          {[...teams].sort((a, b) => b.score - a.score).map((team, i) => (
            <div key={team.id} className={`flex justify-between items-center px-4 py-3 rounded-xl ${team.name === currentTeamName ? 'bg-purple-900/40 border border-purple-600/30' : 'bg-zinc-900'}`}>
              <span className="text-white text-sm">{i + 1}. {team.name}</span>
              <span className="text-zinc-300 font-bold">{team.score} pts</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={nextTurn} className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl text-sm font-medium">
            Next Turn →
          </button>
          <button onClick={endSession} className="bg-red-900/40 hover:bg-red-900/60 text-red-400 py-3 rounded-xl text-sm font-medium">
            End Game
          </button>
        </div>
      </div>
    </main>
  );
}
