# SwipeyBot — Telegram Dating Bot + Random Chat Web

A Telegram-based dating/matchmaking bot (SwipeyBot) + Random Chat web app, built as a pnpm monorepo.

## Architecture

**Monorepo structure managed with pnpm workspaces:**

- `artifacts/api-server/` — Core service: Express API + Telegram bot (webhook) + Socket.io random chat
- `artifacts/web-client/` — React + Vite frontend for Random Chat / Admin Dashboard (served from Express in production)
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
| `WEBHOOK_URL` | Public URL of your server (e.g. `https://yourapp.fps.ms`) — required for webhook mode |
| `ADMIN_TELEGRAM_ID` | Telegram user ID for admin notifications |
| `SESSION_SECRET` | Random session secret |
| `PORT` | Server port (default 3000 in dev, 5000 in production) |

## Development

The workflow **"Start application"** runs `bash start-dev.sh` which:
1. Builds the API server with esbuild
2. Starts the API server on port 3000
3. Starts the Vite dev server (web-client) on port 5000

Frontend is proxied through Vite to the API at `/api` and `/socket.io`.

```bash
# Install dependencies
pnpm install

# Run in development (both services)
bash start-dev.sh
```

## Deployment

Configured as a **VM (always-on)** deployment — required because the Telegram bot uses long-polling and must stay running continuously.

- **Build:** Builds api-server (esbuild) and web-client (Vite → outputs to `artifacts/api-server/public/`)
- **Run:** `cd artifacts/api-server && PORT=5000 node --enable-source-maps ./dist/index.mjs`

In production, the Express server serves the built frontend static files from `public/` and handles all API routes.
