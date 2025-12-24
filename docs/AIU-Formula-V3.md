# Attributable Impact Units (AIU) Formula V3

## Pure Impact Calculation System

**Version:** 3.0
**Last Updated:** December 2024
**Document Type:** Technical Specification

---

## Executive Summary

AIU (Attributable Impact Units) is a metric that measures real-world volunteer impact. Unlike simple "hours volunteered," AIU captures actual outcomes: how many lives were changed, how deep the change was, and whether it was verified by the organization.

**Key Principles:**
- Only real outcomes matter
- No gameable factors (no bonus for uploading photos or attendance)
- Verification comes from organizations, not self-reporting
- Past impact is still impact (no time decay)

---

## The Formula

```
AIU = min(MaxAIU, k × ln(1 + EffectiveScore))
```

Where:

```
EffectiveScore = ImpactScore × EngagementFactor

ImpactScore = LivesImpacted × DepthMultiplier × VerificationMultiplier

EngagementFactor = RoleWeight × HoursFactor

HoursFactor = ln(1 + Hours) / ln(1 + MaxProjectHours)

k = MaxAIU / ln(1 + ExpectedBeneficiaries × MaxDepth × MaxRole × MaxVerification × MaxHours)
```

---

## Formula Components

### 1. Impact Score (What Was Achieved)

The Impact Score measures the real-world change created by the volunteer.

#### 1.1 Lives Impacted

The core metric - how many people were directly helped.

| Description | Example |
|-------------|---------|
| Direct beneficiaries served | Fed 50 people at food bank |
| People trained or educated | Taught 20 students coding |
| Individuals receiving services | Provided legal aid to 5 families |

#### 1.2 Depth Multiplier

How deep and lasting is the change?

| Outcome Type | Multiplier | Description | Example |
|--------------|------------|-------------|---------|
| `individual` | 1.0 | Direct service delivery | Served meals to 10 people |
| `shared` | 1.5 | Capacity building / training | Trained 10 teachers who each teach 30 students |
| `system` | 2.0 | Systems-level change | Changed policy affecting 1000+ people |

**Industry Basis:** IRIS+ Catalog, SROI "multiplier effect" methodology

#### 1.3 Verification Multiplier

Did the organization confirm this impact occurred?

| Status | Multiplier | Description |
|--------|------------|-------------|
| `verified` | 1.0 | Organization confirmed the impact |
| `approved` | 1.0 | Alias for verified |
| `pending` | 0.7 | Organization is reviewing |
| `under_review` | 0.7 | Alias for pending |
| `submitted` | 0.6 | Volunteer submitted, no org review yet |
| `self_reported` | 0.6 | Legacy alias for submitted |
| `disputed` | 0.3 | Impact claim is disputed |
| `rejected` | 0.0 | No AIU for rejected claims |

**Key Principle:** Verification is about organization-level approval, NOT about uploading photos or evidence. The organization must confirm the impact actually happened.

**Industry Basis:** Independent Sector third-party verification standards, SROI stakeholder verification, GRI external assurance standards

---

### 2. Engagement Factor (How They Contributed)

The Engagement Factor measures how the volunteer contributed to creating the impact.

#### 2.1 Role Weight

What level of expertise and responsibility did the volunteer have?

| Category | Role | Weight | Description |
|----------|------|--------|-------------|
| **Executive** | `executive` | 4.0 | C-suite, board advisors |
| | `strategic_advisor` | 3.5 | Senior consultants |
| **Pro Bono** | `pro_bono_legal` | 3.0 | Attorneys, legal counsel |
| | `pro_bono_medical` | 3.0 | Doctors, nurses |
| | `pro_bono_finance` | 2.5 | CPAs, financial advisors |
| | `pro_bono_tech` | 2.5 | Software engineers, architects |
| | `pro_bono_marketing` | 2.0 | Marketing strategists |
| **Leadership** | `project_lead` | 1.8 | Project managers |
| | `lead` | 1.5 | Team leads, coordinators |
| | `team_captain` | 1.5 | Shift supervisors |
| **Skilled** | `mentor` | 1.4 | Mentors, trainers |
| | `specialist` | 1.3 | Subject matter experts |
| | `facilitator` | 1.2 | Workshop facilitators |
| **General** | `support` | 1.0 | General volunteers (baseline) |
| | `volunteer` | 1.0 | Alias for support |
| **Admin** | `admin` | 0.8 | Administrative support |
| | `logistics` | 0.7 | Setup, transportation |
| **Learning** | `trainee` | 0.5 | Volunteers in training |
| | `observer` | 0.3 | Shadowing only |

**Industry Basis:** Taproot Foundation Pro Bono Valuation ($220/hr skilled vs $34.79 general), Independent Sector national volunteer rates, Bureau of Labor Statistics

#### 2.2 Hours Factor

Time invested, scaled logarithmically to prevent gaming.

```
HoursFactor = ln(1 + Hours) / ln(1 + 500)
```

| Hours Logged | Hours Factor | % of Maximum |
|--------------|--------------|--------------|
| 1 hour | 0.11 | 11% |
| 5 hours | 0.29 | 29% |
| 8 hours | 0.35 | 35% |
| 20 hours | 0.48 | 48% |
| 50 hours | 0.63 | 63% |
| 100 hours | 0.74 | 74% |
| 200 hours | 0.85 | 85% |
| 500 hours | 1.00 | 100% |

**Why Logarithmic?**
- First hours matter most (steep initial curve)
- Later hours have diminishing returns (flat curve)
- Prevents gaming by logging excessive hours
- Reflects real-world impact saturation

**Industry Basis:** Future of Humanity Institute Law of Logarithmic Returns

---

### 3. Baseline Multiplier (k)

The baseline multiplier k is derived from the project's expected scale, ensuring AIU grows appropriately for different project sizes.

```
k = MaxAIU / ln(1 + MaxExpectedEffectiveScore)

MaxExpectedEffectiveScore = ExpectedBeneficiaries × MaxDepth × MaxRole × MaxVerification × MaxHours
                          = ExpectedBeneficiaries × 2.0 × 4.0 × 1.0 × 1.0
                          = ExpectedBeneficiaries × 8
```

| Project Expected Beneficiaries | k Value | Effect |
|-------------------------------|---------|--------|
| 50 (small project) | 16.68 | Faster AIU growth |
| 100 (typical project) | 14.98 | Moderate growth |
| 200 (medium project) | 12.76 | Balanced growth |
| 500 (large project) | 10.78 | Slower growth |
| 1000 (very large) | 10.23 | Gradual growth |

**Why Derive k From Project Scale?**
- Small projects: Easier to make meaningful impact, faster AIU growth
- Large projects: More room for impact, slower growth but higher potential
- No hardcoded "magic numbers" - everything is formula-driven

---

### 4. Ceiling Configuration

AIU has built-in ceilings to prevent outliers and encourage diverse contributions.

| Parameter | Value | Purpose |
|-----------|-------|---------|
| MaxAIU per Project | 100 | Prevents single project dominance |
| MaxProjectHours | 500 | Reference maximum for hours factor |
| GlobalMaxAIU (Lifetime) | 1000 | Lifetime cap across all projects |

**Accumulation Model:**
```
Project 1: capped at 100 AIU
Project 2: capped at 100 AIU
Project 3: capped at 100 AIU
...
Lifetime Total: Sum of all projects, capped at 1000
```

**Industry Basis:** B Corp Assessment ceiling-based scoring methodology

---

## Worked Example: Fatima Al-Sayed

### Input Data

| Field | Value | Source |
|-------|-------|--------|
| Lives Impacted | 15 | Volunteer's logged impact |
| Outcome Type | shared | Training/capacity building |
| Verification Status | pending | Organization reviewing |
| Role | lead | Project assignment |
| Hours | 8 | Activity log |
| Project Expected Beneficiaries | 50 | Project settings |

### Step-by-Step Calculation

#### Step 1: Calculate Impact Score

```
Lives Impacted        = 15
× Depth Multiplier    = 1.5   (shared = training multiplier)
× Verification        = 0.7   (pending = org hasn't verified yet)
─────────────────────────────
= Impact Score        = 15.75
```

#### Step 2: Calculate Engagement Factor

```
Role Weight           = 1.5   (lead role)
× Hours Factor        = ln(1+8) / ln(1+500)
                      = ln(9) / ln(501)
                      = 2.197 / 6.217
                      = 0.353
─────────────────────────────
= Engagement Factor   = 0.53
```

#### Step 3: Calculate Effective Score

```
Effective Score = Impact Score × Engagement Factor
                = 15.75 × 0.53
                = 8.35
```

#### Step 4: Derive k

```
MaxExpectedEffectiveScore = 50 × 8 = 400

k = 100 / ln(1 + 400)
  = 100 / ln(401)
  = 100 / 5.994
  = 16.68
```

#### Step 5: Calculate Final AIU

```
AIU = k × ln(1 + EffectiveScore)
    = 16.68 × ln(1 + 8.35)
    = 16.68 × ln(9.35)
    = 16.68 × 2.236
    = 37.29

% of Project Ceiling = 37.29 / 100 = 37.3%
```

### Result Summary

| Metric | Value |
|--------|-------|
| **Final AIU** | 37.29 |
| **% of Project Ceiling** | 37.3% |
| **% of Lifetime Ceiling** | 3.7% |

---

## Growth Scenarios

How Fatima's AIU changes with different actions:

| Scenario | Change | New AIU | Delta |
|----------|--------|---------|-------|
| **Baseline** | Current state | 37.29 | - |
| **Org verifies impact** | pending → verified (0.7 → 1.0) | 53.27 | +42.9% |
| **More hours (50 total)** | 8 → 50 hours | 55.12 | +47.8% |
| **More lives (50 total)** | 15 → 50 lives | 62.45 | +67.5% |
| **Deeper impact** | shared → system (1.5 → 2.0) | 45.89 | +23.1% |
| **All of the above** | Combined | 94.82 | +154.3% |

---

## What Does NOT Affect AIU

These actions have ZERO effect on AIU calculation:

| Action | Effect | Reason |
|--------|--------|--------|
| Upload photos/documents | No change | Menial task, not impact |
| Log in every day | No change | Attendance ≠ outcomes |
| Consecutive month streak | No change | Consistency ≠ more lives changed |
| Self-report without org review | Still 0.6× | Only org verification counts |
| Old vs. recent impact | No change | Past impact is still impact |

---

## Industry Standards Referenced

| Framework | Concept Applied |
|-----------|-----------------|
| **Future of Humanity Institute** | Law of Logarithmic Returns |
| **B Corp Assessment** | Ceiling-based scoring methodology |
| **SROI Methodology** | Outcome-focused impact measurement |
| **IRIS+ Catalog** | Depth multipliers (individual/shared/system) |
| **Taproot Foundation** | Role weight valuations for pro bono |
| **Independent Sector** | Third-party verification standards |
| **GRI Standards** | External assurance for impact claims |

---

## Technical Implementation

### Core Function

```typescript
function calculatePureImpactAIU(input: {
  livesImpacted: number;
  outcomeType: string;        // 'individual' | 'shared' | 'system'
  verificationStatus: string; // 'verified' | 'pending' | 'submitted' | 'rejected'
  role: string;
  hours: number;
  projectExpectedBeneficiaries: number;
}): PureImpactAIUResult
```

### Files

| File | Purpose |
|------|---------|
| `shared/aiu-calculations.ts` | Core formula and constants |
| `server/aiu-service.ts` | Database integration and aggregation |

---

## Appendix: Complete Multiplier Tables

### Depth Multipliers

| outcomeType | Multiplier | Real-World Example |
|-------------|------------|-------------------|
| `individual` | 1.0 | Served 100 meals directly |
| `shared` | 1.5 | Trained 10 cooks who each serve 50 meals/day |
| `system` | 2.0 | Changed food bank policy serving 1000+ monthly |

### Verification Multipliers

| Status | Multiplier | Meaning |
|--------|------------|---------|
| `verified` / `approved` | 1.0 | Organization confirmed |
| `pending` / `under_review` | 0.7 | Organization reviewing |
| `submitted` / `self_reported` | 0.6 | No org review yet |
| `disputed` | 0.3 | Under dispute |
| `rejected` | 0.0 | Claim rejected |

### Role Weights

| Role | Weight | Category |
|------|--------|----------|
| `executive` | 4.0 | Executive |
| `strategic_advisor` | 3.5 | Executive |
| `pro_bono_legal` | 3.0 | Pro Bono |
| `pro_bono_medical` | 3.0 | Pro Bono |
| `pro_bono_finance` | 2.5 | Pro Bono |
| `pro_bono_tech` | 2.5 | Pro Bono |
| `pro_bono_marketing` | 2.0 | Pro Bono |
| `project_lead` | 1.8 | Leadership |
| `lead` | 1.5 | Leadership |
| `team_captain` | 1.5 | Leadership |
| `mentor` | 1.4 | Skilled |
| `specialist` | 1.3 | Skilled |
| `facilitator` | 1.2 | Skilled |
| `support` | 1.0 | General |
| `volunteer` | 1.0 | General |
| `admin` | 0.8 | Administrative |
| `logistics` | 0.7 | Administrative |
| `trainee` | 0.5 | Learning |
| `observer` | 0.3 | Learning |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial KPI-based formula |
| 2.0 | 2024 | Logarithmic ceiling model |
| 3.0 | Dec 2024 | Pure impact (removed gameable factors) |

---

*This document is the authoritative reference for AIU calculation methodology.*
