# Synerxus Platform - Stress Test Report with 2000 Profiles

**Date:** December 20, 2025
**Test Tool:** autocannon (Node.js)
**Data Set:** 2000 volunteers, 40 organizations, 120 projects, 600 tasks
**Server Mode:** Production (NODE_ENV=production, RATE_LIMIT_MAX=100000)

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Profiles Loaded | 2,000 volunteers + 40 organizations | Loaded |
| Max Stable Concurrent Users | ~100 | LIMITED |
| System Collapse Point | ~500 concurrent | CRITICAL |
| Bottleneck | Database queries on large datasets | IDENTIFIED |

### Key Finding
**With 2000 profiles in the database, the system performance degrades significantly.** Endpoints that return all records (users, volunteers) become extremely slow, causing cascading timeouts.

---

## Test Data Summary

| Entity | Count |
|--------|-------|
| Organizations | 40 |
| Organization Admins | 40 |
| Volunteer Users | 2,000 |
| Volunteer Profiles | 2,000 |
| Projects | 120 |
| Tasks | 600 |
| Project Assignments | 2,000 |
| Volunteer Activities | 2,000 |
| Project Impacts | 360 |

---

## Performance Results by Concurrency Level

### 100 Concurrent Users

| Endpoint | Throughput | P50 Latency | Success Rate | Status |
|----------|------------|-------------|--------------|--------|
| `/api/health` | 1,791 req/s | 43ms | 100% | GOLD |
| `/api/impact-metrics` | 278 req/s | 342ms | 100% | SILVER |
| `/api/organizations` | 136 req/s | 445ms | 100% | SILVER |
| `/api/projects` | 1,449 req/s | 53ms | 0% (auth) | - |
| `/api/tasks` | 26 req/s | 3,386ms | 100% | CRITICAL |
| `/api/users` | 12 req/s | 5,887ms | 99% | FAILURE |
| `/api/volunteers` | 8 req/s | 5,162ms | 85% | FAILURE |

### 500 Concurrent Users

| Endpoint | Throughput | P50 Latency | Timeouts | Status |
|----------|------------|-------------|----------|--------|
| `/api/health` | 1,947 req/s | 247ms | 0 | GOLD |
| `/api/organizations` | 111 req/s | 2,212ms | 392 | CRITICAL |
| `/api/users` | 48 req/s | 6,507ms | 35 | FAILURE |
| `/api/volunteers` | 48 req/s | 6,432ms | 48 | FAILURE |
| `/api/tasks` | 0 req/s | - | 1000 | COLLAPSE |

### 1000 Concurrent Users

| Endpoint | Throughput | P50 Latency | Timeouts | Status |
|----------|------------|-------------|----------|--------|
| `/api/health` | 1,353 req/s | 55ms | 1,458 | DEGRADED |
| `/api/organizations` | 122 req/s | 4,379ms | 686 | FAILURE |
| `/api/users` | 98 req/s | 6,807ms | 37 | FAILURE |

### 2000 Concurrent Users (Extreme)

| Endpoint | Throughput | P50 Latency | Status |
|----------|------------|-------------|--------|
| `/api/health` | 1,952 req/s | 1,003ms | DEGRADED |

---

## Performance Tiers

| Tier | P50 Latency | Throughput | Error Rate |
|------|-------------|------------|------------|
| GOLD | <100ms | >1000 req/s | 0% |
| SILVER | <500ms | >100 req/s | <1% |
| BRONZE | <1000ms | >50 req/s | <5% |
| CRITICAL | <3000ms | >10 req/s | <20% |
| FAILURE | >3000ms | <10 req/s | >20% |
| COLLAPSE | Timeout | 0 req/s | 100% |

---

## Critical Bottleneck Analysis

### 1. Large Dataset Queries (CRITICAL)
- **Problem:** Endpoints returning 2000+ records are extremely slow
- **Affected:** `/api/users`, `/api/volunteers`
- **Impact:** 5-6 second latency even at 100 users
- **Solution Required:**
  - Implement pagination (limit/offset)
  - Add database indexes
  - Use cursor-based pagination for large lists

### 2. Full Table Scans (HIGH)
- **Problem:** Every request fetches all records from database
- **Evidence:** Response size ~7MB for users endpoint
- **Solution Required:**
  - Default pagination (50-100 records per page)
  - Lazy loading on frontend
  - GraphQL or field selection

### 3. No Result Caching for Large Responses (MEDIUM)
- **Problem:** Cache not effective when each response is 7MB
- **Impact:** Memory pressure, slow serialization
- **Solution Required:**
  - Cache individual records, not full lists
  - Implement query-level caching

### 4. Database Connection Exhaustion (MEDIUM)
- **Problem:** Long-running queries block connection pool
- **Evidence:** Timeouts increase with concurrency
- **Solution Required:**
  - Query timeouts
  - Connection pool monitoring
  - Query optimization

---

## Endpoint-Specific Recommendations

### `/api/users` and `/api/volunteers`
```typescript
// Current: Returns ALL 2000 records
app.get("/api/users", async (req, res) => {
  const users = await storage.listUsers(); // Returns 2000 records!
  res.json(users);
});

// Recommended: Paginated response
app.get("/api/users", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = (page - 1) * limit;

  const [users, total] = await Promise.all([
    storage.listUsersPaginated(limit, offset),
    storage.countUsers()
  ]);

  res.json({
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});
```

### `/api/tasks`
- Add project-based filtering by default
- Implement user-specific task views
- Add status filtering (active, completed)

---

## Recommended Architecture Changes

### Immediate (Required for Production)

1. **Pagination on All List Endpoints**
   - Default limit: 50 records
   - Max limit: 100 records
   - Include total count in response

2. **Database Indexes**
   ```sql
   CREATE INDEX idx_users_type ON users(user_type);
   CREATE INDEX idx_volunteers_user_id ON volunteer_profiles(user_id);
   CREATE INDEX idx_tasks_project_id ON tasks(project_id);
   CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
   CREATE INDEX idx_activities_user_id ON volunteer_activities(user_id);
   ```

3. **Query Timeouts**
   - Set 5 second max query timeout
   - Return partial results with warning

### Short-term (1-2 weeks)

4. **Redis Caching**
   - Cache paginated results
   - Cache aggregated counts
   - TTL: 30-60 seconds

5. **Response Compression**
   - Enable gzip for responses >1KB
   - Expected 70-80% size reduction

### Medium-term (1 month)

6. **Database Read Replicas**
   - Route read queries to replica
   - Keep writes on primary

7. **Elasticsearch for Search**
   - Full-text search on users/volunteers
   - Faceted filtering
   - Sub-10ms search latency

---

## Capacity Planning

### Current State (2000 profiles)

| Load | Max Latency | Recommendation |
|------|-------------|----------------|
| 50 users | 3 seconds | Acceptable for internal use |
| 100 users | 6 seconds | Too slow for production |
| 500 users | Timeouts | System collapse |

### After Pagination Implementation

| Load | Expected Latency | Status |
|------|------------------|--------|
| 100 users | <500ms | Acceptable |
| 500 users | <1 second | Acceptable |
| 1000 users | <2 seconds | Marginal |

### After Full Optimization (Redis + Indexes + Pagination)

| Load | Expected Latency | Status |
|------|------------------|--------|
| 500 users | <200ms | GOLD |
| 1000 users | <500ms | SILVER |
| 2000 users | <1 second | BRONZE |

---

## Test Commands Reference

```bash
# Generate test data
npx tsx dummy/seed-bulk.ts --count 2000

# Run stress tests
npx autocannon -c 100 -d 15 http://localhost:5000/api/health
npx autocannon -c 500 -d 20 http://localhost:5000/api/users
npx autocannon -c 1000 -d 20 http://localhost:5000/api/health

# Check current data count
curl http://localhost:5000/api/users | jq 'length'
```

---

## Conclusion

### Critical Issues Identified

1. **System cannot handle 2000 profiles at any significant load**
   - Users/volunteers endpoints take 5-6 seconds
   - Timeouts occur at 500+ concurrent users

2. **Pagination is mandatory for production**
   - Current design returns full datasets
   - Unacceptable for any dataset >100 records

3. **Database optimization required**
   - Missing indexes on foreign keys
   - No query optimization for large tables

### Recommended Priority

| Priority | Action | Impact |
|----------|--------|--------|
| P0 | Implement pagination | Enables production use |
| P1 | Add database indexes | 3-5x query improvement |
| P2 | Add Redis caching | 10x improvement on repeated queries |
| P3 | Query optimization | Reduce database load |

### Bottom Line

**The system is NOT production-ready with 2000+ profiles.** Pagination must be implemented on all list endpoints before scaling beyond 100 users.

---

*Report generated from automated stress testing*
*Total test duration: ~15 minutes*
*Requests executed: ~100,000+*
