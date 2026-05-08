/**
 * Seed: GFA + BuildSmart Engineering — Jan–May 2026 test activity data
 *
 * Safety requirements:
 *   - ALLOW_TEST_SEED=true must be set
 *   - Will not run if NODE_ENV=production
 *   - Idempotent: running twice produces no duplicate records
 *
 * Rollback: ALLOW_TEST_SEED=true npx tsx scripts/cleanup-gfa-buildsmart-test-data.ts
 *
 * Usage:
 *   ALLOW_TEST_SEED=true npx tsx scripts/seed-gfa-buildsmart-test-data.ts
 */

import { db } from "../server/db";
import {
  users,
  volunteerProfiles,
  projectAssignments,
  volunteerActivities,
  verifiedOutputs,
  verificationAuditLog,
  volunteerOrganizationRelationships,
} from "../shared/schema";
import { eq, and } from "drizzle-orm";

// ── Safety gates ───────────────────────────────────────────────────────────────

if (!process.env.ALLOW_TEST_SEED) {
  console.error(
    "❌  Set ALLOW_TEST_SEED=true to run this script.\n" +
      "    This guard prevents accidental seeding on production or shared environments."
  );
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  console.error("❌  Refusing to seed: NODE_ENV=production.");
  process.exit(1);
}

// ── Constants (live DB IDs — verify before running against a new environment) ──

const SEED_BATCH = "gfa-buildsmart-jan-may-2026-test-seed";

/**
 * These IDs must match the existing DB records.
 * Run `SELECT id, name FROM organizations WHERE name ILIKE '%green future%'` to verify.
 */
const GFA_ORG_ID = 11;              // Green Future Alliance (organization)
const BUILDSMART_CSR_PARTNER_ID = 4; // BuildSmart Engineering (csr_partners)
const GFA_VERIFIER_USER_ID = 52;    // GFA org admin user (contact@gfa.org or similar)

const PROJECTS = {
  solar: 21,       // Solar Village Initiative   — SDGs 7, 13, 11, 17
  hackathon: 22,   // Climate Hackathon          — SDGs 13, 11, 17, 4
  cleanWells: 23,  // Clean Wells Construction   — SDGs 6, 11, 17
} as const;

// ── Named verifiers (rotated across approved records) ─────────────────────────

const VERIFIERS = [
  { name: "GFA Verification Team",  role: "Authorized Partner Verifier" },
  { name: "Felix Amponsah",         role: "GFA Program Lead"             },
  { name: "Sarah Okafor",           role: "NGO Field Coordinator"        },
];

// ── Volunteer definitions (30 volunteers) ─────────────────────────────────────

const VOLUNTEER_DEFS: Array<{
  firstName: string;
  lastName: string;
  emailSlug: string;
  role: string;
  skills: string[];
  preferredSdgs: number[];
  projects: number[];
}> = [
  // ── Solar Village Initiative (vi 0–9) ─────────────────────────────────────
  { firstName: "Emma",     lastName: "Chen",      emailSlug: "emma.chen",      role: "Civil Engineer",                skills: ["civil-engineering","structural-analysis","project-coordination"], preferredSdgs: [7,11,13], projects: [PROJECTS.solar] },
  { firstName: "Marcus",   lastName: "Williams",  emailSlug: "marcus.williams",role: "Environmental Engineer",        skills: ["environmental-engineering","sustainability","impact-assessment"],  preferredSdgs: [7,13,17], projects: [PROJECTS.solar] },
  { firstName: "Aisha",    lastName: "Osei",      emailSlug: "aisha.osei",     role: "Project Manager",               skills: ["project-management","stakeholder-engagement","reporting"],         preferredSdgs: [7,11,17], projects: [PROJECTS.solar] },
  { firstName: "David",    lastName: "Reyes",     emailSlug: "david.reyes",    role: "Data Analyst",                  skills: ["data-analysis","reporting","excel"],                               preferredSdgs: [7,13,17], projects: [PROJECTS.solar] },
  { firstName: "Sofia",    lastName: "Andersen",  emailSlug: "sofia.andersen", role: "Community Outreach Specialist", skills: ["community-outreach","communications","facilitation"],               preferredSdgs: [7,11,17], projects: [PROJECTS.solar] },
  { firstName: "James",    lastName: "Mensah",    emailSlug: "james.mensah",   role: "Renewable Energy Technician",   skills: ["renewable-energy","solar-installation","electrical"],              preferredSdgs: [7,13,11], projects: [PROJECTS.solar] },
  { firstName: "Priya",    lastName: "Kumar",     emailSlug: "priya.kumar",    role: "Sustainability Analyst",        skills: ["sustainability","esg-reporting","carbon-accounting"],              preferredSdgs: [7,13,17], projects: [PROJECTS.solar] },
  { firstName: "Carlos",   lastName: "Santos",    emailSlug: "carlos.santos",  role: "Construction Coordinator",      skills: ["construction-management","site-coordination","safety"],            preferredSdgs: [7,11,9],  projects: [PROJECTS.solar] },
  { firstName: "Yuki",     lastName: "Tanaka",    emailSlug: "yuki.tanaka",    role: "GIS Analyst",                   skills: ["gis-mapping","spatial-analysis","data-visualization"],            preferredSdgs: [7,11,13], projects: [PROJECTS.solar] },
  { firstName: "Fatima",   lastName: "Hassan",    emailSlug: "fatima.hassan",  role: "Field Operations Support",      skills: ["field-operations","logistics","community-liaison"],                preferredSdgs: [7,11,17], projects: [PROJECTS.solar] },

  // ── Clean Wells Construction (vi 10–19) ──────────────────────────────────
  { firstName: "Noah",     lastName: "Kowalski",  emailSlug: "noah.kowalski",  role: "Civil Engineer",                skills: ["civil-engineering","water-systems","structural-analysis"],        preferredSdgs: [6,11,17], projects: [PROJECTS.cleanWells] },
  { firstName: "Amara",    lastName: "Diallo",    emailSlug: "amara.diallo",   role: "Environmental Engineer",        skills: ["environmental-engineering","water-quality","sanitation"],          preferredSdgs: [6,11,13], projects: [PROJECTS.cleanWells] },
  { firstName: "Lena",     lastName: "Muller",    emailSlug: "lena.muller",    role: "Project Manager",               skills: ["project-management","community-engagement","reporting"],          preferredSdgs: [6,11,17], projects: [PROJECTS.cleanWells] },
  { firstName: "Samuel",   lastName: "Asante",    emailSlug: "samuel.asante",  role: "Data Analyst",                  skills: ["data-analysis","survey-design","statistics"],                     preferredSdgs: [6,17,11], projects: [PROJECTS.cleanWells] },
  { firstName: "Zara",     lastName: "Ahmed",     emailSlug: "zara.ahmed",     role: "Community Outreach Specialist", skills: ["community-outreach","stakeholder-engagement","facilitation"],     preferredSdgs: [6,11,17], projects: [PROJECTS.cleanWells] },
  { firstName: "Ethan",    lastName: "Brooks",    emailSlug: "ethan.brooks",   role: "Water Systems Technician",      skills: ["water-systems","pump-installation","plumbing"],                   preferredSdgs: [6,11,17], projects: [PROJECTS.cleanWells] },
  { firstName: "Mei",      lastName: "Lin",       emailSlug: "mei.lin",        role: "Program Assistant",             skills: ["program-support","documentation","community-liaison"],            preferredSdgs: [6,11,17], projects: [PROJECTS.cleanWells] },
  { firstName: "Isaac",    lastName: "Nkrumah",   emailSlug: "isaac.nkrumah",  role: "Construction Coordinator",      skills: ["construction-management","site-safety","materials-procurement"],  preferredSdgs: [6,9,11],  projects: [PROJECTS.cleanWells] },
  { firstName: "Elena",    lastName: "Petrov",    emailSlug: "elena.petrov",   role: "Water Systems Technician",      skills: ["water-quality-testing","sanitation","borehole-assessment"],       preferredSdgs: [6,11,17], projects: [PROJECTS.cleanWells] },
  { firstName: "Jorge",    lastName: "Rivera",    emailSlug: "jorge.rivera",   role: "Field Operations Support",      skills: ["field-operations","logistics","community-mobilization"],          preferredSdgs: [6,11,17], projects: [PROJECTS.cleanWells] },

  // ── Climate Hackathon (vi 20–25) ─────────────────────────────────────────
  { firstName: "Chloe",    lastName: "Martin",    emailSlug: "chloe.martin",   role: "Environmental Engineer",        skills: ["climate-analysis","environmental-science","research"],            preferredSdgs: [13,11,17], projects: [PROJECTS.hackathon] },
  { firstName: "Tariq",    lastName: "Hassan",    emailSlug: "tariq.hassan",   role: "Data Analyst",                  skills: ["data-science","climate-data","python"],                           preferredSdgs: [13,11,4],  projects: [PROJECTS.hackathon] },
  { firstName: "Ava",      lastName: "Robinson",  emailSlug: "ava.robinson",   role: "Program Assistant",             skills: ["program-coordination","facilitation","documentation"],            preferredSdgs: [13,4,17],  projects: [PROJECTS.hackathon] },
  { firstName: "Kofi",     lastName: "Asante",    emailSlug: "kofi.asante",    role: "Community Outreach Specialist", skills: ["community-outreach","youth-engagement","facilitation"],           preferredSdgs: [13,4,11],  projects: [PROJECTS.hackathon] },
  { firstName: "Maya",     lastName: "Yamamoto",  emailSlug: "maya.yamamoto",  role: "Sustainability Analyst",        skills: ["sustainability-analysis","climate-policy","research"],            preferredSdgs: [13,11,17], projects: [PROJECTS.hackathon] },
  { firstName: "Lucas",    lastName: "Fernandez", emailSlug: "lucas.fernandez",role: "GIS Analyst",                   skills: ["spatial-analysis","climate-mapping","gis"],                       preferredSdgs: [13,11,9],  projects: [PROJECTS.hackathon] },

  // ── Dual-project: Solar Village + Climate Hackathon (vi 26–27) ───────────
  { firstName: "Ingrid",   lastName: "Hansen",    emailSlug: "ingrid.hansen",  role: "Project Manager",               skills: ["project-management","cross-sector-collaboration","stakeholder-engagement"], preferredSdgs: [7,13,17], projects: [PROJECTS.solar, PROJECTS.hackathon] },
  { firstName: "Benjamin", lastName: "Owusu",     emailSlug: "benjamin.owusu", role: "Renewable Energy Technician",   skills: ["renewable-energy","technical-training","solar-systems"],          preferredSdgs: [7,13,11], projects: [PROJECTS.solar, PROJECTS.hackathon] },

  // ── Dual-project: Clean Wells + Climate Hackathon (vi 28–29) ─────────────
  { firstName: "Sara",     lastName: "Lindqvist", emailSlug: "sara.lindqvist", role: "Civil Engineer",                skills: ["civil-engineering","water-infrastructure","climate-resilience"],  preferredSdgs: [6,13,11], projects: [PROJECTS.cleanWells, PROJECTS.hackathon] },
  { firstName: "Omar",     lastName: "Khalil",    emailSlug: "omar.khalil",    role: "Field Operations Support",      skills: ["field-operations","community-liaison","logistics"],               preferredSdgs: [6,13,17], projects: [PROJECTS.cleanWells, PROJECTS.hackathon] },
];

// ── Activity templates per project ────────────────────────────────────────────

const ACTIVITY_TEMPLATES: Record<number, Array<{ description: string; outcomeText: string; sdgTags: number[] }>> = {
  [PROJECTS.cleanWells]: [
    { description: "Water quality testing completed at village site",                         outcomeText: "Water samples collected and tested at 4 household access points; results documented for partner review",                                          sdgTags: [6,11,17] },
    { description: "Community well inspection and safety assessment conducted",               outcomeText: "Inspected 6 existing wells for structural integrity and contamination risk; flagged 2 for urgent repair",                                         sdgTags: [6,11] },
    { description: "Hand pump installation support completed",                                outcomeText: "Assisted installation team with 2 community hand pumps serving 18 households",                                                                   sdgTags: [6,11,17] },
    { description: "Household water access survey conducted",                                 outcomeText: "Surveyed 35 households on current water source, daily usage, and access barriers; data ready for analysis",                                       sdgTags: [6,17] },
    { description: "Site safety checklist and compliance review completed",                   outcomeText: "Completed 3-stage safety checklist across construction zone; all critical items resolved before sign-off",                                        sdgTags: [6,11] },
    { description: "Community handover documentation and training prepared",                  outcomeText: "Prepared handover pack for community water committee including operation manual, contact log, and maintenance schedule",                          sdgTags: [6,17,11] },
  ],
  [PROJECTS.solar]: [
    { description: "Solar panel installation support completed at residential cluster",       outcomeText: "Supported installation of 6 rooftop solar systems; 6 families now grid-connected",                                                              sdgTags: [7,13,11] },
    { description: "Solar system performance check and efficiency review completed",          outcomeText: "Audited 12 existing systems; average output at 94% of design spec; 1 panel replaced due to shading issue",                                       sdgTags: [7,13] },
    { description: "Community solar maintenance training session delivered",                  outcomeText: "Delivered 3-hour hands-on training to 14 community members on system cleaning, fault detection, and reporting",                                  sdgTags: [7,17,11] },
    { description: "Household energy access needs assessment completed",                      outcomeText: "Assessed energy needs of 28 households; findings submitted to project lead for installation prioritisation",                                      sdgTags: [7,11,17] },
    { description: "Solar site inspection and feasibility review conducted",                  outcomeText: "Completed feasibility review for 5 proposed installation sites; 4 approved, 1 deferred due to shading constraints",                             sdgTags: [7,13] },
    { description: "Renewable energy workshop facilitated with community group",              outcomeText: "Led 2-hour workshop for 20 participants covering solar technology basics, benefits, and maintenance responsibilities",                             sdgTags: [7,11,17] },
  ],
  [PROJECTS.hackathon]: [
    { description: "Climate adaptation workshop facilitated with participants",               outcomeText: "Facilitated 4-hour climate adaptation workshop with 18 participants; 3 community action plans drafted",                                          sdgTags: [13,11,17] },
    { description: "Youth innovation session on climate solutions co-facilitated",            outcomeText: "Co-facilitated youth session with 22 participants; 5 prototype concepts presented for mentorship follow-up",                                     sdgTags: [13,4,11] },
    { description: "Climate resilience dataset reviewed and cleaned",                         outcomeText: "Reviewed and cleaned 1,200-row community resilience dataset; removed duplicates, standardised geographic codes",                                  sdgTags: [13,17] },
    { description: "Community survey data validated and processed",                           outcomeText: "Validated 310 survey responses for data quality; flagged 12 for follow-up and prepared clean dataset for analysis",                              sdgTags: [13,11,4] },
    { description: "Prototype review session facilitated and documented",                     outcomeText: "Facilitated structured review of 4 climate solution prototypes with mentors; documented feedback for iteration",                                  sdgTags: [13,4,17] },
    { description: "Climate education materials developed and peer-reviewed",                 outcomeText: "Developed 2 climate literacy modules (energy and water); both peer-reviewed and approved for programme roll-out",                                sdgTags: [13,4,11] },
  ],
};

// ── Status assignment (75 / 12 / 8 / 5 split) ────────────────────────────────

const INCOMPLETE_REASONS = [
  "Output description needs more detail",
  "Partner confirmation note missing",
  "Activity date requires clarification",
  "Supporting documentation missing",
];

const REJECTED_REASONS = [
  "Duplicate submission",
  "Activity outside approved project scope",
  "Insufficient supporting detail",
  "Unable to confirm with partner",
];

function getStatus(globalIdx: number, total: number): "approved" | "pending" | "incomplete" | "rejected" {
  const pct = globalIdx / total;
  if (pct < 0.75) return "approved";
  if (pct < 0.87) return "pending";
  if (pct < 0.95) return "incomplete";
  return "rejected";
}

// ── Date helpers ──────────────────────────────────────────────────────────────

const DAYS_IN_MONTH_2026 = [31, 28, 31, 30, 31]; // Jan–May 2026

function makeActivityDate(monthIndex: number, seed: number): Date {
  const month = monthIndex % 5; // 0=Jan … 4=May
  const day = 1 + ((seed * 7 + monthIndex * 3) % DAYS_IN_MONTH_2026[month]);
  return new Date(2026, month, day, 9 + (seed % 8), 0, 0);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// ── Beneficiary count helpers ─────────────────────────────────────────────────

function getBeneficiaryCount(projectId: number, seed: number): number {
  if (projectId === PROJECTS.cleanWells) return 5 + (seed % 8);   // 5–12
  if (projectId === PROJECTS.solar)      return 3 + (seed % 6);   // 3–8
  if (projectId === PROJECTS.hackathon)  return 1 + (seed % 5);   // 1–5
  return 0;
}

function getBeneficiaryType(projectId: number): string {
  if (projectId === PROJECTS.cleanWells) return "community_member";
  if (projectId === PROJECTS.solar)      return "household";
  if (projectId === PROJECTS.hackathon)  return "participant";
  return "community_member";
}

// ── Main seed function ────────────────────────────────────────────────────────

async function main() {
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  GFA + BuildSmart Seed — Jan–May 2026");
  console.log(`  Batch: ${SEED_BATCH}`);
  console.log("══════════════════════════════════════════════════════\n");

  // ── Idempotency check ──────────────────────────────────────────────────────
  const existingCheck = await db
    .select({ id: volunteerActivities.id })
    .from(volunteerActivities)
    .where(eq(volunteerActivities.deviceId, SEED_BATCH))
    .limit(1);

  if (existingCheck.length > 0) {
    console.log("✅  Seed batch already present — nothing to do.");
    console.log(`    deviceId="${SEED_BATCH}" found in volunteer_activities.`);
    console.log("    To re-seed, run the cleanup script first:\n");
    console.log("    ALLOW_TEST_SEED=true npx tsx scripts/cleanup-gfa-buildsmart-test-data.ts\n");
    process.exit(0);
  }

  // ── Step 1/7: Create volunteer users (idempotent by email) ────────────────
  console.log("Step 1/7 — Creating volunteer users…");
  const createdUserIds: number[] = [];

  for (const v of VOLUNTEER_DEFS) {
    const email = `${v.emailSlug}+gfa-test@buildsmart.example`;
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      createdUserIds.push(existing[0].id);
    } else {
      const username = `${v.emailSlug.replace(".", "_")}_gfatest`;
      const [inserted] = await db
        .insert(users)
        .values({
          username,
          email,
          password: "seed_no_login",
          userType: "volunteer",
          displayName: `${v.firstName} ${v.lastName}`,
          bio: `${v.role} volunteering with Green Future Alliance via BuildSmart Engineering.`,
          skills: v.skills,
          dataConsent: true,
          dataConsentDate: new Date("2026-01-01"),
        })
        .returning({ id: users.id });
      createdUserIds.push(inserted.id);
    }
  }
  console.log(`   ✓ ${createdUserIds.length} volunteer users ready\n`);

  // ── Step 2/7: Create volunteer profiles ───────────────────────────────────
  console.log("Step 2/7 — Creating volunteer profiles (linked to BuildSmart)…");

  for (let i = 0; i < VOLUNTEER_DEFS.length; i++) {
    const v = VOLUNTEER_DEFS[i];
    const userId = createdUserIds[i];

    const existingProfile = await db
      .select({ id: volunteerProfiles.id })
      .from(volunteerProfiles)
      .where(eq(volunteerProfiles.userId, userId))
      .limit(1);

    if (existingProfile.length > 0) {
      await db
        .update(volunteerProfiles)
        .set({
          employerId: BUILDSMART_CSR_PARTNER_ID,
          jobTitleAtCompany: v.role,
          departmentName: "CSR Volunteer Program",
          updatedAt: new Date(),
        })
        .where(eq(volunteerProfiles.userId, userId));
    } else {
      await db.insert(volunteerProfiles).values({
        userId,
        volunteerName: `${v.firstName} ${v.lastName}`,
        professionalTitle: v.role,
        skills: v.skills,
        preferredSdgs: v.preferredSdgs,
        preferredCauses: ["Environment", "Community Development", "Climate Action"],
        weeklyAvailability: 8,
        employerId: BUILDSMART_CSR_PARTNER_ID,
        jobTitleAtCompany: v.role,
        departmentName: "CSR Volunteer Program",
        location: "Remote / Field",
        onboardingCompleted: true,
      });
    }
  }
  console.log(`   ✓ ${VOLUNTEER_DEFS.length} volunteer profiles ready\n`);

  // ── Step 3/7: Create project assignments ──────────────────────────────────
  console.log("Step 3/7 — Creating project assignments…");
  let assignmentCount = 0;

  for (let i = 0; i < VOLUNTEER_DEFS.length; i++) {
    const v = VOLUNTEER_DEFS[i];
    const userId = createdUserIds[i];

    for (const projectId of v.projects) {
      const existing = await db
        .select({ id: projectAssignments.id })
        .from(projectAssignments)
        .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.volunteerId, userId)))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(projectAssignments).values({
          projectId,
          volunteerId: userId,
          role: v.role,
          status: "active",
          assignedAt: new Date("2025-12-15"),
          respondedAt: new Date("2025-12-16"),
          notes: `Seeded: ${SEED_BATCH}`,
        });
        assignmentCount++;
      }
    }
  }
  console.log(`   ✓ ${assignmentCount} project assignments created\n`);

  // ── Step 4/7: Create volunteer–GFA relationships ──────────────────────────
  console.log("Step 4/7 — Creating volunteer–GFA relationships…");
  let relCount = 0;

  for (const userId of createdUserIds) {
    const existing = await db
      .select({ id: volunteerOrganizationRelationships.id })
      .from(volunteerOrganizationRelationships)
      .where(and(
        eq(volunteerOrganizationRelationships.volunteerId, userId),
        eq(volunteerOrganizationRelationships.organizationId, GFA_ORG_ID)
      ))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(volunteerOrganizationRelationships).values({
        volunteerId: userId,
        organizationId: GFA_ORG_ID,
        relationshipType: "active",
        firstContactAt: new Date("2025-12-15"),
        lastActivityAt: new Date("2026-01-01"),
        isActive: true,
      });
      relCount++;
    }
  }
  console.log(`   ✓ ${relCount} volunteer–org relationships created\n`);

  // ── Step 5/7: Build activity plan ─────────────────────────────────────────
  console.log("Step 5/7 — Generating activity logs…");

  type ActivityPlan = {
    volunteerIdx: number;
    projectId: number;
    activityLocalIdx: number;
    activitiesOnThisProject: number;
  };

  const activityPlan: ActivityPlan[] = [];

  for (let vi = 0; vi < VOLUNTEER_DEFS.length; vi++) {
    const v = VOLUNTEER_DEFS[vi];
    const totalActivities = 5 + (vi % 3); // cycles 5, 6, 7

    if (v.projects.length === 1) {
      for (let ai = 0; ai < totalActivities; ai++) {
        activityPlan.push({ volunteerIdx: vi, projectId: v.projects[0], activityLocalIdx: ai, activitiesOnThisProject: totalActivities });
      }
    } else {
      const halfA = Math.ceil(totalActivities / 2);
      const halfB = totalActivities - halfA;
      for (let ai = 0; ai < halfA; ai++) {
        activityPlan.push({ volunteerIdx: vi, projectId: v.projects[0], activityLocalIdx: ai, activitiesOnThisProject: halfA });
      }
      for (let ai = 0; ai < halfB; ai++) {
        activityPlan.push({ volunteerIdx: vi, projectId: v.projects[1], activityLocalIdx: ai, activitiesOnThisProject: halfB });
      }
    }
  }

  const totalActivities = activityPlan.length;

  // Deterministic Fisher-Yates shuffle (reproducible status distribution)
  for (let i = totalActivities - 1; i > 0; i--) {
    const j = Math.abs((i * 1103515245 + 12345) % (i + 1));
    [activityPlan[i], activityPlan[j]] = [activityPlan[j], activityPlan[i]];
  }

  const activityRows: any[] = [];
  const verifiedOutputRows: any[] = [];

  // Track activities per project per month (for coverage verification)
  const projectMonthCoverage: Record<string, number> = {};
  for (const pid of [PROJECTS.solar, PROJECTS.cleanWells, PROJECTS.hackathon]) {
    for (let m = 0; m < 5; m++) projectMonthCoverage[`${pid}-${m}`] = 0;
  }

  for (let globalIdx = 0; globalIdx < totalActivities; globalIdx++) {
    const plan = activityPlan[globalIdx];
    const v = VOLUNTEER_DEFS[plan.volunteerIdx];
    const userId = createdUserIds[plan.volunteerIdx];
    const projectId = plan.projectId;
    const status = getStatus(globalIdx, totalActivities);

    // Spread activities across all 5 months; every project covered every month
    const monthIndex = (plan.activityLocalIdx + plan.volunteerIdx * 2) % 5;
    const activityDate = makeActivityDate(monthIndex, plan.volunteerIdx * 13 + plan.activityLocalIdx);
    projectMonthCoverage[`${projectId}-${monthIndex}`]++;

    // Pick activity template
    const templates = ACTIVITY_TEMPLATES[projectId];
    const template = templates[(plan.volunteerIdx + plan.activityLocalIdx) % templates.length];

    // Hours: 2–8 deterministic
    const hours = 2 + ((plan.volunteerIdx * 3 + plan.activityLocalIdx * 7) % 7);

    // Submission timing: 0–1 days after activity (used to override createdAt)
    const submittedDaysAfter = plan.activityLocalIdx % 2; // 0 or 1
    const submittedAt = addDays(activityDate, submittedDaysAfter);

    const baseRow: any = {
      userId,
      projectId,
      hours,
      date: activityDate,
      description: status === "incomplete"
        ? `${template.description} — [${INCOMPLETE_REASONS[(plan.volunteerIdx + plan.activityLocalIdx) % INCOMPLETE_REASONS.length]}]`
        : template.description,
      outcomeText: status === "approved" || status === "pending" ? template.outcomeText : null,
      outcomes: template.description,
      verificationStatus: status,
      role: plan.volunteerIdx % 5 === 0 ? "lead" : "support",
      sdgTags: template.sdgTags,
      sdgMappingMethod: "manual",
      loggedByType: "self",
      skillsApplied: v.skills.slice(0, 2),
      beneficiaryCount: null,
      beneficiaryType: null,
      verifiedBy: null,
      verifiedAt: null,
      verifierRole: null,
      verifierName: null,
      rejectedReason: null,
      // Override createdAt to the submission date so avgVerificationTime is meaningful
      createdAt: submittedAt,
      deviceId: SEED_BATCH,
    };

    if (status === "approved") {
      const verifier = VERIFIERS[plan.volunteerIdx % VERIFIERS.length];
      const verifyDaysAfter = 1 + (plan.volunteerIdx % 5); // 1–5 days after submission
      baseRow.verifiedBy     = GFA_VERIFIER_USER_ID;
      baseRow.verifiedAt     = addDays(submittedAt, verifyDaysAfter);
      baseRow.verifierRole   = verifier.role;
      baseRow.verifierName   = verifier.name;
      baseRow.beneficiaryCount = getBeneficiaryCount(projectId, plan.volunteerIdx + plan.activityLocalIdx);
      baseRow.beneficiaryType  = getBeneficiaryType(projectId);
    }

    if (status === "rejected") {
      baseRow.rejectedReason = REJECTED_REASONS[(plan.volunteerIdx + plan.activityLocalIdx) % REJECTED_REASONS.length];
    }

    activityRows.push(baseRow);
  }

  // Insert activities in batches; collect IDs and approved activity data
  const BATCH_SIZE = 50;
  let insertedActivities = 0;

  type ApprovedRecord = { id: number; projectId: number; userId: number; hours: number; verifiedAt: Date };
  const approvedRecords: ApprovedRecord[] = [];

  for (let i = 0; i < activityRows.length; i += BATCH_SIZE) {
    const batch = activityRows.slice(i, i + BATCH_SIZE);
    const inserted = await db
      .insert(volunteerActivities)
      .values(batch)
      .returning({
        id: volunteerActivities.id,
        verificationStatus: volunteerActivities.verificationStatus,
        projectId: volunteerActivities.projectId,
        hours: volunteerActivities.hours,
        verifiedAt: volunteerActivities.verifiedAt,
        verifiedBy: volunteerActivities.verifiedBy,
      });

    insertedActivities += inserted.length;

    for (const row of inserted) {
      if (row.verificationStatus === "approved" && row.verifiedAt && row.verifiedBy) {
        const batchIdx = inserted.indexOf(row);
        const origRow = activityRows[i + batchIdx];

        approvedRecords.push({
          id: row.id,
          projectId: row.projectId,
          userId: origRow.userId,
          hours: row.hours ?? 0,
          verifiedAt: new Date(row.verifiedAt as any),
        });

        verifiedOutputRows.push({
          activityId: row.id,
          partnerId: BUILDSMART_CSR_PARTNER_ID,
          projectId: row.projectId,
          outputType: "hours",
          outputValue: Math.max(1, Math.round(row.hours ?? 1)),
          verificationStatus: "verified",
          verifiedBy: GFA_VERIFIER_USER_ID,
          verifiedAt: row.verifiedAt,
          evidence: null,
          auditTrail: {
            action: "approved",
            timestamp: row.verifiedAt,
            reviewerId: GFA_VERIFIER_USER_ID,
            description: `Activity verified: ${Math.round(row.hours ?? 1)}h recorded`,
            seedBatch: SEED_BATCH,
          },
        });
      }
    }
  }

  const approvedCount  = activityRows.filter((r) => r.verificationStatus === "approved").length;
  const pendingCount   = activityRows.filter((r) => r.verificationStatus === "pending").length;
  const incompleteCount = activityRows.filter((r) => r.verificationStatus === "incomplete").length;
  const rejectedCount  = activityRows.filter((r) => r.verificationStatus === "rejected").length;

  console.log(`   ✓ ${insertedActivities} activity logs inserted`);
  console.log(`     approved=${approvedCount}  pending=${pendingCount}  incomplete=${incompleteCount}  rejected=${rejectedCount}\n`);

  // ── Step 6/7: Create verified output records ──────────────────────────────
  console.log("Step 6/7 — Creating verified output records…");
  let insertedOutputs = 0;
  for (let i = 0; i < verifiedOutputRows.length; i += BATCH_SIZE) {
    const batch = verifiedOutputRows.slice(i, i + BATCH_SIZE);
    await db.insert(verifiedOutputs).values(batch);
    insertedOutputs += batch.length;
  }
  console.log(`   ✓ ${insertedOutputs} verified output records created\n`);

  // ── Step 7/7: Create verification audit log entries ───────────────────────
  console.log("Step 7/7 — Creating verification audit log entries…");
  const auditLogRows = approvedRecords.map(({ id, projectId, userId, hours, verifiedAt }) => ({
    activityId: id,
    projectId,
    organizationId: GFA_ORG_ID,
    action: "approved",
    previousStatus: "pending",
    newStatus: "approved",
    performedBy: GFA_VERIFIER_USER_ID,
    performedByRole: "organization",
    volunteerId: userId,
    deviceId: SEED_BATCH,
    reason: null,
    changeDetails: { hours, seedBatch: SEED_BATCH, autoVerified: true },
    createdAt: verifiedAt, // timestamp matches verification action
  }));

  let insertedAuditLogs = 0;
  for (let i = 0; i < auditLogRows.length; i += BATCH_SIZE) {
    await db.insert(verificationAuditLog).values(auditLogRows.slice(i, i + BATCH_SIZE));
    insertedAuditLogs += auditLogRows.slice(i, i + BATCH_SIZE).length;
  }
  console.log(`   ✓ ${insertedAuditLogs} verification audit log entries created\n`);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const approvedRows = activityRows.filter((r) => r.verificationStatus === "approved");
  const verifiedHours = approvedRows.reduce((sum, r) => sum + (r.hours ?? 0), 0);

  const projectNameMap: Record<number, string> = {
    [PROJECTS.cleanWells]: "Clean Wells Construction",
    [PROJECTS.solar]: "Solar Village Initiative",
    [PROJECTS.hackathon]: "Climate Hackathon",
  };
  const reachByProject: Record<string, number> = {
    "Clean Wells Construction": 0,
    "Solar Village Initiative": 0,
    "Climate Hackathon": 0,
  };
  for (const r of approvedRows) {
    const pName = projectNameMap[r.projectId];
    if (pName) reachByProject[pName] += r.beneficiaryCount ?? 0;
  }

  const allSdgs = new Set<number>();
  for (const r of approvedRows) {
    for (const sdg of (r.sdgTags ?? [])) allSdgs.add(sdg);
  }

  const monthNames = ["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026"];

  console.log("══════════════════════════════════════════════════════");
  console.log("  SEED COMPLETE — GFA + BuildSmart Jan–May 2026");
  console.log("══════════════════════════════════════════════════════\n");
  console.log(`  Seed batch:               ${SEED_BATCH}`);
  console.log(`  GFA org ID:               ${GFA_ORG_ID}`);
  console.log(`  BuildSmart CSR partner:   ${BUILDSMART_CSR_PARTNER_ID}`);
  console.log(`  GFA verifier user ID:     ${GFA_VERIFIER_USER_ID}\n`);

  console.log("  VOLUNTEERS");
  console.log(`    Total:                  ${VOLUNTEER_DEFS.length}`);
  console.log(`    Email pattern:          firstname.lastname+gfa-test@buildsmart.example\n`);

  console.log("  ACTIVITY LOGS");
  console.log(`    Total:                  ${insertedActivities}`);
  console.log(`    Verified (approved):    ${approvedCount}  (${Math.round(approvedCount / insertedActivities * 100)}%)`);
  console.log(`    Pending:                ${pendingCount}  (${Math.round(pendingCount / insertedActivities * 100)}%)`);
  console.log(`    Incomplete:             ${incompleteCount}  (${Math.round(incompleteCount / insertedActivities * 100)}%)`);
  console.log(`    Rejected:               ${rejectedCount}  (${Math.round(rejectedCount / insertedActivities * 100)}%)\n`);

  console.log("  VERIFIED HOURS");
  console.log(`    Total verified hours:   ${verifiedHours.toFixed(1)}h\n`);

  console.log("  VERIFIED EVIDENCE RECORDS");
  console.log(`    verifiedOutputs rows:   ${insertedOutputs}`);
  console.log(`    verificationAuditLog:   ${insertedAuditLogs}\n`);

  console.log("  PARTNER-REPORTED REACH (from approved beneficiaryCount)");
  for (const [name, count] of Object.entries(reachByProject)) {
    console.log(`    ${name.padEnd(30)} ${count} people`);
  }
  console.log();

  console.log("  SDG MAPPINGS (from verified activities)");
  console.log(`    SDGs covered:           ${Array.from(allSdgs).sort((a, b) => a - b).map((s) => `SDG ${s}`).join(", ")}\n`);

  console.log("  FRAMEWORKS MAPPED");
  console.log("    GRI 413 — Local Communities");
  console.log("    ESRS S3 — Affected Communities");
  console.log("    ISAE 3000 — Assurance preparation");
  console.log("    Internal ESG / CSR reporting\n");

  console.log("  PROJECT COVERAGE (activities per project per month)");
  for (const pid of [PROJECTS.solar, PROJECTS.cleanWells, PROJECTS.hackathon]) {
    const counts = [0, 1, 2, 3, 4].map((m) => projectMonthCoverage[`${pid}-${m}`] ?? 0);
    console.log(`    ${projectNameMap[pid].padEnd(30)} ${monthNames.map((n, i) => `${n}:${counts[i]}`).join("  ")}`);
  }

  console.log();
  console.log("  DASHBOARD / REPORT CONSISTENCY NOTES");
  console.log("    • verificationStatus='approved'  → counted as verified (matches dashboard)");
  console.log("    • pending/incomplete/rejected    → excluded from verified totals");
  console.log("    • beneficiaryCount (approved)    → appears as partner-reported reach");
  console.log("    • sdgTags on approved records    → SDG strip on report page 6");
  console.log("    • verifierName / verifierRole    → shown in evidence records table");
  console.log("    • createdAt set to submittedAt   → avg verification time is meaningful");

  console.log();
  console.log("  RUN COMMAND");
  console.log("    ALLOW_TEST_SEED=true npx tsx scripts/seed-gfa-buildsmart-test-data.ts");
  console.log("  ROLLBACK COMMAND");
  console.log("    ALLOW_TEST_SEED=true npx tsx scripts/cleanup-gfa-buildsmart-test-data.ts\n");
  console.log("══════════════════════════════════════════════════════\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌  Seed failed:", err?.message ?? err);
  process.exit(1);
});
