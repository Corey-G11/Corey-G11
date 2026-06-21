# FitOS

> AI fitness coaching app — Phase 1.

A TypeScript monorepo delivering the FitOS Phase 1 stack: a PostgreSQL schema,
a NestJS Core API, and an Expo React Native onboarding flow.

## Stack

- **Node** 20+
- **NestJS** (Core API)
- **PostgreSQL 16** (`pgvector`) + **Redis**
- **Expo SDK 51** / React Native (Expo Router)
- **TypeScript** strict mode, npm workspaces

## Structure

```
.
├── apps/api/          NestJS Core API (auth, onboarding, TDEE)
├── apps/mobile/       Expo app (5-screen onboarding + macro results)
├── packages/shared/   Shared TypeScript types
├── infra/db/          SQL migrations + seed + runner
└── docker-compose.yml Postgres (pgvector) + Redis
```

## Getting started

```bash
# 1. Install dependencies (workspace root)
npm install

# 2. Start infrastructure
docker-compose up -d

# 3. Run migrations + seed
npm run db:migrate
npm run db:seed

# 4. Start the API (terminal 1) → http://localhost:3001
cd apps/api && npm run start:dev

# 5. Start the mobile app (terminal 2)
cd apps/mobile && npx expo start
# press 'i' for the iOS simulator
```

Copy `.env.example` to `.env` in `apps/api` and `apps/mobile` and adjust as needed.

## What's implemented (Phase 1)

| Area     | Highlights |
|----------|-----------|
| Database | 14 tables in FK order, RLS isolation policies, `updated_at` triggers, GIN/partial indexes, 20-exercise seed |
| API      | JWT auth (bcrypt rounds=12), Mifflin-St Jeor TDEE/macro engine (unit-tested), transactional onboarding, users endpoints |
| Mobile   | 5-screen onboarding (basics, goals, schedule, food) + macro results, dark theme, typed API client |

## Scripts

| Command              | Description                         |
|----------------------|-------------------------------------|
| `npm run dev:api`    | Start the API in watch mode         |
| `npm run dev:mobile` | Start the Expo dev server           |
| `npm run db:migrate` | Apply SQL migrations                |
| `npm run db:seed`    | Seed the exercise dictionary        |
| `npm test`           | Run workspace tests                 |
