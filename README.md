# Synerxus

Impact data infrastructure that captures ground-truth outcomes confirmed by NGOs on the receiving end—not corporate claims about them.

---

## Database Migration Guide

Instructions for migrating data from the previous deployment to this version.

### Prerequisites

- Access to the old Replit project with production data
- The `DATABASE_URL` from the old project

---

### Option 1: Point to Existing Database (Recommended)

Reuse the existing production database—no data copying needed.

1. Go to your **old Replit project** (with production data)
2. Open **Secrets/Environment Variables** (lock icon in sidebar)
3. Copy the `DATABASE_URL` value
4. Go to **this Replit project**
5. Open **Secrets/Environment Variables**
6. Replace the existing `DATABASE_URL` with the copied value
7. Restart the application

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
