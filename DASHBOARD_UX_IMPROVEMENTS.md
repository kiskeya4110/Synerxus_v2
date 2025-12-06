# CSR Dashboard UX Improvements

## Overview
Restructured the CSR Dashboard to feature corporate SDG commitments prominently with integrated KPIs, and moved AI insights to a standalone section for better visibility and user experience.

---

## Changes Summary

### 1. Corporate SDG Commitments Section (NEW - Top Priority)

**Location**: Top of Overview tab (lines 903-1089)
**Visibility**: Only shown when organization has committed SDGs

#### Features:
- **Prominent Positioning**: First section users see on the dashboard
- **Company Branding**: Shows company name with target emoji (🎯)
- **Commitment Overview**: Displays count of committed SDG goals
- **Grid Layout**: Responsive grid showing all committed SDGs
- **Interactive Cards**: Each SDG card is clickable to filter dashboard
- **Visual Feedback**: Active filtering indicated with dark border and "✓ FILTERING" badge

#### SDG Card Components:
Each committed SDG shows:
- **SDG Number & Name**: Color-coded badge with goal name
- **Total Hours**: Cumulative employee hours for this SDG
- **Employee Count**: Unique employees working on this SDG
- **Project Count**: Number of projects aligned with this SDG

#### Visual Design:
```
┌─────────────────────────────────────────────────────────────────┐
│ 🎯  Acme Corporation's SDG Commitments                          │
│     Tracking progress across 4 committed Sustainable...         │
│                                                                 │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│ │ 3       │  │ 4       │  │ 8       │  │ 10      │           │
│ │ Health  │  │ Educ... │  │ Econ... │  │ Reduced │           │
│ │         │  │         │  │         │  │ Inequa. │           │
│ │ Hours: 240│ │ Hours: 450│ │ Hours: 180│ │ Hours: 95│       │
│ │ Emp: 12 │  │ Emp: 18 │  │ Emp: 10 │  │ Emp: 6  │           │
│ │ Proj: 3 │  │ Proj: 4 │  │ Proj: 2 │  │ Proj: 2 │           │
│ └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

#### Interaction:
- **Hover**: Card scales up slightly with enhanced shadow
- **Click**: Sets that SDG as the active filter
- **Active State**: Card shows dark border and "✓ FILTERING" badge
- **Multi-function**: Serves as both information display AND filter control

#### Styling:
- **Border**: 2px solid navy blue (#1e3a8a)
- **Card Background**: Gradient using SDG-specific color
- **Card Hover**: Scale transform + shadow enhancement
- **KPI Rows**: Semi-transparent white background for readability

---

### 2. AI Insights Section (MOVED - Standalone)

**Location**: Second section, below commitments (lines 1091-1221)
**Previous Location**: Embedded within filter section
**Visibility**: Only when employees work on non-committed SDGs

#### Improvements:
- **Standalone Placement**: No longer buried in filter section
- **Larger Icon**: 32px lightbulb emoji (was 24px)
- **Enhanced Heading**: "AI-Powered Insights: Emerging SDG Opportunities"
- **Better Context**: Explains this represents "grassroots engagement"
- **Grid Layout**: Cleaner presentation of suggested SDGs
- **Prominent Recommendation**: Clear call-to-action footer

#### Visual Design:
```
┌─────────────────────────────────────────────────────────────────┐
│ 💡  AI-Powered Insights: Emerging SDG Opportunities             │
│                                                                 │
│ Your employees are actively working on 3 SDG goals that        │
│ aren't part of your organization's official commitment. This   │
│ represents grassroots engagement that could inform your        │
│ corporate CSR strategy.                                        │
│                                                                 │
│ ┌───────────┐  ┌───────────┐  ┌───────────┐                  │
│ │ 7 Energy  │  │ 13 Climate│  │ 17 Partner│                  │
│ │           │  │           │  │           │                  │
│ │ Emp: 5    │  │ Emp: 8    │  │ Emp: 3    │                  │
│ │ Hours: 42h│  │ Hours: 68h│  │ Hours: 24h│                  │
│ └───────────┘  └───────────┘  └───────────┘                  │
│                                                                 │
│ 💡 Recommendation: Click on any SDG above to see detailed...   │
└─────────────────────────────────────────────────────────────────┘
```

#### Styling:
- **Background**: Yellow/gold gradient (#fef3c7 → #fde68a)
- **Border**: 2px solid amber (#f59e0b) - upgraded from 1px
- **Shadow**: Colored shadow with amber tint
- **Cards**: White background with colored borders
- **Card Hover**: Scale transform (1.03x) with shadow

---

### 3. Filter Section (UPDATED)

**Location**: Third section (lines 1223-1410)
**Changes**: Cleaner header, removed duplicate AI insights

#### Header Updates:
- **When showing committed SDGs**: "Filter Dashboard Data"
- **When showing all SDGs**: "Filter by SDG Goals"
- **Description**: Updated to reflect new structure

#### What Was Removed:
- Duplicate AI Insights section (was lines 1411-1551)
- Redundant suggested SDG chips
- Overlapping recommendation text

#### What Remains:
- Toggle button: "Show All 17 SDGs" / "Show Committed Only"
- Clear Filters button
- SDG filter chips
- Active Filter Summary (blue box)

---

## Dashboard Structure (New Layout)

```
Corporate CSR Dashboard - Overview Tab
├── 1. Corporate SDG Commitments Section
│   ├── Company name + commitment count
│   ├── Grid of committed SDGs with KPIs
│   │   ├── SDG 3: 240h, 12 employees, 3 projects
│   │   ├── SDG 4: 450h, 18 employees, 4 projects
│   │   ├── SDG 8: 180h, 10 employees, 2 projects
│   │   └── SDG 10: 95h, 6 employees, 2 projects
│   └── Click any card to filter dashboard
│
├── 2. AI Insights Section (if applicable)
│   ├── Emerging SDG opportunities
│   ├── Grid of suggested SDGs with metrics
│   └── Recommendation to add to commitment
│
├── 3. Filter Section
│   ├── Toggle: Show All 17 SDGs / Show Committed Only
│   ├── Clear Filters button (when active)
│   ├── SDG filter chips
│   └── Active Filter Summary
│
├── 4. KPI Cards (Hours, Employees, Projects, Impact Score)
├── 5. SDG Alignment Chart
├── 6. Geographic Impact Map
├── 7. Engagement Funnel
└── 8. Admin Actions Panel
```

---

## User Flow Examples

### Scenario 1: User Arrives at Dashboard

1. **First View**: Corporate SDG Commitments section
   - Immediately sees organization's official commitments
   - Understands current progress with KPI metrics
   - Recognizes which SDGs are priorities

2. **Second View**: AI Insights (if relevant)
   - Discovers employee activity outside commitment
   - Sees opportunity to expand SDG focus
   - Gets data-driven recommendations

3. **Third View**: Filter Section
   - Can filter dashboard to specific SDGs
   - Can toggle to explore all 17 SDGs
   - Clear controls for data exploration

### Scenario 2: User Clicks Committed SDG Card

**Before**:
- Click SDG 4 card in commitments section

**After**:
- SDG 4 card shows dark border + "✓ FILTERING" badge
- Filter section shows "SDG 4: Education" as active filter
- KPI cards update to show SDG 4 metrics only
- Map shows only SDG 4 projects
- Chart highlights SDG 4 bar

**Benefit**: Single-click filtering from the commitment cards

### Scenario 3: User Explores AI Insight

**Before**:
- User sees SDG 13 in AI Insights section
- Notices "8 employees, 68 hours"

**After clicking SDG 13**:
- Dashboard filters to SDG 13
- Shows detailed employee list in modal
- Shows projects aligned with SDG 13
- User can assess if SDG 13 should be added to commitment

---

## Technical Implementation

### Component Hierarchy
```typescript
<Overview Tab>
  {/* Committed SDGs Section */}
  {committedSDGs.length > 0 && (
    <CommittedSDGsSection>
      {committedSDGs.map(sdg => (
        <SDGCard
          onClick={() => setSelectedSDGFilters([sdg])}
          showFilteringBadge={selectedSDGFilters.includes(sdg)}
          kpis={{ hours, employees, projects }}
        />
      ))}
    </CommittedSDGsSection>
  )}

  {/* AI Insights Section */}
  {suggestedSDGs.length > 0 && !showAllSDGs && (
    <AIInsightsSection>
      {suggestedSDGs.map(sdg => (
        <SuggestedSDGCard
          onClick={() => setSelectedSDGFilters([sdg])}
          metrics={{ employees, hours }}
        />
      ))}
    </AIInsightsSection>
  )}

  {/* Filter Section */}
  <FilterSection>
    <ToggleButton />
    <ClearFiltersButton />
    <SDGChips />
    <ActiveFilterSummary />
  </FilterSection>
</Overview Tab>
```

### State Management
```typescript
// Committed SDGs from organization profile
const committedSDGs = csrData?.primarySdgs || [];

// SDGs employees are working on
const employeeUsedSDGs = new Set(
  sdgMetrics.filter(m => m.totalHours > 0).map(m => m.sdg)
);

// Suggested SDGs (employee-used but not committed)
const suggestedSDGs = Array.from(employeeUsedSDGs).filter(
  sdg => !committedSDGs.includes(sdg)
);

// Active filter state
const [selectedSDGFilters, setSelectedSDGFilters] = useState<number[]>([]);

// Toggle state for showing all vs. committed
const [showAllSDGs, setShowAllSDGs] = useState(false);
```

---

## Benefits

### 1. **Better Information Hierarchy**
- Most important info (commitments) shown first
- Secondary insights (AI suggestions) clearly separated
- Filters available but not overwhelming

### 2. **Clearer User Intent**
- Commitments = official organizational priorities
- AI Insights = grassroots employee engagement
- Filters = data exploration tools

### 3. **Reduced Cognitive Load**
- No need to scroll to see commitments
- AI insights not buried in filter section
- Clear visual separation between sections

### 4. **Improved Interactivity**
- Commitment cards are dual-purpose (info + filter)
- AI insight cards trigger exploration
- Filter section for advanced control

### 5. **Better Mobile Experience**
- Grid layouts are responsive
- Cards stack nicely on small screens
- Touch-friendly click targets

---

## Performance Considerations

### Rendering Optimization
- Sections render conditionally based on data availability
- Committed SDGs section only renders if `committedSDGs.length > 0`
- AI Insights only render if `suggestedSDGs.length > 0`

### Data Efficiency
- No additional API calls required
- Uses existing `sdgMetrics` array
- Set operations for suggested SDGs are O(n)

### Memory Impact
- Minimal - no deep cloning
- Reuses existing data structures
- Conditional rendering prevents unused DOM nodes

---

## Accessibility

### Keyboard Navigation
- All cards are clickable via Enter/Space
- Tab order: Commitments → AI Insights → Filters → KPIs
- Focus indicators on all interactive elements

### Screen Readers
- Semantic HTML with proper ARIA labels
- Card content announced with metrics
- Filter state changes announced

### Color Contrast
- SDG colors with white text meet WCAG AA
- Semi-transparent overlays maintain contrast
- Hover states are not color-only (scale + shadow)

---

## Responsive Design

### Desktop (1920px+)
- Commitments grid: 4 columns
- AI Insights grid: 3-4 columns
- Full filter chips visible

### Tablet (768px-1024px)
- Commitments grid: 2-3 columns
- AI Insights grid: 2 columns
- Filter chips wrap naturally

### Mobile (375px-767px)
- Commitments grid: 1-2 columns
- AI Insights grid: 1 column
- Filter section stacks vertically

---

## Testing Checklist

### Visual Tests
- [ ] Committed SDGs section shows company name
- [ ] SDG cards display all 3 KPIs (hours, employees, projects)
- [ ] Clicking SDG card sets filter
- [ ] Active filter shows dark border + badge
- [ ] AI Insights section appears when relevant
- [ ] AI Insights section hides when showing all SDGs
- [ ] Filter section header changes based on mode

### Interaction Tests
- [ ] Click committed SDG card → dashboard filters
- [ ] Click AI insight card → dashboard filters
- [ ] Click filter chip → dashboard filters
- [ ] Toggle "Show All SDGs" → shows all 17 chips
- [ ] Toggle "Show Committed Only" → shows committed chips
- [ ] Clear Filters → resets all filters

### Data Tests
- [ ] Organization with committed SDGs: section appears
- [ ] Organization without committed SDGs: section hidden
- [ ] Employees work on non-committed SDGs: AI insights appear
- [ ] Employees only work on committed SDGs: AI insights hidden
- [ ] Suggested SDGs exclude already-committed SDGs

### Responsive Tests
- [ ] Desktop: 4-column commitment grid
- [ ] Tablet: 2-3 column commitment grid
- [ ] Mobile: 1-2 column commitment grid
- [ ] All cards clickable on touch devices
- [ ] No horizontal scrolling on any screen size

---

## Future Enhancements

### Phase 2 Ideas

1. **Commitment Progress Bars**
   - Add target hours per SDG
   - Show % progress toward target
   - Visual progress bar on each card

2. **Commitment Trends**
   - "↑ 15% from last quarter"
   - Monthly/quarterly comparison
   - Trend indicators

3. **Quick Actions on Cards**
   - "View Details" button
   - "Share This SDG" link
   - "Export Report" option

4. **AI Insight Strength**
   - "Strong suggestion" badge for high-engagement SDGs
   - "Emerging" badge for newer SDG activities
   - Priority ranking

5. **Commitment Goals**
   - Set target hours per committed SDG
   - Track progress toward goals
   - Celebrate achievement milestones

---

## Files Modified

### `client/src/pages/csr-dashboard.tsx`

**Lines 903-1089**: Corporate SDG Commitments Section (NEW)
- Company header with commitment count
- Grid of committed SDG cards with KPIs
- Interactive filtering on card click

**Lines 1091-1221**: AI Insights Section (MOVED)
- Standalone section with enhanced styling
- Grid layout for suggested SDGs
- Recommendation footer

**Lines 1223-1410**: Filter Section (UPDATED)
- Cleaner header text
- Removed duplicate AI insights
- Retained toggle and filter functionality

**Lines 1411-1551**: (REMOVED)
- Old AI Insights section embedded in filters
- Duplicate suggested SDG chips

---

## Summary

✅ **Corporate commitments now front and center**
✅ **KPIs integrated with commitments for instant insights**
✅ **AI insights elevated to standalone section**
✅ **Filter section cleaner and more focused**
✅ **Better UX with clear information hierarchy**
✅ **Dual-purpose commitment cards (info + filter)**
✅ **Responsive design for all screen sizes**
✅ **No performance impact - conditional rendering**

The CSR Dashboard now provides a clear, actionable view of:
1. What the organization has committed to (with progress)
2. What employees are organically working on (AI insights)
3. How to explore and filter the data (filter controls)

This structure aligns perfectly with executive decision-making needs while maintaining data exploration capabilities.
