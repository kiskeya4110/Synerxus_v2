# AI and Matching System Documentation

## Synerxus Platform - Technical Overview

**Document Version:** 1.0
**Date:** January 2026
**Author:** Technical Documentation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Matching Algorithm Overview](#matching-algorithm-overview)
3. [Scoring Components](#scoring-components)
4. [AI Integration Details](#ai-integration-details)
5. [Formula vs AI Comparison](#formula-vs-ai-comparison)
6. [Technical Implementation](#technical-implementation)
7. [API Endpoints](#api-endpoints)

---

## Executive Summary

The Synerxus platform uses a **hybrid approach** combining:

- **Formula-Based Weighted Scoring** for volunteer-opportunity matching
- **OpenAI GPT-4o-mini** for application review insights (optional feature)
- **Rule-Based Logic** for volunteer tips and recommendations

This design prioritizes **transparency**, **consistency**, and **explainability** over black-box AI predictions.

---

## Matching Algorithm Overview

### Core Approach: Weighted Multi-Factor Scoring

The system calculates a **0-100 match score** between volunteers and opportunities using seven weighted dimensions.

### Default Weighting Configuration

| Factor | Weight | Description |
|--------|--------|-------------|
| **Skills Match** | 35% | How well volunteer skills match requirements |
| **SDG Alignment** | 20% | Overlap in UN Sustainable Development Goals |
| **Availability** | 20% | Time compatibility (hours/schedule) |
| **Interest/Cause** | 10% | Mission and cause alignment |
| **Location** | 10% | Geographic/remote work fit |
| **Experience Level** | 5% | Years of experience bonus |
| **Engagement Boost** | +0-10 pts | Rewards active, reliable volunteers |

### Example Score Calculation

```
Volunteer: John Doe
Opportunity: Community Health Outreach Coordinator

Skills Match:      80/100 × 0.35 = 28.0 points
SDG Alignment:     90/100 × 0.20 = 18.0 points
Availability:      70/100 × 0.20 = 14.0 points
Interest Match:    60/100 × 0.10 =  6.0 points
Location Match:   100/100 × 0.10 = 10.0 points
Experience Level:  80/100 × 0.05 =  4.0 points
Engagement Boost:              +5.0 points
─────────────────────────────────────────────
FINAL MATCH SCORE:             85/100
```

### Match Categories

| Score Range | Category | Meaning |
|-------------|----------|---------|
| 80-100 | **Nexus Match** | Excellent fit, high priority |
| 60-79 | **Strong Match** | Good fit, recommended |
| 40-59 | **Gap Match** | Moderate fit, has gaps |
| 0-39 | **No Match** | Poor fit, not recommended |

---

## Scoring Components

### 1. Skills Matching (35% Weight)

**How it works:**
- Compares volunteer skills against required and optional skills
- Uses skill synonym mapping for fuzzy matching
- Applies proficiency weighting based on skill ratings

**Formula:**
```
Base Score = (Matching Required Skills / Total Required Skills) × 100
Proficiency Adjustment = Base Score × (0.7 + Average Proficiency × 0.3)
Optional Bonus = Up to 20 additional points for optional skills
```

**Skill Synonym Examples:**
- "UI Designer" → "User Interface Design"
- "React Developer" → "React.js"
- "Project Management" → "PM", "Project Manager"

### 2. SDG Alignment (20% Weight)

**How it works:**
- Calculates overlap between volunteer's preferred SDGs and opportunity's SDGs
- Primary SDG gets 1.2x multiplier bonus
- Rewards mission alignment

**Formula:**
```
Base Score = (Overlapping SDGs / Total SDGs) × 100
Primary SDG Bonus = Score × 1.2 (if volunteer's primary SDG matches)
```

### 3. Availability Matching (20% Weight)

**4-Tier Scoring System:**

| Availability Used | Score | Description |
|-------------------|-------|-------------|
| ≤50% | 100 pts | Perfect fit - under-utilized |
| 50-80% | 80 pts | Great fit |
| 80-100% | 60 pts | Tight but doable |
| >100% | 20 pts | Over-committed |

**Work Style Matching:**
- Exact match (remote↔remote): 50 pts
- Hybrid flexibility: 40 pts
- Mismatch: 5 pts

### 4. Interest/Cause Matching (10% Weight)

**Formula:**
```
Score = 60 + (Matching Interests / Total Interests) × 40
```

### 5. Location Matching (10% Weight)

| Location Match | Score |
|----------------|-------|
| Remote/Hybrid | 100% |
| Same City | 100% |
| Same Country | 60% |
| Same Region | 40% |
| Different Location | 10% |

### 6. Experience Level (5% Weight)

| Experience | Score |
|------------|-------|
| 0-1 years | 20% |
| 1-2 years | 40% |
| 3-5 years | 60% |
| 5-10 years | 80% |
| 10+ years | 100% |

### 7. Engagement Boost (+0-10 Points)

| Factor | Bonus |
|--------|-------|
| Activity in last 7 days | +5 pts |
| Activity in last 30 days | +3 pts |
| Activity in last 90 days | +1 pt |
| Completion rate ≥80% | +3 pts |
| Completion rate ≥50% | +1 pt |
| Profile completeness ≥90% | +2 pts |
| Profile completeness ≥70% | +1 pt |

---

## AI Integration Details

### What Uses Real AI

#### Application Review Insights

**Technology:** OpenAI GPT-4o-mini
**Purpose:** Generate HR insights when organizations review volunteer applications
**Trigger:** When organization views application details

**What GPT-4o-mini Generates:**
- Overall assessment of volunteer fit
- Strength insights (specific and actionable)
- Experience analysis
- Comparison with past successful volunteers
- Potential concerns or gaps
- Recommended interview questions
- Predicted success score (0-100)
- Key takeaway summary

**API Configuration:**
```javascript
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  temperature: 0.7,
  max_tokens: 1000
});
```

**Cost:** ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens (very economical)

### What Does NOT Use AI

#### 1. Volunteer Tips ("AI Tips")

Despite the naming, `ai-tips-service.ts` uses **rule-based logic**:

```javascript
// Example - purely conditional, no AI:
if (newSkills.length > 0 && matchScore >= 50) {
  tips.push({
    title: "Strong Learning Opportunity",
    description: `You'll develop ${newSkills.length} new skills...`
  });
}
```

#### 2. Match Scoring

The core matching algorithm is **formula-based weighted scoring**, not machine learning.

#### 3. Match Explanations

Match breakdowns are generated from **template strings**, not AI.

---

## Formula vs AI Comparison

### Current System: Formula-Based

| Aspect | Characteristic |
|--------|----------------|
| **Approach** | Deterministic weighted scoring |
| **Transparency** | ✅ Fully explainable |
| **Consistency** | ✅ Same inputs = same output |
| **Training Data** | ❌ Not required |
| **Cold Start** | ✅ Works immediately |
| **Bias** | Explicit in weights (auditable) |
| **Speed** | ✅ Instant calculations |
| **Cost** | ✅ No API costs |

### Pure AI/ML Alternative

| Aspect | Characteristic |
|--------|----------------|
| **Approach** | Neural network pattern recognition |
| **Transparency** | ❌ "Black box" decisions |
| **Consistency** | ⚠️ May vary with model updates |
| **Training Data** | ✅ Requires 10,000+ examples |
| **Cold Start** | ❌ Struggles with new users |
| **Bias** | Hidden in training data |
| **Speed** | ⚠️ Requires API inference |
| **Cost** | ⚠️ Per-request API costs |

### When Formula-Based is Better

1. **Transparency Required** - Users can understand exactly why they matched
2. **Limited Data** - No historical match outcome data available
3. **Fairness Audits** - Explicit weights are auditable for bias
4. **Consistency** - Same volunteer should get same score every time
5. **Cost Sensitivity** - No per-match API costs

### When Pure AI Would Be Better

1. **Large Dataset** - 100,000+ historical matches with outcomes
2. **Hidden Patterns** - Discover correlations humans can't see
3. **Semantic Understanding** - "React Developer" ≈ "Frontend Engineer"
4. **Continuous Learning** - Auto-improve from outcomes

---

## Technical Implementation

### Core Files

| File | Purpose |
|------|---------|
| `server/matching-algorithm.ts` | Main matching engine |
| `server/ai-tips-service.ts` | Rule-based volunteer tips |
| `server/skill-synonyms.ts` | Skill name normalization |
| `server/task-matching-service.ts` | Task-specific matching |
| `server/routes/applications.router.ts` | OpenAI integration |

### Match Calculation Functions

```typescript
// Synchronous calculation (no database)
calculateMatchScore(volunteer, opportunity, weights?)

// Async calculation (with database weights)
calculateMatchScoreAsync(volunteer, opportunity)
```

### Data Quality Tracking

The system tracks:
- **Confidence Score** (0-100%) - How reliable is this match?
- **Data Completeness** (0-100%) - How complete are the profiles?
- **Data Quality Warnings** - What critical data is missing?

---

## API Endpoints

### Matching Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/opportunities/matches` | GET | Get matched opportunities for user |
| `/api/projects/:id/match-analysis` | GET | Detailed match breakdown |
| `/api/opportunities/:id/match-analysis` | GET | Opportunity match details |
| `/api/matchmaker/run` | POST | Run full matchmaker |
| `/api/matchmaker/volunteer/:id` | GET | Top matches for volunteer |

### Query Parameters

```
GET /api/opportunities/matches?userId=55&threshold=40

- userId: Volunteer's user ID
- threshold: Minimum match score (default: 40)
```

### Response Example

```json
{
  "matches": [
    {
      "opportunityId": 123,
      "matchScore": 85,
      "confidence": 92,
      "breakdown": {
        "skills": 80,
        "sdgAlignment": 90,
        "availability": 70,
        "interest": 60,
        "location": 100,
        "experience": 80
      },
      "category": "nexus"
    }
  ]
}
```

---

## Summary

### Technology Stack

| Component | Technology |
|-----------|------------|
| **Core Matching** | Formula-based weighted scoring |
| **Application Insights** | OpenAI GPT-4o-mini |
| **Volunteer Tips** | Rule-based logic |
| **Skill Normalization** | Synonym mapping |
| **Weight Configuration** | Database-driven (dynamic) |

### Key Design Decisions

1. **Transparency over Black-Box** - Users understand their matches
2. **Consistency over Novelty** - Reliable, repeatable results
3. **Speed over Complexity** - Instant calculations, no API latency
4. **Flexibility** - Weights adjustable without code changes
5. **Optional AI Enhancement** - GPT-4o-mini for supplemental insights only

---

## Contact

For questions about this documentation or the matching system, contact the development team.

---

*Document generated January 2026*
