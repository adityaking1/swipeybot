# SwipeyBot — Telegram Dating Bot

A Telegram-based dating/matchmaking bot (SwipeyBot), built as a pnpm monorepo.

## Architecture

**Monorepo structure managed with pnpm workspaces:**

- `artifacts/api-server/` — Core service: Express API + Telegram bot (webhook/long-polling)
- `lib/db/` — Shared Drizzle ORM schema & PostgreSQL connection
- `lib/api-zod/` — Shared Zod validation schemas

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript (compiled via esbuild)
- **Framework:** Express v5 (minimal, used for webhook endpoint + health check)
- **Telegram:** node-telegram-bot-api
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
| `WEBHOOK_URL` | Public URL of your server — required for webhook mode |
| `ADMIN_TELEGRAM_ID` | Telegram user ID for admin notifications |
| `SESSION_SECRET` | Random session secret |

## Development

The workflow **"Start application"** runs `bash start-dev.sh` which:
1. Builds the API server with esbuild
2. Starts the API server on port 3000

```bash
# Install dependencies
pnpm install

# Run in development
bash start-dev.sh
```

## API Endpoints

- `GET /api/healthz` — Health check
- `POST /webhook/<token>` — Telegram webhook receiver

## Deployment

Configured as a **VM (always-on)** deployment — required because the Telegram bot must stay running continuously.

- **Build:** `cd artifacts/api-server && node ./build.mjs`
- **Run:** `cd artifacts/api-server && PORT=5000 node --enable-source-maps ./dist/index.mjs`
