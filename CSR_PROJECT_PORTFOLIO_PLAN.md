# CSR Project Portfolio Tab - Industry-Standard Implementation Plan
**Date:** November 30, 2025 | **Status:** Planning Phase | **Priority:** P0

---

## EXECUTIVE SUMMARY

Design and implement a Project Portfolio tab within the CSR Dashboard that applies industry-standard portfolio management practices, combines impact measurement with financial tracking, and enables data-driven decision-making for corporate social responsibility initiatives.

---

## PART 1: INDUSTRY STANDARDS FRAMEWORK

### 1.1 Applicable Standards & Frameworks

| Framework | Application | Key Requirements |
|-----------|-----------|-----------------|
| **PMI Portfolio Management** | Project selection, prioritization, resource allocation | PPM methodology, portfolio governance, strategic alignment |
| **B-Corp Impact Measurement** | CSR outcome tracking, stakeholder impact verification | Third-party verification, outcome measurement, social impact ROI |
| **GRI Standard 203** | Community impact disclosure, contribution to economic development | Quantified beneficiaries, economic contributions, geographic reach |
| **SASB Standards** | Material ESG issues in volunteer programs | Human capital metrics, community investment tracking, stakeholder engagement |
| **UN SDG Alignment** | Project-to-goal mapping, sustainability integration | 17 SDGs, measurable targets, outcome verification |
| **Rockefeller Monitoring & Evaluation** | Impact rigor, measurement frameworks, learning loops | Theory of change, outcome indicators, counterfactual analysis |

### 1.2 Industry Benchmarks (2025)

**Top Performers in CSR Portfolio Management:**
- **Salesforce**: 500+ projects/year, $50M+ giving, 100K+ employees, 10 focus SDGs
- **Microsoft**: Portfolio-based allocation, $3B+ annual commitment, ROI tracking
- **Google.org**: 30 major projects, $1B+ funding, impact verification required
- **Morgan Stanley**: 250+ projects, $25M+ annual investment, stakeholder ROI model
- **Unilever**: Portfolio tiering (Strategic/Core/Exploratory), impact weighting

**Success Metrics Tracked:**
- Portfolio-to-impact ratio (project spend → beneficiaries reached)
- Strategic alignment score (70-90% projects align with top 3-5 SDGs)
- Completion rate (80-95% projects complete on schedule/budget)
- Stakeholder satisfaction (75-85% satisfaction with portfolio outcomes)
- Cost-per-beneficiary efficiency (tracked across portfolio)

---

## PART 2: CSR PROJECT PORTFOLIO ARCHITECTURE

### 2.1 Portfolio Tier System (Industry Standard)

```
TIER 1: STRATEGIC INITIATIVES
├─ Long-term impact (2-5 years)
├─ High investment ($50K-$500K+)
├─ Primary SDG alignment (exactly 1-2 goals)
├─ Multi-stakeholder involvement
├─ Requires board/executive approval
└─ Example: "Clean Water for 10 Communities"

TIER 2: CORE PROGRAMS
├─ Medium-term focus (6-18 months)
├─ Moderate investment ($10K-$50K)
├─ Secondary SDG alignment (2-4 goals)
├─ Organized team deployment
├─ Manager-level approval required
└─ Example: "Skills Training for 100 Youth"

TIER 3: EXPLORATORY PILOTS
├─ Short-term testing (3-6 months)
├─ Low investment ($1K-$10K)
├─ Experimental SDG focus (1-3 goals)
├─ Limited team engagement
├─ Team lead approval only
└─ Example: "Weekend Tree Planting Initiative"

TIER 4: EMPLOYEE GIVING
├─ Individual micro-projects
├─ Variable investment ($100-$5K)
├─ Direct employee choice
├─ Single SDG focus optional
├─ Self-directed with platform support
└─ Example: "Employee emergency relief fund"
```

### 2.2 Project Lifecycle States

```
PIPELINE → APPROVED → ACTIVE → IN REVIEW → COMPLETE → ARCHIVED
   ↓          ↓         ↓         ↓          ↓          ↓
Initial   Executive  Launched   Mid-term  Outcomes    Lessons
Concept   Greenlight Execution  Check-in  Verified    Learned
```

### 2.3 Core Portfolio Metrics

**Strategic Health Indicators:**
- Portfolio Balance: % spend across Tier 1/2/3/4 (Target: 40/35/15/10)
- Strategic Alignment: % projects supporting top 5 SDGs (Target: 85%+)
- Execution Health: % projects on-time/on-budget (Target: 90%+)
- Impact Efficiency: Cost per beneficiary across portfolio (Benchmark: $10-50)
- Team Engagement: Avg volunteer hours per project (Target: 50-500 hrs)
- Stakeholder Satisfaction: Net satisfaction score (Target: 4.0+/5.0)
- Portfolio Risk: % at-risk projects requiring intervention (Target: <15%)

**Individual Project Metrics:**
- Baseline Impact: Starting beneficiary count, baseline metrics
- Current Status: % progress toward milestones
- Team Allocation: FTEs assigned, volunteer hours logged
- Budget Tracking: Spend rate, cost variance, forecast-to-complete
- Outcome Measurement: Leading indicators, trailing indicators, verification method
- Risk Assessment: Probability + Impact matrix, mitigation plans
- Stakeholder Health: Partner satisfaction, community feedback score

---

## PART 3: PORTFOLIO TAB UI/UX DESIGN

### 3.1 Information Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  CSR Dashboard → Project Portfolio Tab                         │
├────────────────────────────────────────────────────────────────┤
│
│  [Portfolio Summary Cards] (6 KPIs)
│  ├─ Total Projects: 24 | Active: 18 | Completed: 6 | At-Risk: 1
│  ├─ Portfolio Value: $1.2M | Avg Project: $50K | Range: $1K-$500K
│  ├─ Team Engagement: 245 employees | 8,500 hours | 5K beneficiaries
│  ├─ Strategic Alignment: 87% SDG coverage | Top SDGs: 1,5,13
│  ├─ Execution Health: 94% on-time | 89% on-budget
│  └─ ROI: $3.2 per $1 invested (opportunity cost value)
│
│  [Portfolio Tier Breakdown] (Grid View)
│  ├─ TIER 1: Strategic (6 projects) | $400K | 3K beneficiaries
│  ├─ TIER 2: Core (12 projects) | $600K | 1.5K beneficiaries
│  ├─ TIER 3: Pilots (5 projects) | $150K | 600 beneficiaries
│  └─ TIER 4: Employee Giving (1 project) | $50K | 200 beneficiaries
│
│  [Filter & View Options]
│  ├─ Filter by: Tier | Status | SDG | Department | Partner | Risk
│  ├─ View as: Portfolio Grid | Kanban | Timeline | Impact Map
│  └─ Sort by: Investment | Beneficiaries | Timeline | Risk | Completion %
│
│  [Main Portfolio View] (Selectable)
│  ├─ Portfolio Grid
│  │  └─ Project Cards (Name, Tier, Status, Budget, Beneficiaries, 
│  │     Timeline, Risk Badge, Click for Details)
│  │
│  ├─ Kanban Board
│  │  └─ Columns: Pipeline | Approved | Active | Review | Complete
│  │
│  ├─ Timeline / Gantt View
│  │  └─ Project bars with milestones, dependencies, resource peaks
│  │
│  └─ Impact Map
│     └─ SDG distribution, beneficiary heatmap, geographic reach
│
│  [Detailed Project Modal] (On Click)
│  ├─ Project Overview
│  │  ├─ Name, Description, Tier, Status, Timeline
│  │  ├─ Primary SDG (large badge) + Secondary SDGs
│  │  └─ Partnership/Team, Budget, Beneficiaries
│  │
│  ├─ Strategic Alignment
│  │  ├─ Theory of Change visualization
│  │  ├─ Outcome framework (Inputs → Activities → Outputs → Outcomes)
│  │  └─ Leading vs Trailing indicators
│  │
│  ├─ Execution Progress
│  │  ├─ Timeline (start/end, milestones, current status)
│  │  ├─ Budget (allocated, spent, variance, forecast)
│  │  ├─ Team (members, hours, allocation %)
│  │  └─ Deliverables checklist
│  │
│  ├─ Impact Tracking
│  │  ├─ Baseline → Target → Current (visual gauge)
│  │  ├─ Leading indicators (activity metrics)
│  │  ├─ Outcome verification method
│  │  └─ Beneficiary stories/testimonials
│  │
│  ├─ Risk & Health
│  │  ├─ Overall project health score
│  │  ├─ Active risks with mitigation plans
│  │  ├─ Stakeholder satisfaction
│  │  └─ Escalation status
│  │
│  └─ Actions
│     ├─ Edit Project | Update Status | Log Impact | View Files
│     └─ Add Milestone | Allocate Resources | Invite Team | Close Project
│
│  [Analytics & Insights] (Bottom Section)
│  ├─ Portfolio Performance Dashboard
│  │  ├─ Burn-down chart (Budget vs Actual)
│  │  ├─ Pace chart (Timeline adherence)
│  │  ├─ Team capacity utilization
│  │  └─ Impact delivery vs forecast
│  │
│  ├─ Strategic Insights
│  │  ├─ Recommended project rebalancing
│  │  ├─ SDG gap analysis (underutilized goals)
│  │  ├─ High-risk project alerts
│  │  └─ Optimization opportunities
│  │
│  └─ Peer Benchmarking
│     ├─ Cost-per-beneficiary vs industry
│     ├─ Completion rate comparison
│     ├─ Team engagement benchmarks
│     └─ Impact ROI positioning
│
└────────────────────────────────────────────────────────────────┘
```

### 3.2 View Types & Interactions

**View 1: Portfolio Grid**
- Card-based layout showing all projects
- Color-coded by tier (blue/green/amber/gray)
- Status badges (approved/active/at-risk/complete)
- Quick metrics on each card (budget, team, beneficiaries)
- Click to open detailed modal

**View 2: Kanban Board**
- Column-based workflow (Pipeline → Approved → Active → Review → Complete)
- Drag-to-update project status
- Progress indicators on each card
- Risk flags visible
- Activity log on status change

**View 3: Timeline/Gantt**
- Horizontal timeline view
- Project bars with milestones
- Resource allocation stacking
- Dependency lines between projects
- Zoom/scale controls (month/quarter/year)

**View 4: Impact Map**
- Geographic visualization (if location data available)
- SDG bubble chart (size = investment, color = SDG)
- Beneficiary heatmap
- Partner network diagram

---

## PART 4: DATA MODEL & BACKEND REQUIREMENTS

### 4.1 Enhanced Project Schema

```typescript
interface CSRProject {
  id: number;
  name: string;
  description: string;
  
  // Governance
  tier: "strategic" | "core" | "pilot" | "employee";
  status: "pipeline" | "approved" | "active" | "review" | "complete" | "archived";
  
  // Strategic Alignment
  primarySDG: number;
  secondarySDGs: number[];
  theoryOfChange: string;
  strategicJustification: string;
  
  // Timeline & Budget
  startDate: Date;
  endDate: Date;
  budgetAllocated: number;
  budgetSpent: number;
  estimateAtCompletion: number;
  
  // Team & Stakeholders
  projectLead: string;
  teamMembers: Array<{ id: number; name: string; role: string; allocation: number }>;
  partners: Array<{ id: number; name: string; type: "NGO" | "Government" | "Corporate" | "Community" }>;
  
  // Impact Framework
  baselineMetrics: Record<string, number>;
  targetMetrics: Record<string, number>;
  currentMetrics: Record<string, number>;
  leadingIndicators: Array<{ name: string; current: number; target: number }>;
  trailingIndicators: Array<{ name: string; value: number; verificationMethod: string }>;
  beneficiariesDirect: number;
  beneficiariesIndirect: number;
  
  // Execution Tracking
  milestones: Array<{ name: string; targetDate: Date; actualDate?: Date; status: string }>;
  deliverables: Array<{ name: string; dueDate: Date; completionDate?: Date; status: string }>;
  riskAssessment: Array<{ risk: string; probability: number; impact: number; mitigation: string }>;
  stakeholderSatisfaction: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastActivityLog: Date;
}
```

### 4.2 API Endpoints Required

```
GET    /api/csr/projects                          - List all projects
GET    /api/csr/projects/:id                      - Project details
POST   /api/csr/projects                          - Create project
PATCH  /api/csr/projects/:id                      - Update project
DELETE /api/csr/projects/:id                      - Archive project

GET    /api/csr/portfolio/summary                 - Portfolio overview metrics
GET    /api/csr/portfolio/health                  - Portfolio health assessment
GET    /api/csr/portfolio/risks                   - Active risks across portfolio
GET    /api/csr/portfolio/insights                - AI-generated insights

GET    /api/csr/projects/:id/impact              - Project impact snapshot
POST   /api/csr/projects/:id/impact/log          - Log impact data
GET    /api/csr/projects/:id/timeline            - Project gantt data
GET    /api/csr/projects/:id/team                - Team allocation details

GET    /api/csr/projects/:id/files               - Project attachments
POST   /api/csr/projects/:id/files               - Upload file
POST   /api/csr/projects/:id/status              - Update status
POST   /api/csr/projects/:id/milestone           - Add milestone
```

---

## PART 5: IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
- [ ] Update database schema with enhanced project fields
- [ ] Create project management API endpoints
- [ ] Build portfolio summary cards (6 KPIs)
- [ ] Implement Portfolio Grid view
- [ ] Add filtering and sorting

### Phase 2: Core Features (Week 3-4)
- [ ] Build Kanban board view with drag-to-update
- [ ] Create detailed project modal
- [ ] Implement impact tracking UI
- [ ] Add risk assessment visualization
- [ ] Build timeline/Gantt view

### Phase 3: Advanced Analytics (Week 5-6)
- [ ] Portfolio health dashboard
- [ ] Strategic insights engine (AI-powered recommendations)
- [ ] Benchmarking against industry standards
- [ ] Impact map visualization
- [ ] Export portfolio reports (PDF/CSV)

### Phase 4: Polish & Optimization (Week 7-8)
- [ ] Performance optimization
- [ ] Mobile responsive design
- [ ] User testing & iteration
- [ ] Documentation & training materials
- [ ] Go-live & monitoring

---

## PART 6: SUCCESS METRICS

| KPI | Target | Measurement |
|-----|--------|------------|
| Portfolio Visibility | 95% projects tracked | # tracked / # total |
| Decision Speed | <2 days to greenlight | Time from proposal to approval |
| Execution Health | 90%+ on-time/budget | # successful / # total projects |
| Impact Tracking | 100% projects with metrics | # with baseline/target/current |
| Team Adoption | 80%+ active usage | Monthly active users / total team |
| Stakeholder Satisfaction | 4.0+/5.0 | Post-project survey score |
| Cost Efficiency | <$50/beneficiary | Total spend / beneficiaries reached |

---

## PART 7: INDUSTRY BENCHMARKS REFERENCE

**Portfolio Composition Targets:**
- Strategic (Tier 1): 40% of budget, 3-5 year focus
- Core Programs (Tier 2): 35% of budget, 1-2 year focus
- Pilots (Tier 3): 15% of budget, 6-month experimentation
- Employee Giving (Tier 4): 10% of budget, flexible micro-projects

**Risk Tolerance by Tier:**
- Strategic: 5-10% at-risk acceptable (high oversight)
- Core: 10-15% at-risk acceptable (medium oversight)
- Pilots: 20-30% at-risk acceptable (learning environment)
- Employee: 5% at-risk (self-directed within guardrails)

**Completion Rate Benchmarks:**
- Strategic: 90%+ completion expected (long-term commitment)
- Core: 85%+ completion expected (proven track record)
- Pilots: 60%+ completion acceptable (testing phase)
- Employee: 75%+ completion expected (motivated participants)

**Cost Efficiency Targets:**
- Direct service delivery: $20-40 per beneficiary
- Capacity building: $50-100 per beneficiary
- Advocacy/systemic: $100-500 per beneficiary (long-term impact)
- Emergency response: $5-20 per beneficiary (high volume)

---

## PART 8: COMPETITIVE DIFFERENTIATION

**Synerxus Project Portfolio Advantages:**
1. **AI-Powered Insights**: Automatic recommendations for portfolio rebalancing
2. **Real-Time Impact Tracking**: Live dashboards with verified metrics
3. **Stakeholder Engagement**: Multi-stakeholder collaboration tools built-in
4. **Mobile-First Design**: Enable on-site impact logging and team coordination
5. **Industry-Standard Compliance**: Built-in B-Corp, GRI, SASB, UN SDG alignment
6. **Volunteer Integration**: Link projects to employee profiles and career development
7. **Predictive Analytics**: Forecast project outcomes and identify at-risk initiatives early

---

## PART 9: COMPLIANCE & GOVERNANCE

**Portfolio Governance Structure:**
- **Strategic Review**: Quarterly executive reviews (Tier 1 only)
- **Program Reviews**: Monthly manager reviews (Tier 1-2)
- **Impact Verification**: Independent verification quarterly (Tier 1) / annually (Tier 2)
- **Risk Escalation**: Automatic alerts for projects >20% budget variance
- **Audit Trail**: Complete activity log for compliance (GRI 103-1)

---

## PART 10: NEXT STEPS

1. **Approval**: Stakeholder sign-off on portfolio framework
2. **Schema Design**: Finalize database schema with CSR team
3. **Pilot Selection**: Choose 3-5 projects for pilot testing
4. **API Development**: Build endpoints for core functionality
5. **UI Implementation**: Develop Phase 1 components
6. **User Testing**: Iterate based on feedback
7. **Launch**: Go-live with portfolio management

---

**Document Status**: Ready for architecture review and approval

**Suggested Next Phase**: Schema design workshop with technical team

