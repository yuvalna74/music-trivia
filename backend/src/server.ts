import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Server as SocketIOServer } from 'socket.io';
import { redis } from './lib/redis.js';
import { soloRoutes } from './routes/solo.js';
import { leaderboardRoutes } from './routes/leaderboard.js';
import { multiplayerHostRoutes } from './routes/multiplayer-host.js';
import { multiplayerTeamRoutes } from './routes/multiplayer-team.js';
import { authRoutes } from './routes/auth.js';
import { registerMultiplayerSocket } from './sockets/multiplayer.js';

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: FRONTEND_URL,
  credentials: true,
});

await fastify.register(helmet, { contentSecurityPolicy: false });

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip,
});

fastify.get('/health', async () => ({ ok: true }));

await fastify.register(authRoutes);
await fastify.register(soloRoutes);
await fastify.register(leaderboardRoutes);
await fastify.register(multiplayerHostRoutes);
await fastify.register(multiplayerTeamRoutes);

// Attach socket.io to Fastify's underlying HTTP server before starting
const io = new SocketIOServer(fastify.server, {
  cors: { origin: FRONTEND_URL, credentials: true },
  transports: ['websocket', 'polling'],
});

registerMultiplayerSocket(io);

await redis.connect();

await fastify.listen({ port: PORT, host: '0.0.0.0' });
console.log(`Backend listening on port ${PORT}`);

process.on('SIGTERM', async () => {
  await fastify.close();
  await redis.quit();
  process.exit(0);
});
