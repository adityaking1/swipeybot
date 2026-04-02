#!/bin/bash
set -e

echo "==> Building API server..."
cd /home/runner/workspace/artifacts/api-server
node ./build.mjs

echo "==> Starting API server on port 3000..."
export PORT=3000
exec node --enable-source-maps ./dist/index.mjs
