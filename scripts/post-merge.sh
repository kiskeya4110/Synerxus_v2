#!/bin/bash
set -e
npm install
echo "" | npx drizzle-kit push --force 2>/dev/null || npx drizzle-kit push --force --accept-data-loss 2>/dev/null || true
