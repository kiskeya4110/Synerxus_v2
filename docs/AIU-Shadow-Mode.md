# AIU Shadow Mode

> **TODO (Post-Pilot):** Enable AIU display once marketing materials are ready.

## Overview

The AIU (Attributable Impact Units) system is in "Shadow Mode" for the Lighthouse Pilot with corporate clients. This means:

- **Calculations continue running** in the background for internal data validation
- **Data is saved** to the database for future white paper and analytics
- **User-facing display is hidden** - users see "Verified Social Impact" metrics instead
- **API endpoints return 403** to prevent network inspection exposure

## Feature Flag

The AIU visibility is controlled by a feature flag:

### Configuration

**Environment Variable:** `NEXT_PUBLIC_ENABLE_AIU_DISPLAY`
- `false` (default): Shadow Mode - AIU hidden from users
- `true`: Full AIU display enabled

**Compile-time Constant:** `FEATURE_FLAGS.ENABLE_AIU_DISPLAY` in `shared/constants.ts`

### Usage

#### Frontend (React)

```typescript
import { useAIUDisplay, SHADOW_MODE_LABELS } from "@/hooks/use-feature-flags";

function MyComponent() {
  const isAIUEnabled = useAIUDisplay();

  if (!isAIUEnabled) {
    // Show alternative metrics or hide component
    return <SocialValueDisplay />;
  }

  return <AIUDisplay />;
}
```

#### Backend (Node.js)

```typescript
import { isAIUDisplayEnabled } from "@shared/feature-flags";

if (isAIUDisplayEnabled()) {
  // Include AIU in response
}
```

## What's Hidden

When Shadow Mode is enabled:

### Frontend
- "AIUs Earned" KPI cards on dashboards
- AIU Details Modal
- AIU Project Breakdown sections
- All "Attributable Impact Units" terminology

### Backend
- All `/api/aiu/*` endpoints return 403
- No AIU data exposed in network traffic

## What's Still Running

The following continues to operate for internal data collection:

1. **AIU Calculations** - `calculateProjectAIU()`, `calculateVolunteerAIU()`, etc.
2. **Database Storage** - AIU records saved to `volunteer_aiu_records` table
3. **Internal Aggregation** - Organization and CSR-level AIU summation

## Alternative Display Labels

When AIU is hidden, use these generic terms:

| Hidden Term | Replacement |
|-------------|-------------|
| AIU | Impact Score |
| Attributable Impact Units | Verified Social Impact |
| AIUs Earned | Social Value Estimate |

These labels are available in `SHADOW_MODE_LABELS` constant.

## Files Modified

### Core Configuration
- `shared/constants.ts` - Feature flag definition
- `shared/feature-flags.ts` - Feature flag utilities
- `.env.example` - Environment variable documentation

### Frontend
- `client/src/hooks/use-feature-flags.ts` - React hook
- `client/src/pages/volunteer-dashboard.tsx` - Conditional rendering
- `client/src/pages/organization-dashboard.tsx` - Conditional rendering
- `client/src/lib/format-utils.ts` - Alternative formatting functions

### Backend
- `server/routes/aiu.router.ts` - Shadow mode middleware

## Enabling AIU Display

To enable full AIU display after the pilot:

1. Set `NEXT_PUBLIC_ENABLE_AIU_DISPLAY=true` in environment
2. Or change `FEATURE_FLAGS.ENABLE_AIU_DISPLAY` to `true` in `shared/constants.ts`
3. Redeploy the application

All hidden components will automatically become visible.

## Testing

To test AIU display:

1. Set `NEXT_PUBLIC_ENABLE_AIU_DISPLAY=true` in your local `.env`
2. Restart the development server
3. Verify AIU components are visible
4. Set back to `false` to confirm they're hidden

## Related Documentation

- [AIU Formula V3](./AIU-Formula-V3.md) - Technical specification of AIU calculation
