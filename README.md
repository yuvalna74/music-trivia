# Music Trivia

Spotify-powered song-guessing game — Solo mode with leaderboards + Jackbox-style Multiplayer Party Mode.

## Stack
- **Frontend**: Next.js 16 · TypeScript · TailwindCSS · Supabase SSR · socket.io-client · Spotify Web Playback SDK
- **Backend**: Fastify · TypeScript · socket.io · ioredis · Supabase service role · spotify-web-api-node · fuse.js
- **DB/Auth**: Supabase Postgres + Spotify OAuth
- **Infra**: Railway (frontend + backend services + Redis plugin)

## Local Dev

### Prerequisites
- Node 20+
- Supabase CLI (`npm i -g supabase`)
- Redis running locally (`redis-server`) OR set `REDIS_URL` to a remote instance

### Setup

```bash
# 1. Clone and install
git clone <repo>
cd music-trivia

# Install frontend deps
cd frontend && npm install && cd ..

# Install backend deps
cd backend && npm install && cd ..

# 2. Environment vars
cp backend/.env.example backend/.env     # fill in values
cp frontend/.env.local.example frontend/.env.local  # fill in values

# 3. Database
supabase link --project-ref ikhogdbjsgteeyybrwyc
supabase db push

# 4. Run both services
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

Frontend: http://localhost:3000  
Backend: http://localhost:8080

## Architecture

See `docs/ARCHITECTURE.md`.

## Supabase Schema

Migrations in `supabase/migrations/`. TypeScript types auto-generated in `shared/types/database.ts`.

```bash
# Regenerate types after schema changes
supabase gen types typescript --project-id ikhogdbjsgteeyybrwyc > shared/types/database.ts
```

## Deploy (Railway)

```bash
railway login
railway init

# Create two services: frontend, backend
# Provision Redis plugin
# Set env vars via: railway variables set KEY=value --service <name>

cd backend && railway up --service backend
cd frontend && railway up --service frontend
```
