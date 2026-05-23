'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { saveTeamToken, getTeamSession } from '../../../../lib/team-session';
import { connectSocket } from '../../../../lib/socket';
import type { Socket } from 'socket.io-client';

type Phase = 'join' | 'lobby' | 'waiting' | 'answering' | 'result' | 'ended';

type RoundInfo = {
  trackId: string;
  trackName: string;
  artistName: string;
  artistNames: string[];
  currentTeamName: string;
  isMyTurn: boolean;
};

type RoundResult = {
  songCorrect: boolean;
  artistCorrect: boolean;
  pointsAwarded: number;
  canonicalSong: string;
  canonicalArtist: string;
  teamScore: number;
};

export default function TeamGamePage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();

  const [phase, setPhase] = useState<Phase>('join');
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [teamToken, setTeamToken] = useState('');
  const [teams, setTeams] = useState<{ id: string; name: string; score: number }[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [roundInfo, setRoundInfo] = useState<RoundInfo | null>(null);
  const [songAnswer, setSongAnswer] = useState('');
  const [artistAnswer, setArtistAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [finalTeams, setFinalTeams] = useState<{ id: string; name: string; score: number }[]>([]);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myTeamIdRef = useRef('');

  // Restore session on reload
  useEffect(() => {
    const existing = getTeamSession(code);
    if (existing) {
      setTeamId(existing.teamId);
      setTeamToken(existing.token);
      setTeamName(existing.teamName);
      connectToGame(existing.token, existing.teamId);
      setPhase('lobby');
    }
  }, []);

  function connectToGame(token: string, tid: string) {
    myTeamIdRef.current = tid;
    const sock = connectSocket(token, code);
    socketRef.current = sock;

    sock.on('team:joined', (team: { id: string; name: string; score: number }) => {
      setTeams((prev) => [...prev.filter((t) => t.id !== team.id), team]);
    });

    sock.on('round:started', (data: { currentTeamId: string; currentTeamName: string; roundNumber: number }) => {
      const isMyTurn = data.currentTeamId === myTeamIdRef.current;
      if (isMyTurn) {
        setPhase('answering');
        setSongAnswer('');
        setArtistAnswer('');
        setTimeLeft(60);
        startTimer();
      } else {
        setPhase('waiting');
      }
      setRoundInfo((prev) => prev ? { ...prev, currentTeamName: data.currentTeamName, isMyTurn } : null);
    });

    sock.on('round:result', (data: { teams: { id: string; name: string; score: number }[] }) => {
      const myTeam = data.teams.find((t) => t.id === myTeamIdRef.current);
      if (myTeam) setMyScore(myTeam.score);
      setTeams(data.teams);
      setPhase('result');
    });

    sock.on('game:ended', (data: { teams: { id: string; name: string; score: number }[] }) => {
      setFinalTeams(data.teams.sort((a, b) => b.score - a.score));
      setPhase('ended');
    });
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;

    try {
      const res = await api.post<{ teamId: string; teamToken: string; sessionState: { teams: { id: string; name: string; score: number }[]; phase: string } }>(
        '/multiplayer/team/join',
        { code, teamName: teamName.trim() },
      );

      saveTeamToken(code, res.teamToken, res.teamId, teamName.trim());
      setTeamId(res.teamId);
      setTeamToken(res.teamToken);
      setTeams(res.sessionState.teams);
      connectToGame(res.teamToken, res.teamId);
      setPhase('lobby');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not join game');
    }
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmitAnswer();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  async function handleSubmitAnswer() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!roundInfo) return;

    const res = await api.post<RoundResult>(
      '/multiplayer/team/answer',
      {
        code,
        trackId: roundInfo.trackId,
        trackName: roundInfo.trackName,
        artistName: roundInfo.artistName,
        artistNames: roundInfo.artistNames,
        songAnswer,
        artistAnswer,
      },
      teamToken,
    ).catch(() => null);

    if (res) {
      setResult(res);
      setMyScore(res.teamScore);
    }
    setPhase('result');
  }

  async function toggleReady(ready: boolean) {
    await api.post('/multiplayer/team/ready', { code, ready }, teamToken).catch(() => null);
  }

  if (phase === 'join') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <p className="text-zinc-500 text-sm">Game</p>
            <p className="text-3xl font-black text-white tracking-[0.3em]">{code}</p>
            <h1 className="text-xl font-bold text-white mt-4">Join Music Trivia</h1>
            <p className="text-zinc-400 text-sm">No account needed — just enter your team name</p>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={30}
              placeholder="Team name..."
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-green-500 outline-none text-white rounded-xl px-4 py-4 text-lg text-center transition-colors"
              autoFocus
            />
            <button
              type="submit"
              disabled={!teamName.trim()}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed active:scale-95 transition-all text-black font-bold py-4 rounded-full text-lg"
            >
              Join Game
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (phase === 'lobby') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">Waiting for host</h2>
            <p className="text-zinc-400 text-sm">
              You're in as <span className="text-green-400 font-bold">{teamName}</span>
            </p>
          </div>

          <div className="bg-zinc-900 rounded-2xl p-4 space-y-2">
            {teams.map((t) => (
              <div key={t.id} className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${t.id === teamId ? 'bg-green-500/10 text-green-400' : 'text-zinc-300'}`}>
                {t.id === teamId && '→ '}
                {t.name}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => toggleReady(true)}
              className="flex-1 bg-green-500 text-black font-bold py-3 rounded-xl text-sm"
            >
              Ready ✓
            </button>
            <button
              onClick={() => toggleReady(false)}
              className="flex-1 bg-zinc-800 text-zinc-300 py-3 rounded-xl text-sm"
            >
              Not ready
            </button>
          </div>

          <p className="text-zinc-600 text-xs">The host will start the game when everyone's ready</p>
        </div>
      </main>
    );
  }

  if (phase === 'waiting') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white font-bold text-lg">{roundInfo?.currentTeamName ?? 'A team'} is playing...</p>
          <p className="text-zinc-400 text-sm">Your turn is coming up</p>
          <div className="mt-4">
            <p className="text-zinc-600 text-xs">Your score</p>
            <p className="text-3xl font-black text-white">{myScore} pts</p>
          </div>
        </div>
      </main>
    );
  }

  if (phase === 'answering') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-start pt-12 px-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-green-400 font-bold text-sm">Your turn!</span>
            <span className={`font-black text-2xl ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </div>

          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${timeLeft <= 10 ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            />
          </div>

          <p className="text-center text-zinc-400 text-sm">The host is playing the clip — listen and type!</p>

          <div className="space-y-3">
            <div>
              <label htmlFor="song" className="block text-zinc-400 text-xs mb-1.5">
                Song title (5 pts)
              </label>
              <input
                id="song"
                type="text"
                value={songAnswer}
                onChange={(e) => setSongAnswer(e.target.value)}
                placeholder="Enter song title..."
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-green-500 outline-none text-white rounded-xl px-4 py-4 text-lg transition-colors"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="artist" className="block text-zinc-400 text-xs mb-1.5">
                Artist / Performer (10 pts)
              </label>
              <input
                id="artist"
                type="text"
                value={artistAnswer}
                onChange={(e) => setArtistAnswer(e.target.value)}
                placeholder="Enter artist name..."
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-green-500 outline-none text-white rounded-xl px-4 py-4 text-lg transition-colors"
                autoComplete="off"
              />
            </div>
          </div>

          <button
            onClick={handleSubmitAnswer}
            className="w-full bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-black font-bold py-5 rounded-full text-xl"
          >
            Submit Answer
          </button>
        </div>
      </main>
    );
  }

  if (phase === 'result' && result) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <p className="text-zinc-400 text-sm">Round result</p>
            <p className={`text-5xl font-black mt-2 ${result.pointsAwarded > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {result.pointsAwarded > 0 ? `+${result.pointsAwarded}` : '0'} pts
            </p>
          </div>

          <div className="bg-zinc-900 rounded-2xl p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Song</span>
              <span className={result.songCorrect ? 'text-green-400' : 'text-red-400'}>
                {result.songCorrect ? '✓' : '✗'} {result.canonicalSong}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Artist</span>
              <span className={result.artistCorrect ? 'text-green-400' : 'text-red-400'}>
                {result.artistCorrect ? '✓' : '✗'} {result.canonicalArtist}
              </span>
            </div>
            <div className="border-t border-zinc-800 pt-3 flex justify-between">
              <span className="text-zinc-400">Your total</span>
              <span className="text-white font-bold">{myScore} pts</span>
            </div>
          </div>

          <div className="space-y-2">
            {teams.sort((a, b) => b.score - a.score).map((t, i) => (
              <div key={t.id} className={`flex justify-between px-4 py-2 rounded-xl text-sm ${t.id === teamId ? 'bg-green-500/10 border border-green-500/20' : 'bg-zinc-900'}`}>
                <span className="text-white">{i + 1}. {t.name}</span>
                <span className="text-zinc-300">{t.score} pts</span>
              </div>
            ))}
          </div>

          <p className="text-zinc-600 text-xs">Waiting for host to continue...</p>
        </div>
      </main>
    );
  }

  if (phase === 'ended') {
    const myRank = finalTeams.findIndex((t) => t.id === teamId) + 1;
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h2 className="text-3xl font-black text-white">Game Over!</h2>
          <div>
            <p className="text-zinc-400 text-sm">Your team</p>
            <p className="text-xl font-bold text-white">{teamName}</p>
            <p className="text-zinc-400 text-sm">Finished #{myRank} with {myScore} pts</p>
          </div>
          <div className="space-y-2">
            {finalTeams.map((t, i) => (
              <div key={t.id} className={`flex justify-between px-4 py-3 rounded-xl text-sm ${t.id === teamId ? (i === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-green-500/10 border border-green-500/20') : 'bg-zinc-900'}`}>
                <span className="text-white">{i + 1}. {t.name}</span>
                <span className={`font-bold ${i === 0 ? 'text-yellow-400' : 'text-zinc-300'}`}>{t.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return null;
}
