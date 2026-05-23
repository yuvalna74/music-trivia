'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { initPlayer, playTrackClip } from '../lib/spotify-sdk';
import { ROUNDS_PER_GAME, ANSWER_WINDOW_SECONDS, CLIP_DURATION_MS } from '../lib/constants';

type Track = {
  trackId: string;
  trackName: string;
  artistName: string;
  artistNames: string[];
  previewUrl: string | null;
  spotifyToken: string;
};

type RoundResult = {
  songCorrect: boolean;
  artistCorrect: boolean;
  pointsAwarded: number;
  canonicalSong: string;
  canonicalArtist: string;
};

type GameSummary = {
  totalScore: number;
  roundResults: RoundResult[];
};

type Phase = 'loading' | 'playing' | 'result' | 'finished';

interface Props {
  gameId: string;
  category: string;
  accessToken: string;
  onFinish: () => void;
}

export default function SoloGame({ gameId, category, accessToken, onFinish }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [track, setTrack] = useState<Track | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [songAnswer, setSongAnswer] = useState('');
  const [artistAnswer, setArtistAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(ANSWER_WINDOW_SECONDS);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initPlayer(
      accessToken,
      () => setPlayerReady(true),
      (msg) => setPlayerError(msg),
    );
  }, [accessToken]);

  const loadTrack = useCallback(async () => {
    setPhase('loading');
    const res = await api.post<{ track: Track; roundNumber: number }>(
      '/solo/next-round',
      { gameId, category },
      accessToken,
    ).catch(() => null);
    if (!res) return;
    setTrack(res.track);
    setRoundNumber(res.roundNumber);
    setSongAnswer('');
    setArtistAnswer('');
    setTimeLeft(ANSWER_WINDOW_SECONDS);
    setPhase('playing');
  }, [gameId, category, accessToken]);

  // Start timer when phase = playing
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  async function handlePlayClip() {
    if (!track || !playerReady) return;
    setIsPlaying(true);
    // Seek to 30s mark for 10s clip
    await playTrackClip(
      `spotify:track:${track.trackId}`,
      track.spotifyToken,
      30_000,
      CLIP_DURATION_MS,
    ).catch(() => null);
    setTimeout(() => setIsPlaying(false), CLIP_DURATION_MS);
  }

  async function handleSubmit() {
    if (!track) return;
    setPhase('loading');
    if (timerRef.current) clearInterval(timerRef.current);

    const res = await api.post<RoundResult>(
      '/solo/submit-answer',
      { gameId, trackId: track.trackId, songAnswer, artistAnswer },
      accessToken,
    ).catch(() => null);
    if (!res) return;

    setResult(res);
    setTotalScore((s) => s + res.pointsAwarded);
    setPhase('result');
  }

  async function handleNextRound() {
    if (roundNumber >= ROUNDS_PER_GAME) {
      await api.post('/solo/finish', { gameId }, accessToken).catch(() => null);
      setPhase('finished');
      return;
    }
    await loadTrack();
  }

  // Load first round on mount
  useEffect(() => { loadTrack(); }, []);

  if (phase === 'loading') {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center space-y-3">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400">Loading track...</p>
        </div>
      </main>
    );
  }

  if (phase === 'finished') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h2 className="text-3xl font-black text-white">Game Over!</h2>
          <div className="bg-zinc-900 rounded-2xl p-6">
            <p className="text-zinc-400 text-sm">Your score</p>
            <p className="text-5xl font-black text-green-400 mt-2">{totalScore}</p>
          </div>
          <div className="space-y-3">
            <a href="/leaderboard" className="block w-full bg-green-500 text-black font-bold py-4 rounded-full">
              View Leaderboard
            </a>
            <button onClick={onFinish} className="block w-full text-zinc-400 hover:text-white transition-colors py-3 text-sm">
              Play Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === 'result' && result) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <p className="text-zinc-400 text-sm">Round {roundNumber} result</p>
            <p className="text-4xl font-black mt-1">
              {result.pointsAwarded > 0 ? (
                <span className="text-green-400">+{result.pointsAwarded} pts</span>
              ) : (
                <span className="text-red-400">0 pts</span>
              )}
            </p>
          </div>

          <div className="bg-zinc-900 rounded-2xl p-5 space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Song</span>
              <span className={result.songCorrect ? 'text-green-400' : 'text-red-400'}>
                {result.songCorrect ? '✓' : '✗'} {result.canonicalSong}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Artist</span>
              <span className={result.artistCorrect ? 'text-green-400' : 'text-red-400'}>
                {result.artistCorrect ? '✓' : '✗'} {result.canonicalArtist}
              </span>
            </div>
            <div className="border-t border-zinc-800 pt-3 flex justify-between">
              <span className="text-zinc-400">Total</span>
              <span className="text-white font-bold">{totalScore} pts</span>
            </div>
          </div>

          <button
            onClick={handleNextRound}
            className="w-full bg-white text-black font-bold py-4 rounded-full hover:bg-zinc-100 transition-colors"
          >
            {roundNumber >= ROUNDS_PER_GAME ? 'See Final Score' : 'Next Round →'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-start pt-12 px-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center text-sm text-zinc-400">
          <span>Round {roundNumber}/{ROUNDS_PER_GAME}</span>
          <span className="font-bold text-white">{totalScore} pts</span>
          <span className={timeLeft <= 10 ? 'text-red-400 font-bold animate-pulse' : ''}>
            {timeLeft}s
          </span>
        </div>

        {/* Timer bar */}
        <div className="w-full bg-zinc-800 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${timeLeft <= 10 ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${(timeLeft / ANSWER_WINDOW_SECONDS) * 100}%` }}
          />
        </div>

        {/* Play button */}
        <div className="flex flex-col items-center gap-3">
          {playerError ? (
            <p className="text-red-400 text-sm text-center">{playerError}</p>
          ) : (
            <button
              onClick={handlePlayClip}
              disabled={isPlaying || !playerReady}
              className="w-24 h-24 rounded-full bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 disabled:cursor-not-allowed transition-all flex items-center justify-center text-black active:scale-95"
              aria-label="Play 10-second clip"
            >
              {isPlaying ? (
                <span className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <span key={i} className="w-1.5 h-6 bg-black rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </span>
              ) : (
                <svg viewBox="0 0 24 24" className="w-10 h-10 fill-current ml-1" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          )}
          <p className="text-zinc-500 text-xs">
            {!playerReady ? 'Connecting to Spotify...' : isPlaying ? 'Playing 10s clip...' : 'Tap to hear the clip'}
          </p>
        </div>

        {/* Answer inputs */}
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
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-green-500 outline-none text-white rounded-xl px-4 py-3 text-sm transition-colors"
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
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-green-500 outline-none text-white rounded-xl px-4 py-3 text-sm transition-colors"
              autoComplete="off"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-green-500 hover:bg-green-400 active:scale-95 transition-all text-black font-bold py-4 rounded-full"
        >
          Submit Answer
        </button>
      </div>
    </main>
  );
}
