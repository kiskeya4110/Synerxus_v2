/**
 * Seed: BuildSmart Engineering — extra NGO partners and east-region projects
 *
 * Safety requirements:
 *   - ALLOW_TEST_SEED=true must be set
 *   - Will not run if NODE_ENV=production
 *   - Idempotent: running twice produces no duplicate activity rows
 *
 * Usage:
 *   ALLOW_TEST_SEED=true npm run seed:buildsmart:multi-org
 */

import { db } from "../server/db";
import {
  organizations,
  projectAssignments,
  projects,
  users,
  verifiedOutputs,
  verificationAuditLog,
  volunteerActivities,
  volunteerOrganizationRelationships,
  volunteerProfiles,
} from "../shared/schema";
import { and, eq } from "drizzle-orm";

if (!process.env.ALLOW_TEST_SEED) {
  console.error(
    "Set ALLOW_TEST_SEED=true to run this script.\n" +
      "This guard prevents accidental seeding on production or shared environments."
  );
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed: NODE_ENV=production.");
  process.exit(1);
}

const SEED_BATCH = "buildsmart-east-multi-org-jan-may-2026-test-seed";
const BUILDSMART_CSR_PARTNER_ID = 4;
const BATCH_SIZE = 50;

type SeedOrg = {
  name: string;
  city: string;
  country: string;
  description: string;
  contactEmail: string;
  sdgs: number[];
  needs: string[];
  projects: SeedProject[];
};

type SeedProject = {
  name: string;
  description: string;
  location: string;
  sdgs: number[];
  primarySdg: number;
  impactMetricName: string;
  impactMetricUnit: string;
  livesTouched: number;
  skills: string[];
  activities: Array<{ description: string; outcomeText: string; beneficiaryType: string; beneficiaryBase: number }>;
};

const SEED_ORGS: SeedOrg[] = [
  {
    name: "Eastside Community Works",
    city: "Accra",
    country: "Ghana",
    description: "Community infrastructure NGO coordinating education, water, and renewable energy projects across eastern districts.",
    contactEmail: "programs@eastsidecommunity.example",
    sdgs: [4, 6, 7, 11, 13],
    needs: ["site-assessment", "engineering-review", "community-training", "data-reporting"],
    projects: [
      {
        name: "East District School Retrofit",
        description: "Engineering review and low-cost retrofit planning for classrooms serving high-need communities.",
        location: "East District, Accra, Ghana",
        sdgs: [4, 9, 11],
        primarySdg: 4,
        impactMetricName: "Classrooms assessed",
        impactMetricUnit: "classrooms",
        livesTouched: 320,
        skills: ["civil-engineering", "structural-analysis", "safety-review"],
        activities: [
          { description: "Classroom safety inspection completed", outcomeText: "Assessed 6 classrooms for ventilation, lighting, and structural risks; priority fixes logged for partner approval", beneficiaryType: "student", beneficiaryBase: 42 },
          { description: "Retrofit material estimate prepared", outcomeText: "Prepared bill of materials for 4 classroom repair packages with locally available suppliers identified", beneficiaryType: "student", beneficiaryBase: 35 },
          { description: "Teacher feedback session documented", outcomeText: "Captured facility needs from 12 teachers and mapped issues to retrofit priorities", beneficiaryType: "teacher", beneficiaryBase: 12 },
        ],
      },
      {
        name: "Eastern Water Access Mapping",
        description: "GIS and survey support to map water access constraints and prioritize resilient water points.",
        location: "Eastern Region, Ghana",
        sdgs: [6, 11, 17],
        primarySdg: 6,
        impactMetricName: "Water points mapped",
        impactMetricUnit: "water points",
        livesTouched: 540,
        skills: ["gis-mapping", "water-systems", "survey-analysis"],
        activities: [
          { description: "Water point field survey completed", outcomeText: "Mapped 9 water points and documented operating status, distance from households, and repair needs", beneficiaryType: "community_member", beneficiaryBase: 55 },
          { description: "GIS layer cleaned and reviewed", outcomeText: "Standardized coordinates for 18 community water assets and flagged 3 high-risk access gaps", beneficiaryType: "community_member", beneficiaryBase: 47 },
          { description: "Community access interview notes summarized", outcomeText: "Summarized interview notes from 24 households to support water access prioritization", beneficiaryType: "household", beneficiaryBase: 24 },
        ],
      },
      {
        name: "Eastside Solar Skills Lab",
        description: "Hands-on solar maintenance training and installation readiness support for community technicians.",
        location: "Accra East, Ghana",
        sdgs: [4, 7, 13],
        primarySdg: 7,
        impactMetricName: "Technicians trained",
        impactMetricUnit: "technicians",
        livesTouched: 180,
        skills: ["renewable-energy", "training", "electrical-safety"],
        activities: [
          { description: "Solar maintenance module delivered", outcomeText: "Delivered practical solar maintenance module to 16 community technicians with safety checklist completion", beneficiaryType: "technician", beneficiaryBase: 16 },
          { description: "Training equipment inventory completed", outcomeText: "Verified 22 tools and components for hands-on solar lab use; missing items reported to program lead", beneficiaryType: "technician", beneficiaryBase: 14 },
          { description: "Solar readiness site checklist completed", outcomeText: "Completed readiness checklist for 5 candidate training sites and ranked them for installation practice", beneficiaryType: "community_member", beneficiaryBase: 28 },
        ],
      },
    ],
  },
  {
    name: "East Coast Resilience Network",
    city: "Lagos",
    country: "Nigeria",
    description: "Climate resilience nonprofit supporting coastal communities with risk mapping, nature-based solutions, and cooling infrastructure.",
    contactEmail: "fieldops@eastcoastresilience.example",
    sdgs: [3, 11, 13, 14, 15],
    needs: ["climate-risk-analysis", "field-survey", "community-design", "impact-documentation"],
    projects: [
      {
        name: "Coastal Flood Resilience Assessment",
        description: "Field assessment and engineering recommendations for flood-exposed public facilities.",
        location: "Lagos East Coast, Nigeria",
        sdgs: [11, 13],
        primarySdg: 13,
        impactMetricName: "Facilities assessed",
        impactMetricUnit: "facilities",
        livesTouched: 610,
        skills: ["climate-risk", "civil-engineering", "field-assessment"],
        activities: [
          { description: "Flood risk transect survey completed", outcomeText: "Completed 4 transect walks and documented drainage blockages, elevation concerns, and community risk observations", beneficiaryType: "community_member", beneficiaryBase: 62 },
          { description: "Public facility vulnerability checklist completed", outcomeText: "Assessed 5 public facilities for flood vulnerability and prepared mitigation notes for partner review", beneficiaryType: "community_member", beneficiaryBase: 58 },
          { description: "Drainage improvement concept sketched", outcomeText: "Prepared low-cost drainage improvement concept options for 2 high-priority community sites", beneficiaryType: "household", beneficiaryBase: 31 },
        ],
      },
      {
        name: "Mangrove Restoration Field Survey",
        description: "Volunteer-supported survey work and monitoring plan for community mangrove restoration zones.",
        location: "Lekki Coastal Corridor, Nigeria",
        sdgs: [13, 14, 15],
        primarySdg: 14,
        impactMetricName: "Restoration plots surveyed",
        impactMetricUnit: "plots",
        livesTouched: 260,
        skills: ["environmental-monitoring", "gis-mapping", "field-survey"],
        activities: [
          { description: "Mangrove plot baseline survey completed", outcomeText: "Surveyed 7 restoration plots and captured baseline vegetation, erosion, and access conditions", beneficiaryType: "community_member", beneficiaryBase: 24 },
          { description: "Restoration monitoring template prepared", outcomeText: "Prepared monthly monitoring template for survival rate, water level, and community stewardship tracking", beneficiaryType: "community_group", beneficiaryBase: 6 },
          { description: "Geo-tagged field notes reviewed", outcomeText: "Reviewed geo-tagged field notes and corrected 11 location records for restoration planning", beneficiaryType: "community_member", beneficiaryBase: 18 },
        ],
      },
      {
        name: "Community Cooling Center Design",
        description: "Concept design and operating model support for heat-resilient community cooling spaces.",
        location: "Lagos East, Nigeria",
        sdgs: [3, 7, 11, 13],
        primarySdg: 3,
        impactMetricName: "Cooling center users planned",
        impactMetricUnit: "people",
        livesTouched: 430,
        skills: ["building-design", "renewable-energy", "community-planning"],
        activities: [
          { description: "Cooling center user flow mapped", outcomeText: "Mapped daily user flow and access needs for a community cooling center serving heat-vulnerable residents", beneficiaryType: "community_member", beneficiaryBase: 44 },
          { description: "Passive cooling design review completed", outcomeText: "Reviewed ventilation, shading, and material options for passive cooling concept package", beneficiaryType: "community_member", beneficiaryBase: 39 },
          { description: "Solar backup sizing estimate prepared", outcomeText: "Prepared first-pass solar backup sizing estimate for fans, lighting, and phone charging loads", beneficiaryType: "community_member", beneficiaryBase: 36 },
        ],
      },
    ],
  },
];

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function activityDate(projectIdx: number, activityIdx: number): Date {
  const month = activityIdx % 5;
  const day = 2 + ((projectIdx * 5 + activityIdx * 3) % 24);
  return new Date(2026, month, day, 9 + (activityIdx % 6), 0, 0);
}

async function findOrCreateOrganization(seedOrg: SeedOrg): Promise<number> {
  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.name, seedOrg.name))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(organizations)
      .set({
        description: seedOrg.description,
        city: seedOrg.city,
        country: seedOrg.country,
        primarySdgs: seedOrg.sdgs,
        needs: seedOrg.needs,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, existing[0].id));
    return existing[0].id;
  }

  const [inserted] = await db
    .insert(organizations)
    .values({
      name: seedOrg.name,
      description: seedOrg.description,
      contactEmail: seedOrg.contactEmail,
      city: seedOrg.city,
      country: seedOrg.country,
      primarySdgs: seedOrg.sdgs,
      needs: seedOrg.needs,
      goals: "Provide partner-verified outcomes for BuildSmart Engineering CSR reporting.",
      approvalStatus: "approved",
      approvedAt: new Date("2025-12-10"),
      preferredVerificationMethod: "numeric_entry",
      consentAnonymizedBenchmarks: true,
      consentTimestamp: new Date("2025-12-10"),
      consentVersion: "test-seed-2026",
      verificationRate30d: 0.88,
    })
    .returning({ id: organizations.id });

  return inserted.id;
}

async function findOrCreateVerifierUser(seedOrg: SeedOrg, organizationId: number): Promise<number> {
  const email = `verifier+${seedOrg.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}@buildsmart.example`;
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({ organizationId, userType: "organization", updatedAt: new Date() })
      .where(eq(users.id, existing[0].id));
    return existing[0].id;
  }

  const [inserted] = await db
    .insert(users)
    .values({
      username: email.replace(/[^a-z0-9]+/gi, "_").replace(/_$/, ""),
      email,
      password: "seed_no_login",
      userType: "organization",
      displayName: `${seedOrg.name} Verification Lead`,
      bio: `Seeded verification lead for ${seedOrg.name}.`,
      organizationId,
      dataConsent: true,
      dataConsentDate: new Date("2025-12-10"),
    })
    .returning({ id: users.id });

  return inserted.id;
}

async function findOrCreateProject(seedProject: SeedProject, organizationId: number): Promise<number> {
  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.name, seedProject.name), eq(projects.organizationId, organizationId)))
    .limit(1);

  const values = {
    description: seedProject.description,
    status: "active",
    startDate: new Date("2026-01-05"),
    endDate: new Date("2026-05-31"),
    location: seedProject.location,
    goals: {
      summary: "Generate partner-verified evidence for CSR reporting and assurance readiness.",
      reportingFrameworks: ["GRI 413", "ESRS S3", "ISAE 3000"],
      seedBatch: SEED_BATCH,
    },
    sdgGoals: seedProject.sdgs,
    completionPercentage: 62,
    requiredSkills: seedProject.skills,
    experienceLevel: "intermediate",
    engagementType: "hybrid",
    commitmentType: "project-based",
    projectTotalHours: 120,
    primarySdg: seedProject.primarySdg,
    impactMetricName: seedProject.impactMetricName,
    impactMetricUnit: seedProject.impactMetricUnit,
    livesTouched: seedProject.livesTouched,
    volunteersNeeded: 6,
    totalVolunteerContribution: 70,
    outcomeTemplates: seedProject.activities.map((activity) => ({
      name: activity.description,
      unit: seedProject.impactMetricUnit,
    })),
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    await db.update(projects).set(values).where(eq(projects.id, existing[0].id));
    return existing[0].id;
  }

  const [inserted] = await db
    .insert(projects)
    .values({
      name: seedProject.name,
      organizationId,
      ...values,
    })
    .returning({ id: projects.id });

  return inserted.id;
}

async function getBuildSmartEmployees(): Promise<Array<{ userId: number; name: string; role: string }>> {
  const profiles = await db
    .select({
      userId: volunteerProfiles.userId,
      name: volunteerProfiles.volunteerName,
      role: volunteerProfiles.jobTitleAtCompany,
    })
    .from(volunteerProfiles)
    .where(eq(volunteerProfiles.employerId, BUILDSMART_CSR_PARTNER_ID))
    .limit(24);

  if (profiles.length < 6) {
    throw new Error(
      `Need at least 6 BuildSmart volunteer profiles, found ${profiles.length}. Run ALLOW_TEST_SEED=true npx tsx scripts/seed-gfa-buildsmart-test-data.ts first.`
    );
  }

  return profiles.map((profile, idx) => ({
    userId: profile.userId,
    name: profile.name || `BuildSmart Employee ${idx + 1}`,
    role: profile.role || "BuildSmart CSR Volunteer",
  }));
}

async function ensureAssignment(projectId: number, employee: { userId: number; role: string }) {
  const existing = await db
    .select({ id: projectAssignments.id })
    .from(projectAssignments)
    .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.volunteerId, employee.userId)))
    .limit(1);

  if (existing.length > 0) return false;

  await db.insert(projectAssignments).values({
    projectId,
    volunteerId: employee.userId,
    role: employee.role,
    status: "active",
    assignedAt: new Date("2025-12-18"),
    respondedAt: new Date("2025-12-19"),
    hoursCommitted: 20,
    notes: `Seeded: ${SEED_BATCH}`,
  });

  return true;
}

async function ensureRelationship(userId: number, organizationId: number) {
  const existing = await db
    .select({ id: volunteerOrganizationRelationships.id })
    .from(volunteerOrganizationRelationships)
    .where(and(
      eq(volunteerOrganizationRelationships.volunteerId, userId),
      eq(volunteerOrganizationRelationships.organizationId, organizationId)
    ))
    .limit(1);

  if (existing.length > 0) return false;

  await db.insert(volunteerOrganizationRelationships).values({
    volunteerId: userId,
    organizationId,
    relationshipType: "active",
    firstContactAt: new Date("2025-12-18"),
    lastActivityAt: new Date("2026-05-20"),
    totalApplications: 1,
    totalProjectsCompleted: 0,
    isActive: true,
    notes: `Seeded: ${SEED_BATCH}`,
  });

  return true;
}

async function main() {
  console.log("\nBuildSmart multi-org CSR evidence seed");
  console.log(`Batch: ${SEED_BATCH}\n`);

  const existingActivity = await db
    .select({ id: volunteerActivities.id })
    .from(volunteerActivities)
    .where(eq(volunteerActivities.deviceId, SEED_BATCH))
    .limit(1);

  const employees = await getBuildSmartEmployees();
  const seededProjects: Array<{ id: number; orgId: number; verifierUserId: number; definition: SeedProject; projectIdx: number }> = [];

  let createdOrUpdatedOrgs = 0;
  let createdOrUpdatedProjects = 0;
  let createdAssignments = 0;
  let createdRelationships = 0;

  for (const seedOrg of SEED_ORGS) {
    const organizationId = await findOrCreateOrganization(seedOrg);
    const verifierUserId = await findOrCreateVerifierUser(seedOrg, organizationId);
    createdOrUpdatedOrgs++;

    for (const seedProject of seedOrg.projects) {
      const projectId = await findOrCreateProject(seedProject, organizationId);
      const projectIdx = seededProjects.length;
      seededProjects.push({ id: projectId, orgId: organizationId, verifierUserId, definition: seedProject, projectIdx });
      createdOrUpdatedProjects++;

      const projectEmployees = [employees[(projectIdx * 3) % employees.length], employees[(projectIdx * 3 + 1) % employees.length], employees[(projectIdx * 3 + 2) % employees.length]];
      for (const employee of projectEmployees) {
        if (await ensureAssignment(projectId, employee)) createdAssignments++;
        if (await ensureRelationship(employee.userId, organizationId)) createdRelationships++;
      }
    }
  }

  console.log(`Organizations ready: ${createdOrUpdatedOrgs}`);
  console.log(`Projects ready:      ${createdOrUpdatedProjects}`);
  console.log(`Assignments created: ${createdAssignments}`);
  console.log(`Relationships added: ${createdRelationships}`);

  if (existingActivity.length > 0) {
    console.log("\nActivity rows for this seed already exist. Organization/project metadata was refreshed; no duplicate activities inserted.");
    process.exit(0);
  }

  const activityRows: any[] = [];
  const activityOrgMap: Array<{ orgId: number; verifierUserId: number }> = [];

  seededProjects.forEach((project, projectIdx) => {
    const projectEmployees = [employees[(projectIdx * 3) % employees.length], employees[(projectIdx * 3 + 1) % employees.length], employees[(projectIdx * 3 + 2) % employees.length]];

    for (let activityIdx = 0; activityIdx < 6; activityIdx++) {
      const employee = projectEmployees[activityIdx % projectEmployees.length];
      const template = project.definition.activities[activityIdx % project.definition.activities.length];
      const status = activityIdx < 5 ? "approved" : "pending";
      const date = activityDate(projectIdx, activityIdx);
      const submittedAt = addDays(date, activityIdx % 2);
      const verifiedAt = addDays(submittedAt, 1 + ((projectIdx + activityIdx) % 4));
      const hours = 3 + ((projectIdx + activityIdx) % 5);

      activityRows.push({
        userId: employee.userId,
        projectId: project.id,
        hours,
        date,
        description: template.description,
        outcomeText: template.outcomeText,
        outcomes: template.description,
        verificationStatus: status,
        role: activityIdx % 3 === 0 ? "lead" : "support",
        sdgTags: project.definition.sdgs,
        sdgMappingMethod: "manual",
        loggedByType: "self",
        skillsApplied: project.definition.skills.slice(0, 2),
        beneficiaryCount: status === "approved" ? template.beneficiaryBase + activityIdx : null,
        beneficiaryType: status === "approved" ? template.beneficiaryType : null,
        verifiedBy: status === "approved" ? project.verifierUserId : null,
        verifiedAt: status === "approved" ? verifiedAt : null,
        verifierName: status === "approved" ? "Partner Verification Lead" : null,
        verifierRole: status === "approved" ? "Authorized NGO Verifier" : null,
        createdAt: submittedAt,
        deviceId: SEED_BATCH,
        deviceType: activityIdx % 2 === 0 ? "desktop" : "mobile",
        localTimeOfDay: activityIdx % 2 === 0 ? "morning" : "afternoon",
      });
      activityOrgMap.push({ orgId: project.orgId, verifierUserId: project.verifierUserId });
    }
  });

  const verifiedOutputRows: any[] = [];
  const approvedRecords: Array<{ id: number; projectId: number; userId: number; hours: number; verifiedAt: Date; orgId: number; verifierUserId: number }> = [];
  let insertedActivities = 0;

  for (let i = 0; i < activityRows.length; i += BATCH_SIZE) {
    const batch = activityRows.slice(i, i + BATCH_SIZE);
    const inserted = await db
      .insert(volunteerActivities)
      .values(batch)
      .returning({
        id: volunteerActivities.id,
        projectId: volunteerActivities.projectId,
        hours: volunteerActivities.hours,
        userId: volunteerActivities.userId,
        verificationStatus: volunteerActivities.verificationStatus,
        verifiedAt: volunteerActivities.verifiedAt,
      });

    insertedActivities += inserted.length;

    inserted.forEach((row, batchIdx) => {
      if (row.verificationStatus !== "approved" || !row.verifiedAt || !row.projectId || !row.userId) return;

      const sourceIdx = i + batchIdx;
      const orgMeta = activityOrgMap[sourceIdx];

      approvedRecords.push({
        id: row.id,
        projectId: row.projectId,
        userId: row.userId,
        hours: row.hours ?? 0,
        verifiedAt: new Date(row.verifiedAt as any),
        orgId: orgMeta.orgId,
        verifierUserId: orgMeta.verifierUserId,
      });

      verifiedOutputRows.push({
        activityId: row.id,
        partnerId: BUILDSMART_CSR_PARTNER_ID,
        projectId: row.projectId,
        outputType: "hours",
        outputValue: Math.max(1, Math.round(row.hours ?? 1)),
        verificationStatus: "verified",
        verifiedBy: orgMeta.verifierUserId,
        verifiedAt: row.verifiedAt,
        evidence: {
          notes: "Partner-verified BuildSmart CSR evidence seed",
          seedBatch: SEED_BATCH,
        },
        auditTrail: {
          action: "approved",
          timestamp: row.verifiedAt,
          reviewerId: orgMeta.verifierUserId,
          seedBatch: SEED_BATCH,
        },
      });
    });
  }

  let insertedOutputs = 0;
  for (let i = 0; i < verifiedOutputRows.length; i += BATCH_SIZE) {
    const batch = verifiedOutputRows.slice(i, i + BATCH_SIZE);
    await db.insert(verifiedOutputs).values(batch);
    insertedOutputs += batch.length;
  }

  const auditLogRows = approvedRecords.map((record) => ({
    activityId: record.id,
    projectId: record.projectId,
    organizationId: record.orgId,
    action: "approved",
    previousStatus: "pending",
    newStatus: "approved",
    performedBy: record.verifierUserId,
    performedByRole: "organization",
    volunteerId: record.userId,
    deviceId: SEED_BATCH,
    changeDetails: { hours: record.hours, seedBatch: SEED_BATCH, autoVerified: true },
    evidenceSnapshot: { source: "BuildSmart CSR test data", seedBatch: SEED_BATCH },
    createdAt: record.verifiedAt,
  }));

  let insertedAuditLogs = 0;
  for (let i = 0; i < auditLogRows.length; i += BATCH_SIZE) {
    const batch = auditLogRows.slice(i, i + BATCH_SIZE);
    await db.insert(verificationAuditLog).values(batch);
    insertedAuditLogs += batch.length;
  }

  const verifiedHours = activityRows
    .filter((row) => row.verificationStatus === "approved")
    .reduce((sum, row) => sum + (row.hours ?? 0), 0);

  console.log("\nSeed complete");
  console.log(`Activity logs inserted:      ${insertedActivities}`);
  console.log(`Verified evidence rows:      ${insertedOutputs}`);
  console.log(`Verification audit rows:     ${insertedAuditLogs}`);
  console.log(`Approved verified hours:     ${verifiedHours.toFixed(1)}h`);
  console.log(`CSR partner ID:              ${BUILDSMART_CSR_PARTNER_ID}`);
  console.log(`Organizations added/updated: ${SEED_ORGS.map((org) => org.name).join(", ")}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err?.message ?? err);
  process.exit(1);
});
