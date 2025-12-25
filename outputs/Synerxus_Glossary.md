# Synerxus Platform Glossary

<div align="center">

**Complete Terminology Reference**

*All the terms you need to know*

---

**Version 1.0** | Last Updated: December 2024

</div>

---

## Table of Contents

- [Core Concepts](#core-concepts)
- [Matching & Scoring](#matching--scoring)
- [Impact Measurement](#impact-measurement)
- [Gamification & Rewards](#gamification--rewards)
- [Funding & Payments](#funding--payments)
- [Verification & Trust](#verification--trust)
- [SDG Reference](#sdg-reference)
- [Technical Terms](#technical-terms)

---

## Core Concepts

### AIU (Attributable Impact Unit)

**Definition:** A standardized measure of verified impact created by volunteer contributions. AIUs are calculated based on the work performed, the attribution weight assigned to the role, and verification by the organization.

**How it works:**
```
AIU = (Impact Metric) × (Attribution Weight) × (Verification Factor)

Example:
100 students tutored × 40% attribution × 1.0 verified = 40 AIUs
```

**Who uses it:** All user types. Volunteers earn AIUs, organizations generate them, corporations fund them.

---

### Syner-G Points

**Definition:** Gamification rewards earned by volunteers for platform engagement and contributions. Points drive leaderboard rankings and unlock achievements.

**How to earn:**
| Action | Points |
|--------|--------|
| Complete 1 hour volunteering | 10 pts |
| Submit verified evidence | +5 bonus |
| Receive positive review | +15 bonus |
| Complete a project | +50 bonus |
| Maintain 4-week streak | +25 bonus |
| Earn a badge | +20 bonus |

**Not to be confused with:** AIUs (which measure impact, not engagement)

---

### Match Score / Synergy Score

**Definition:** An AI-calculated percentage (0-100%) indicating how well a volunteer fits an opportunity based on the 4-Factor Matching Algorithm.

**Calculation:**
```
Match Score = (Skills × 35%) + (Availability × 30%) + (SDG Alignment × 25%) + (Trust × 10%)
```

**Score interpretation:**
| Score Range | Tier | Meaning |
|-------------|------|---------|
| 80-100% | EXCELLENT | Strong fit, prioritize |
| 60-79% | GOOD | Solid candidate |
| 40-59% | FAIR | Gaps exist |
| 0-39% | POOR | Significant mismatch |

---

### Trust Score

**Definition:** A 0-100 score measuring the reliability and credibility of a user (volunteer) or organization based on verification level, track record, and community feedback.

**Components:**

*For Volunteers:*
| Factor | Weight |
|--------|--------|
| Verification Level | 40% |
| Completed Hours | 25% |
| Reviews/Ratings | 20% |
| Profile Completeness | 15% |

*For Organizations:*
| Factor | Weight |
|--------|--------|
| Verification Level | 40% |
| Track Record | 30% |
| Financial Transparency | 20% |
| Volunteer Satisfaction | 10% |

---

### Attribution Weight

**Definition:** The percentage of project impact credited to a specific volunteer role. Set by organizations when creating projects.

**Guidelines:**
| Range | Role Type | Examples |
|-------|-----------|----------|
| 10-30% | Support | Admin, logistics, data entry |
| 40-60% | Skilled | Designers, developers, trainers |
| 70-90% | Expert/Lead | Project leads, specialists |

**Example:**
```
Project: "Teach 500 Students"
├── Lead Teacher (50% attribution)
├── Teaching Assistants (30% attribution)
└── Admin Support (20% attribution)
                   ─────
              Total: 100%
```

---

## Matching & Scoring

### 4-Factor Matching Algorithm

**Definition:** Synerxus's proprietary algorithm that matches volunteers to opportunities based on four weighted criteria.

**Factors:**
1. **Skills Match (35%)** - Required and preferred skills alignment
2. **Availability (30%)** - Hours, timezone, duration compatibility
3. **Mission/SDG Alignment (25%)** - Shared passion for the cause
4. **Trust Signals (10%)** - Verification level, reviews, history

---

### Match Tiers

**Definition:** Classification of Match Scores into actionable categories.

| Tier | Score | Icon | Action |
|------|-------|------|--------|
| EXCELLENT | 80-100% | 🌟 | Apply immediately |
| GOOD | 60-79% | ✅ | Strong consideration |
| FAIR | 40-59% | ⚡ | Proceed with caution |
| POOR | 0-39% | ⚠️ | Usually not recommended |

---

### Match Flags

**Definition:** System-generated indicators highlighting specific compatibility issues or strengths between a volunteer and an opportunity.

**Warning Flags (Issues):**
| Flag | Meaning | Severity |
|------|---------|----------|
| `MISSING_CRITICAL_SKILL` | Lacks a required skill marked critical | 🔴 High |
| `TIMEZONE_CHALLENGE` | 6+ hour difference from organization | 🟡 Medium |
| `EXPERIENCE_GAP` | Below stated experience requirement | 🟡 Medium |
| `AVAILABILITY_MISMATCH` | Can't meet hour commitment | 🟡 Medium |
| `LOW_TRUST_SCORE` | Below minimum trust requirement | 🟡 Medium |

**Positive Flags (Strengths):**
| Flag | Meaning | Impact |
|------|---------|--------|
| `TOP_MATCH` | In top 10% of applicants | 🟢 Priority |
| `RETURNING_VOLUNTEER` | Worked with org before | 🟢 Familiarity |
| `VERIFIED_SKILLS` | Certifications validate claims | 🟢 Trust |
| `EXCEEDS_REQUIREMENTS` | Overqualified (positively) | 🟢 Value |

---

### Skill Proficiency Levels

**Definition:** Self-assessed expertise ratings for each skill.

| Level | Range | Description |
|-------|-------|-------------|
| Entry-Level | 0-30% | Learning basics, needs supervision |
| Intermediate | 31-70% | Works independently on standard tasks |
| Expert | 71-100% | Can lead, train, handle complex cases |

---

## Impact Measurement

### Impact Metrics

**Definition:** Quantifiable outcomes tracked per project. Can be standard (hours, people reached) or custom (students tutored, trees planted).

**Standard Metrics:**
- Volunteer Hours
- People Reached/Impacted
- Tasks Completed
- SDGs Addressed

**Custom Metrics (examples):**
- Students Tutored
- Meals Served
- Trees Planted
- Websites Built
- Reports Written

---

### Impact Categories

**Definition:** Classification of how impact reaches beneficiaries.

| Category | Definition | Example |
|----------|------------|---------|
| **Direct** | Immediate, personal impact | Tutoring a student |
| **Indirect** | Impact through intermediaries | Training teachers |
| **Systemic** | Policy/infrastructure change | Advocating for legislation |

---

### Outcome Types

**Definition:** How impact is attributed among contributors.

| Type | Definition | AIU Distribution |
|------|------------|------------------|
| **Individual** | Sole contributor | 100% to one volunteer |
| **Shared** | Team effort | Split by attribution |
| **System** | Platform-wide | Aggregated reporting |

---

## Gamification & Rewards

### Badges

**Definition:** Achievement tokens earned for specific accomplishments.

**Badge Categories:**
| Category | Examples |
|----------|----------|
| **Milestones** | 10 hours, 50 hours, 100 hours |
| **Streaks** | 4-week streak, 8-week streak |
| **Skills** | First task, skill variety |
| **Impact** | SDG Champion, Team Player |
| **Special** | Early adopter, top volunteer |

**Badge Tiers:**
- 🥉 Bronze
- 🥈 Silver
- 🥇 Gold
- 💎 Platinum

---

### Leaderboard

**Definition:** Rankings of volunteers based on various metrics.

**Ranking Types:**
| Type | Metric | Best For |
|------|--------|----------|
| Points | Syner-G total | Overall engagement |
| Hours | Volunteer time | Time commitment |
| Impacts | Metrics logged | Outcome focus |
| Badges | Achievements earned | Gamification |
| Streak | Consecutive weeks | Consistency |

---

### Streak

**Definition:** Consecutive time periods (usually weeks) with logged volunteer activity.

**Streak Benefits:**
- Bonus Syner-G Points
- Special streak badges
- Increased visibility to organizations
- Trust score boost

---

## Funding & Payments

### BOUNTY Model

**Definition:** Pre-funded impact goals where corporate partners allocate funds upfront, held in escrow, and released when milestones are achieved.

**Process:**
```
1. Corporate defines goal (e.g., "Educate 1,000 students")
2. Funds deposited in escrow
3. Partner organization executes program
4. Verified milestones unlock fund tranches
5. Remaining funds returned or rolled over
```

**Best for:** Known goals, high-visibility programs, multi-year commitments

---

### RETROACTIVE Model

**Definition:** Pay-for-outcomes funding where corporate partners reimburse organizations after impact is verified.

**Process:**
```
1. Corporate defines rate (e.g., "$50 per verified student")
2. Partner delivers program with own resources
3. Submits verified impact claims
4. Corporate reviews and reimburses
```

**Best for:** Flexible goals, testing new partnerships, results-based accountability

---

### Disbursement Triggers

**Definition:** Conditions that release funding from corporate to partner.

| Trigger | Description |
|---------|-------------|
| **Milestone** | Specific goal achieved |
| **Time-Based** | Monthly/quarterly schedule |
| **Impact-Verified** | AIUs generated |
| **Manual** | CSR team approval |

---

## Verification & Trust

### Verification Levels

**Definition:** Tiers of identity and credential verification for volunteers.

| Level | Requirements | Access |
|-------|--------------|--------|
| **Level 1 (Basic)** | Email verified, 80%+ profile | Entry-level opportunities |
| **Level 2 (Verified)** | + Phone, LinkedIn OR ID, 10+ hours | Most opportunities |
| **Level 3 (Trusted)** | + Background check, 50+ hours, endorsement | Sensitive roles |

---

### Verification Methods

**Definition:** How organizations confirm volunteer activities occurred.

| Method | Description | Use Case |
|--------|-------------|----------|
| **Manual Review** | Org inspects evidence | Remote work, documents |
| **GPS Geofence** | System verifies location | On-site activities |
| **Photo AI** | AI validates authenticity | Event attendance |
| **QR Scan** | Volunteer scans code | Workshops, gatherings |
| **Peer Confirmation** | Another volunteer confirms | Team activities |

---

### Evidence Types

**Definition:** Documentation submitted to verify volunteer activities.

| Type | Format | Best For |
|------|--------|----------|
| **Photo** | JPEG, PNG | Events, deliverables |
| **Document** | PDF, DOCX | Reports, curricula |
| **Video** | MP4, link | Workshops, training |
| **Geo-location** | GPS coordinates | On-site verification |
| **Digital Artifact** | URL, file | Code, designs |

---

### Blockchain Verification

**Definition:** Immutable record of verified activities stored on blockchain for audit purposes.

**Record includes:**
- Activity details
- Verification timestamp
- Verifier identity
- Evidence hash
- AIU calculation

---

## SDG Reference

### SDG (Sustainable Development Goals)

**Definition:** 17 global goals adopted by the United Nations in 2015 to end poverty, protect the planet, and ensure prosperity for all by 2030.

| # | Goal | Color |
|---|------|-------|
| 1 | No Poverty | #E5243B |
| 2 | Zero Hunger | #DDA63A |
| 3 | Good Health & Well-being | #4C9F38 |
| 4 | Quality Education | #C5192D |
| 5 | Gender Equality | #FF3A21 |
| 6 | Clean Water & Sanitation | #26BDE2 |
| 7 | Affordable & Clean Energy | #FCC30B |
| 8 | Decent Work & Economic Growth | #A21942 |
| 9 | Industry, Innovation & Infrastructure | #FD6925 |
| 10 | Reduced Inequalities | #DD1367 |
| 11 | Sustainable Cities & Communities | #FD9D24 |
| 12 | Responsible Consumption & Production | #BF8B2E |
| 13 | Climate Action | #3F7E44 |
| 14 | Life Below Water | #0A97D9 |
| 15 | Life on Land | #56C02B |
| 16 | Peace, Justice & Strong Institutions | #00689D |
| 17 | Partnerships for the Goals | #19486A |

---

## Technical Terms

### API (Application Programming Interface)

**Definition:** Technical interface allowing external systems to interact with Synerxus data.

**Use cases:**
- HRIS integration
- Custom dashboards
- Automated reporting

---

### PWA (Progressive Web App)

**Definition:** Web application that provides native app-like experience on mobile devices.

**Features:**
- Offline capability
- Push notifications
- Home screen install
- Fast loading

---

### Escrow

**Definition:** Secure holding of funds by Synerxus until disbursement conditions are met.

**Process:**
Corporate deposits → Synerxus holds → Milestones verified → Funds released to partner

---

### VTO (Volunteer Time Off)

**Definition:** Paid or unpaid time off provided by employers for employee volunteering.

**Types:**
- Paid VTO (company time)
- Unpaid VTO (personal time, tracked)
- Skills-based VTO (professional volunteering)

---

### SROI (Social Return on Investment)

**Definition:** Methodology for measuring social, environmental, and economic value created relative to investment.

**Formula:**
```
SROI = (Social Value Created) / (Investment Made)

Example: $3.2M social value / $1M investment = 3.2x SROI
```

---

## Abbreviations Quick Reference

| Abbrev. | Full Term |
|---------|-----------|
| AIU | Attributable Impact Unit |
| CSR | Corporate Social Responsibility |
| ESG | Environmental, Social, Governance |
| SDG | Sustainable Development Goal |
| NGO | Non-Governmental Organization |
| VTO | Volunteer Time Off |
| SROI | Social Return on Investment |
| PWA | Progressive Web App |
| HQ | Headquarters |
| LGU | Local Government Unit |

---

<div align="center">

**Can't find a term?**

Contact support@synerxus.com

---

*© 2024 Synerxus. All rights reserved.*

</div>
