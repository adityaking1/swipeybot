#!/bin/bash
set -e

echo "==> Building API server..."
cd /home/runner/workspace/artifacts/api-server
node ./build.mjs

echo "==> Starting API server on port 3000..."
PORT=3000 node --enable-source-maps ./dist/index.mjs &
API_PID=$!

echo "==> API server started (PID: $API_PID)"

echo "==> Starting web client (Vite) on port 5000..."
cd /home/runner/workspace/artifacts/web-client
exec pnpm run dev
