# SwipeyBot — Telegram Dating Bot

A Telegram-based dating/matchmaking bot (SwipeyBot) built as a pnpm monorepo. Users interact via Telegram to create profiles, browse matches, like/dislike others, and get connected when there's a mutual match.

## Architecture

**Monorepo structure managed with pnpm workspaces:**

- `artifacts/api-server/` — Core service: Express API + Telegram bot (long-polling)
- `lib/db/` — Shared Drizzle ORM schema & PostgreSQL connection
- `lib/api-zod/` — Shared Zod validation schemas

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript (compiled via esbuild)
- **Framework:** Express v5
- **Telegram:** node-telegram-bot-api (long-polling)
- **Primary DB:** MongoDB (via Mongoose) — users, likes, matches, messages
- **Secondary DB:** PostgreSQL (Drizzle ORM) — available via Replit integration
- **Scheduler:** node-cron (daily limit resets)
- **Logging:** Pino + pino-pretty
- **Package Manager:** pnpm v9+

## Environment Variables / Secrets

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `ADMIN_TELEGRAM_ID` | Telegram user ID for admin notifications |
| `SESSION_SECRET` | Random session secret |
| `PORT` | Server port (set to 5000) |

## Running the App

```bash
# Install dependencies
pnpm install

# Build api-server
cd artifacts/api-server && node ./build.mjs

# Start server
node --enable-source-maps ./dist/index.mjs
```

The workflow **"Start application"** runs: `cd artifacts/api-server && pnpm run start`

## Deployment

Configured as a **VM (always-on)** deployment — required because the Telegram bot uses long-polling and must stay running continuously.

- **Build:** `cd artifacts/api-server && node ./build.mjs`
- **Run:** `cd artifacts/api-server && node --enable-source-maps ./dist/index.mjs`
