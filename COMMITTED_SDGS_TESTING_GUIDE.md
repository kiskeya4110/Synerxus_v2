# Testing Guide: Committed SDGs Feature

## Quick Start Testing

### Option 1: Manual Testing via Database

**Step 1**: Create a CSR Partner with committed SDGs
```sql
-- Connect to your PostgreSQL database
-- Insert a test CSR partner with primary SDGs

INSERT INTO csr_partners (
  user_id,
  company_name,
  employee_count,
  primary_sdgs,
  created_at
) VALUES (
  1,  -- Replace with actual user ID
  'Test Corporation',
  100,
  ARRAY[3, 4, 8, 10],  -- Health, Education, Economic Growth, Reduced Inequalities
  NOW()
) RETURNING id;
```

**Step 2**: Create employee engagement data
```sql
-- Insert some volunteer activities for SDGs in commitment
INSERT INTO volunteer_activities (user_id, project_id, hours, created_at)
VALUES
  (2, 1, 10, NOW()),  -- Employee working on project with SDG 4
  (3, 2, 15, NOW());  -- Employee working on project with SDG 8

-- Insert activities for SDGs NOT in commitment (for AI insights)
INSERT INTO volunteer_activities (user_id, project_id, hours, created_at)
VALUES
  (4, 3, 8, NOW()),   -- Employee working on project with SDG 13 (not committed)
  (5, 4, 12, NOW());  -- Employee working on project with SDG 17 (not committed)
```

**Step 3**: Test the dashboard
1. Open: `http://localhost:5000/csr-dashboard?userId=1`
2. Verify filter section shows only SDG 3, 4, 8, 10
3. Verify AI Insights section shows SDG 13 and 17

---

### Option 2: API Testing with cURL

**Test 1**: Fetch dashboard data and verify `primarySdgs` is returned
```bash
curl "http://localhost:5000/api/csr/dashboard?userId=1" | jq '.primarySdgs'
# Expected: [3, 4, 8, 10]
```

**Test 2**: Verify company name is returned
```bash
curl "http://localhost:5000/api/csr/dashboard?userId=1" | jq '.companyName'
# Expected: "Test Corporation"
```

**Test 3**: Check SDG metrics
```bash
curl "http://localhost:5000/api/csr/dashboard?userId=1" | jq '.sdgMetrics[] | {sdg, totalHours, uniqueEmployees}'
# Expected: Array of SDG metrics with hours and employee counts
```

---

### Option 3: Browser Developer Tools Testing

**Step 1**: Open the CSR Dashboard
```
http://localhost:5000/csr-dashboard
```

**Step 2**: Open Developer Tools (F12)

**Step 3**: Check Network Tab
- Find the request to `/api/csr/dashboard`
- Check the response payload
- Verify `primarySdgs` array is present
- Verify `companyName` is present

**Step 4**: Check Console
- Type: `document.querySelector('[data-sdg-filter]')` (if you add this attribute)
- Verify filter chips are rendered correctly

---

## Expected Behaviors

### Scenario 1: Organization with Committed SDGs [3, 4, 8, 10]

**Filter Section**:
- ✅ Shows 4 SDG chips: 3, 4, 8, 10
- ✅ Header: "Your Organization's Committed SDGs"
- ✅ Toggle button visible: "Show All 17 SDGs"

**AI Insights** (if employees work on SDG 13, 17):
- ✅ Yellow box appears below filters
- ✅ Shows: "Your employees are actively working on 2 SDGs..."
- ✅ Lists: SDG 13 and SDG 17 with employee counts and hours
- ✅ Chips are clickable to filter dashboard

**Toggle to "Show All 17 SDGs"**:
- ✅ All 17 SDG chips appear
- ✅ Header changes to "Filter by SDG Goals"
- ✅ AI Insights box disappears
- ✅ Button text changes to "Show Committed Only"

### Scenario 2: Organization with NO Committed SDGs ([])

**Filter Section**:
- ✅ Shows all 17 SDG chips (fallback behavior)
- ✅ Header: "Filter by SDG Goals"
- ✅ No toggle button

**AI Insights**:
- ✅ No AI Insights box (fallback mode)

### Scenario 3: Employees Only Work on Committed SDGs

**Filter Section**:
- ✅ Shows only committed SDG chips
- ✅ Header: "Your Organization's Committed SDGs"
- ✅ Toggle button visible

**AI Insights**:
- ✅ No AI Insights box (no suggestions needed)

---

## Automated Testing Script

Create a test file: `test-committed-sdgs.ts`

```typescript
import { db } from "./server/db";
import { csrPartners, volunteerActivities, projects } from "./shared/schema";

async function testCommittedSDGs() {
  console.log("🧪 Testing Committed SDGs Feature...\n");

  // Test 1: Fetch CSR partner with primarySdgs
  console.log("Test 1: Fetching CSR partner...");
  const partner = await db.select().from(csrPartners).limit(1);

  if (partner.length > 0) {
    console.log("✅ CSR Partner found:", partner[0].companyName);
    console.log("   Primary SDGs:", partner[0].primarySdgs || "None set");
  } else {
    console.log("❌ No CSR partners found. Please create test data.");
    return;
  }

  // Test 2: Verify API response includes primarySdgs
  console.log("\nTest 2: Testing API endpoint...");
  const userId = partner[0].userId;

  try {
    const response = await fetch(`http://localhost:5000/api/csr/dashboard?userId=${userId}`);
    const data = await response.json();

    if (data.primarySdgs) {
      console.log("✅ API returns primarySdgs:", data.primarySdgs);
    } else {
      console.log("❌ API does not return primarySdgs");
    }

    if (data.companyName) {
      console.log("✅ API returns companyName:", data.companyName);
    } else {
      console.log("❌ API does not return companyName");
    }
  } catch (error) {
    console.log("❌ API request failed:", error);
  }

  // Test 3: Check SDG metrics
  console.log("\nTest 3: Checking SDG metrics...");
  const activities = await db
    .select()
    .from(volunteerActivities)
    .limit(10);

  console.log(`✅ Found ${activities.length} volunteer activities`);

  console.log("\n✨ Testing complete!");
}

testCommittedSDGs().catch(console.error);
```

Run with:
```bash
tsx test-committed-sdgs.ts
```

---

## Visual Verification Checklist

### Filter Section
- [ ] Only committed SDG chips visible by default
- [ ] SDG chips use correct SDG colors
- [ ] Toggle button appears and functions
- [ ] Header text changes based on view mode

### AI Insights Box
- [ ] Yellow/gold gradient background
- [ ] Lightbulb emoji (💡) visible
- [ ] Employee counts shown per suggested SDG
- [ ] Hours shown per suggested SDG
- [ ] Chips are clickable
- [ ] Box disappears when toggling to "Show All"

### Filtering Behavior
- [ ] Clicking SDG chip filters all dashboard data
- [ ] KPI cards update with filtered values
- [ ] Map markers filter correctly
- [ ] SDG chart filters correctly
- [ ] "Filtered from X total" text appears

### Toggle Functionality
- [ ] Button changes text when clicked
- [ ] Button changes color when active
- [ ] Filter chips update to show all 17 or committed only
- [ ] State persists during session

---

## Debugging Tips

### Issue: primarySdgs is null or undefined

**Check**:
1. Database: `SELECT primary_sdgs FROM csr_partners WHERE id = 1;`
2. Backend: Add console.log in routes.ts line 6204
   ```typescript
   console.log("Partner SDGs:", userPartner.primarySdgs);
   ```
3. Frontend: Add console.log in csr-dashboard.tsx line 469
   ```typescript
   console.log("Committed SDGs from API:", csrData?.primarySdgs);
   ```

### Issue: AI Insights not appearing

**Check**:
1. Are employees working on non-committed SDGs?
   ```typescript
   console.log("Employee Used SDGs:", employeeUsedSDGs);
   console.log("Suggested SDGs:", suggestedSDGs);
   ```
2. Is `showAllSDGs` toggle OFF?
3. Does `suggestedSDGs.length > 0`?

### Issue: Filter chips not displaying correctly

**Check**:
1. `displayedSDGsForFilters` value:
   ```typescript
   console.log("Displayed SDG Filters:", displayedSDGsForFilters);
   ```
2. Browser console for React errors
3. CSS styling conflicts

---

## Sample Test Data SQL

```sql
-- Complete test data setup
BEGIN;

-- Create CSR Partner
INSERT INTO csr_partners (user_id, company_name, employee_count, primary_sdgs, created_at)
VALUES (1, 'Acme Corporation', 150, ARRAY[3, 4, 8, 10], NOW())
RETURNING id; -- Note the ID (e.g., 100)

-- Create volunteer profiles (employees)
INSERT INTO volunteer_profiles (user_id, employer_id, volunteer_name, created_at)
VALUES
  (10, 100, 'Alice Johnson', NOW()),
  (11, 100, 'Bob Smith', NOW()),
  (12, 100, 'Carol Davis', NOW());

-- Create projects with different SDGs
INSERT INTO projects (name, primary_sdg, status, location, created_at)
VALUES
  ('Health Clinic', 3, 'active', 'Kenya', NOW()),      -- Committed
  ('Digital Literacy', 4, 'active', 'India', NOW()),   -- Committed
  ('Micro Finance', 8, 'active', 'Peru', NOW()),       -- Committed
  ('Climate Action', 13, 'active', 'Brazil', NOW()),   -- NOT committed (AI insight)
  ('Clean Energy', 7, 'active', 'Ghana', NOW())        -- NOT committed (AI insight)
RETURNING id; -- Note the IDs (e.g., 200, 201, 202, 203, 204)

-- Create volunteer activities
INSERT INTO volunteer_activities (user_id, project_id, hours, created_at)
VALUES
  -- Activities on committed SDGs
  (10, 200, 15, NOW()),  -- Alice on SDG 3 (Health)
  (11, 201, 20, NOW()),  -- Bob on SDG 4 (Education)
  (12, 202, 10, NOW()),  -- Carol on SDG 8 (Economic)

  -- Activities on NON-committed SDGs (will show in AI insights)
  (10, 203, 12, NOW()),  -- Alice on SDG 13 (Climate)
  (11, 204, 8, NOW()),   -- Bob on SDG 7 (Energy)
  (12, 203, 6, NOW());   -- Carol on SDG 13 (Climate)

-- Create employee engagement records
INSERT INTO employee_engagement (partner_id, employee_email, hours_volunteered, project_id, created_at)
VALUES
  (100, 'alice@acme.com', 27, 200, NOW()),  -- Total from both activities
  (100, 'bob@acme.com', 28, 201, NOW()),
  (100, 'carol@acme.com', 16, 202, NOW());

COMMIT;
```

After running this SQL:
- Visit: `http://localhost:5000/csr-dashboard?userId=1`
- Expect to see:
  - Filter: SDG 3, 4, 8, 10 (committed)
  - AI Insights: SDG 7 (1 employee, 8h), SDG 13 (2 employees, 18h)

---

## Production Verification

Once deployed to production:

1. **Monitor API Logs**
   ```bash
   # Check for primarySdgs in responses
   grep "primarySdgs" /var/log/api.log
   ```

2. **Check Analytics**
   - Track % of users using "Show All SDGs" toggle
   - Track click-through rate on AI Insights SDG chips
   - Monitor if organizations add suggested SDGs to their commitments

3. **User Feedback**
   - Survey CSR admins on feature usefulness
   - A/B test AI Insights box visibility
   - Track engagement metrics before/after feature launch

---

## Rollback Instructions

If issues are discovered in production:

1. **Quick Fix**: Comment out primarySdgs in API response
   ```typescript
   // Line 6324 in server/routes.ts
   // primarySdgs: userPartner.primarySdgs || [],
   ```

2. **Frontend Fallback**: The frontend automatically handles missing `primarySdgs`
   - Will show all 17 SDGs
   - No errors or crashes

3. **No Data Migration Needed**: Feature is purely additive

---

## Success Metrics

After 2 weeks in production, measure:

- [ ] % of CSR partners with `primarySdgs` populated
- [ ] Average number of committed SDGs per organization (target: 3-5)
- [ ] % of organizations with AI-suggested SDGs
- [ ] % of organizations that add suggested SDGs to commitment
- [ ] User satisfaction score for CSR admins (target: 4+/5)

---

**Feature Status**: ✅ Ready for Testing
**Implementation Date**: 2025-12-05
**Developer**: Claude Code
**Documentation**: See COMMITTED_SDGS_FEATURE.md
