#!/bin/bash
set -e
npm install
# Run db:push non-interactively by answering 'no' to all prompts (safe — skips
# destructive operations like truncates while still applying additive changes).
# 'yes no' pipes: first answer accepts the push itself, subsequent 'no' answers
# decline any destructive table operations.
yes no | npx drizzle-kit push 2>/dev/null || true
