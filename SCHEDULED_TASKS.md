# Synerxus Database Optimization - Scheduled Tasks

**Generated:** December 12, 2024
**Start Date:** Week of December 16, 2024

---

## Week 1: December 16-20, 2024 (High Priority)

### Monday, December 16

- [ ] **Run critical indexes migration**
  ```bash
  psql $DATABASE_URL -f migrations/0004_critical_missing_indexes.sql
  ```
  - Adds 80+ missing indexes
  - Expected duration: 5-10 minutes
  - Monitor with: `SELECT * FROM pg_stat_progress_create_index;`

- [ ] **Verify index creation**
  ```sql
  SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
  -- Expected: 170+ indexes total
  ```

### Tuesday, December 17

- [ ] **Update dashboard.router.ts to use batch queries**
  - Replace lines 128-134 with `storage.getOrganizationDashboardData()`
  - Test organization dashboard performance
  - Expected improvement: 50-70% faster

- [ ] **Update dashboard-service.ts**
  - Use `storage.getVolunteerDashboardData()` for volunteer dashboards
  - Test volunteer dashboard performance

### Wednesday, December 18

- [ ] **Parallelize AIU calculations**
  - Update dashboard.router.ts lines 216-239
  - Change sequential loop to Promise.all pattern:
    ```typescript
    const aiuPromises = organizationProjects.map(p => calculateProjectAIU(p.id));
    const aiuResults = await Promise.all(aiuPromises);
    ```

- [ ] **Add Redis cache keys for dashboards**
  - Implement cache keys from DATABASE_ANALYSIS_REPORT.md section 2.3
  - Set TTL: 30s for dashboards, 5min for user lookups

### Thursday, December 19

- [ ] **Performance testing**
  - Run load tests on dashboard endpoints
  - Measure p95 latency (target: <200ms)
  - Document baseline vs. optimized metrics

- [ ] **Monitor database metrics**
  ```sql
  -- Check index usage
  SELECT indexrelname, idx_scan, idx_tup_read
  FROM pg_stat_user_indexes
  ORDER BY idx_scan DESC LIMIT 20;
  ```

### Friday, December 20

- [ ] **Week 1 review**
  - Document performance improvements
  - Identify any issues from Week 1 changes
  - Prepare Week 2 tasks

---

## Week 2: December 23-27, 2024 (Medium Priority)

### Monday, December 23

- [ ] **Add connection retry logic**
  - Create `server/db-utils.ts` with retry wrapper
  - Implement exponential backoff for transient failures
  - Add to critical storage methods

### Tuesday, December 24

- [ ] **Update opportunity enrichment service**
  - Use `storage.getOpportunitiesWithOrganizations()`
  - Eliminate N+1 in opportunity listings
  - Test opportunity discovery performance

### Thursday, December 26

- [ ] **Implement notification/message count caching**
  - Use `storage.getUnreadNotificationCount()`
  - Use `storage.getUnreadMessageCount()`
  - Cache results in Redis with 60s TTL

### Friday, December 27

- [ ] **Week 2 review**
  - Run full performance audit
  - Compare against Week 0 baseline
  - Document remaining optimizations

---

## Week 3: December 30 - January 3, 2025 (Lower Priority)

### Monday, December 30

- [ ] **Create materialized view for activity summary**
  ```sql
  CREATE MATERIALIZED VIEW mv_organization_activity_summary AS
  SELECT
      p.organization_id,
      p.id AS project_id,
      COUNT(DISTINCT va.user_id) AS unique_volunteers,
      SUM(va.hours) AS total_hours
  FROM projects p
  LEFT JOIN volunteer_activities va ON va.project_id = p.id
  GROUP BY p.organization_id, p.id;
  ```

- [ ] **Set up materialized view refresh schedule**
  - Add cron job or scheduled task
  - Refresh every 5 minutes

### Tuesday, December 31

- [ ] **Add denormalized cache columns to projects table**
  - `cached_volunteer_count`
  - `cached_total_hours`
  - `cached_aiu`
  - Create update trigger

### Thursday, January 2

- [ ] **Evaluate volunteer table consolidation**
  - Analyze usage of `volunteers` vs `volunteerProfiles`
  - Plan data migration if consolidation approved
  - Create migration script (do not run yet)

### Friday, January 3

- [ ] **Final optimization review**
  - Full performance benchmark
  - Update DATABASE_ANALYSIS_REPORT.md with results
  - Plan Q1 2025 database improvements

---

## Monitoring Commands

### Daily Health Check
```sql
-- Connection stats
SELECT state, COUNT(*) FROM pg_stat_activity
WHERE datname = current_database() GROUP BY state;

-- Slow queries (if pg_stat_statements enabled)
SELECT query, calls, total_time/calls AS avg_ms
FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Table bloat
SELECT relname, n_dead_tup FROM pg_stat_user_tables
WHERE n_dead_tup > 1000 ORDER BY n_dead_tup DESC;
```

### Weekly Maintenance
```sql
-- Update statistics
ANALYZE;

-- Check for missing indexes (unused FKs)
SELECT conrelid::regclass, conname, confrelid::regclass
FROM pg_constraint WHERE contype = 'f'
AND NOT EXISTS (
  SELECT 1 FROM pg_index WHERE indrelid = conrelid
  AND conkey[1] = ANY(indkey)
);
```

---

## Success Metrics

| Metric | Baseline | Target | Measured |
|--------|----------|--------|----------|
| Dashboard p95 latency | ~800ms | <200ms | _TBD_ |
| Index count | 93 | 170+ | _TBD_ |
| N+1 query patterns | 3 | 0 | _TBD_ |
| Cache hit rate | 0% | >80% | _TBD_ |
| Connection pool utilization | Unknown | <70% | _TBD_ |

---

## Rollback Procedures

### If indexes cause issues:
```sql
-- Drop all new indexes (emergency only)
DO $$
DECLARE idx TEXT;
BEGIN
  FOR idx IN SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
    AND indexname NOT IN (SELECT indexname FROM pg_indexes WHERE ... -- original indexes)
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || idx;
  END LOOP;
END $$;
```

### If batch queries cause issues:
- Revert storage.ts changes
- Restore original dashboard queries
- Monitor for 24 hours before re-attempting

---

## Notes

- All times are estimates; adjust based on actual progress
- Holiday schedule (Dec 25, Jan 1) accounted for
- Coordinate with team before running production migrations
- Keep DATABASE_ANALYSIS_REPORT.md updated with results
