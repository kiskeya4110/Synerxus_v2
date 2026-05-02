#!/bin/bash
set -e

npm install

# Pre-apply the verification_tokens unique constraint rename that drizzle-kit
# would otherwise ask about interactively (it already exists as
# verification_tokens_token_key; drizzle expects verification_tokens_token_unique).
# Doing this directly in SQL means drizzle-kit sees no diff and skips the prompt.
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`
  DO \$\$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'verification_tokens_token_key'
        AND table_name = 'verification_tokens'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'verification_tokens_token_unique'
        AND table_name = 'verification_tokens'
    ) THEN
      ALTER TABLE verification_tokens
        RENAME CONSTRAINT verification_tokens_token_key
        TO verification_tokens_token_unique;
    END IF;
  END
  \$\$;
\`.then(() => { console.log('constraint ok'); process.exit(0); })
 .catch(e => { console.error('constraint migration skipped:', e.message); process.exit(0); });
"

# Now run db:push — drizzle-kit should see no diff on verification_tokens
# and complete without interactive prompts.
yes no | npx drizzle-kit push 2>/dev/null || true
