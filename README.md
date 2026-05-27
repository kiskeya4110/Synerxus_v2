# Synerxus

Impact data infrastructure that captures ground-truth outcomes confirmed by NGOs on the receiving end—not corporate claims about them.

---

## Running a Downloaded Copy Locally

Login works in Replit because Replit injects Secrets and a managed database into the running app. Those values are not included when the project is downloaded.

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Fill `.env` with the same values used in Replit Secrets:

- `DATABASE_URL`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- all `VITE_FIREBASE_*` values
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` for production-grade token verification

4. In Firebase Console, open **Authentication -> Settings -> Authorized domains** and add:

- `localhost`
- `127.0.0.1`
- your downloaded app's deployed domain, if you are running it somewhere other than your machine

5. Verify the local auth setup:

```bash
npm run check:local-auth
```

6. Start the app:

```bash
npm run dev
```

Open `http://localhost:5000`. If login still fails, check the browser console and the server logs for Firebase domain/config errors or database connection errors.

---

## Database Migration Guide

Instructions for migrating data from the previous deployment to this version.

### Prerequisites

- Access to the old Replit project with production data
- The `DATABASE_URL` from the old project

---

### Option 1: Point to Existing Database (Recommended)

Reuse the existing production database—no data copying needed.

#### Steps

1. Go to your **old Replit project** (with production data)
2. Open **Secrets/Environment Variables** (lock icon in sidebar)
3. Copy the `DATABASE_URL` value
4. Go to **this Replit project**
5. Open **Secrets/Environment Variables**
6. Replace the existing `DATABASE_URL` with the copied value
7. Restart the application

#### Schema Verification (Before Connecting)

Ensure this version's schema is compatible with the old database:

```bash
# Check what schema changes Drizzle expects
npx drizzle-kit generate --name check-diff
```

If there are new tables/columns in this version that don't exist in the old DB, apply migrations:

```bash
# Apply pending migrations to the old database
npx drizzle-kit migrate
```

#### Schema Compatibility Notes

Both versions use the same stack:
- **ORM:** Drizzle
- **Database:** PostgreSQL (Neon)
- **Schema location:** `shared/schema.ts`

If migrations fail, check for conflicting column types or missing tables in the old database.

---

### Option 2: Copy Data to New Database

Use this if you want independent databases (e.g., keeping old version as fallback).

```bash
# In this project's Shell tab, run:
pg_dump "YOUR_OLD_DATABASE_URL" | psql "$DATABASE_URL"
```

Replace `YOUR_OLD_DATABASE_URL` with the connection string from your old project.

#### Verify the Migration

```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM organizations;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM projects;"
```

---

### Option 3: Use Built-in Backup System

```bash
# On the old Replit project - export all data
BACKUP_FORMAT=json npm run backup
```

Transfer the backup file to this project and restore manually.

---

### Post-Migration Checklist

- [ ] Verify user login works
- [ ] Check organizations load correctly
- [ ] Confirm projects and opportunities display
- [ ] Test volunteer activity logging
- [ ] Verify impact metrics and AIU calculations
- [ ] Check uploaded images are accessible

---

### Rollback

**Option 1:** Restore the original `DATABASE_URL` in secrets

**Option 2:** The old database remains untouched—drop and recreate tables in new database, then retry
