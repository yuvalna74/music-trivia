import type { Server } from 'socket.io';
import { verifyTeamToken } from '../services/team-tokens.js';
import { getSession, saveSession, refreshSessionTTL } from '../services/session.js';
import jwt from 'jsonwebtoken';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

type SocketUser =
  | { type: 'host'; userId: string; sessionCode: string }
  | { type: 'team'; teamId: string; sessionCode: string; name: string };

export function registerMultiplayerSocket(io: Server): void {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const code = socket.handshake.auth?.code as string | undefined;
    if (!token || !code) return next(new Error('Missing token or code'));

    // Try Supabase JWT (host)
    try {
      const payload = jwt.verify(token, SUPABASE_JWT_SECRET) as jwt.JwtPayload;
      if (payload.sub && payload.role === 'authenticated') {
        (socket as unknown as Record<string, unknown>).user = {
          type: 'host',
          userId: payload.sub,
          sessionCode: code.toUpperCase(),
        };
        return next();
      }
    } catch {
      // not a host token
    }

    // Try team token
    const claims = verifyTeamToken(token);
    if (claims) {
      (socket as unknown as Record<string, unknown>).user = {
        type: 'team',
        teamId: claims.teamId,
        sessionCode: code.toUpperCase(),
        name: claims.name,
      };
      return next();
    }

    return next(new Error('Invalid token'));
  });

  io.on('connection', (socket) => {
    const user = (socket as unknown as Record<string, unknown>).user as SocketUser;
    const roomCode = user.sessionCode;

    socket.join(roomCode);

    if (user.type === 'host') {
      socket.to(roomCode).emit('host:connected');
    } else {
      socket.to(roomCode).emit('team:joined', { teamId: user.teamId, name: user.name });
    }

    socket.on('host:start-round', async (data: { trackId: string; trackName: string; artistName: string; artistNames: string[] }) => {
      if (user.type !== 'host') return;
      const session = await getSession(roomCode);
      if (!session || session.hostUserId !== user.userId) return;

      session.round.phase = 'playing';
      session.round.trackId = data.trackId;
      session.round.trackName = data.trackName;
      session.round.artistName = data.artistName;
      await saveSession(session);

      io.to(roomCode).emit('round:started', {
        roundNumber: session.round.roundNumber,
        currentTeamIndex: session.round.currentTeamIndex,
        currentTeamId: session.teams[session.round.currentTeamIndex]?.id,
        currentTeamName: session.teams[session.round.currentTeamIndex]?.name,
      });

      await refreshSessionTTL(roomCode);
    });

    socket.on('host:reveal-result', async (data: { songCorrect: boolean; artistCorrect: boolean; points: number }) => {
      if (user.type !== 'host') return;
      const session = await getSession(roomCode);
      if (!session) return;

      session.round.phase = 'result';
      await saveSession(session);

      io.to(roomCode).emit('round:result', {
        ...data,
        teams: session.teams.map((t) => ({ id: t.id, name: t.name, score: t.score })),
      });
    });

    socket.on('host:next-turn', async () => {
      if (user.type !== 'host') return;
      const session = await getSession(roomCode);
      if (!session) return;

      session.round.currentTeamIndex =
        (session.round.currentTeamIndex + 1) % session.teams.length;

      const completedRounds = Math.floor(
        (session.round.roundNumber - 1) / session.teams.length,
      );

      if (completedRounds >= session.maxRoundsPerTeam) {
        session.round.phase = 'ended';
        await saveSession(session);
        io.to(roomCode).emit('game:ended', {
          teams: session.teams.map((t) => ({ id: t.id, name: t.name, score: t.score })),
        });
        return;
      }

      session.round.roundNumber += 1;
      session.round.phase = 'picking';
      await saveSession(session);

      io.to(roomCode).emit('turn:next', {
        roundNumber: session.round.roundNumber,
        currentTeamIndex: session.round.currentTeamIndex,
        currentTeamId: session.teams[session.round.currentTeamIndex]?.id,
        currentTeamName: session.teams[session.round.currentTeamIndex]?.name,
      });
    });

    socket.on('team:pick-genre', (data: { genre: string }) => {
      if (user.type !== 'team') return;
      socket.to(roomCode).emit('team:genre-picked', { teamId: user.teamId, genre: data.genre });
    });

    socket.on('disconnect', () => {
      if (user.type === 'host') {
        socket.to(roomCode).emit('host:disconnected');
      } else {
        socket.to(roomCode).emit('team:left', { teamId: user.teamId });
      }
    });
  });
}
