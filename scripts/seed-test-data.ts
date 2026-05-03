import { db } from "../server/db";
import { users, organizations, organizationMembers } from "../shared/schema";
import { getFirebaseAuth } from "../server/lib/firebase-admin";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "alhonorat@gmail.com";
const ADMIN_PASSWORD = "P00!t1m3";
const TEST_PASSWORD = "Test1234!";

const VOLUNTEERS = [
  { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, displayName: "Al Honorat", username: "alhonorat", isAdmin: true,
    skills: ["leadership", "strategy", "csr"], bio: "Platform administrator and lead volunteer." },
  { email: "maria.garcia@test.synerxus.com", password: TEST_PASSWORD, displayName: "Maria Garcia", username: "maria_garcia",
    skills: ["teaching", "spanish", "youth-mentoring"], bio: "Bilingual educator passionate about literacy programs." },
  { email: "james.kim@test.synerxus.com", password: TEST_PASSWORD, displayName: "James Kim", username: "james_kim",
    skills: ["software-development", "data-analysis", "tutoring"], bio: "Software engineer offering free coding classes." },
  { email: "aisha.patel@test.synerxus.com", password: TEST_PASSWORD, displayName: "Aisha Patel", username: "aisha_patel",
    skills: ["healthcare", "first-aid", "public-health"], bio: "Registered nurse focused on community health drives." },
  { email: "david.brown@test.synerxus.com", password: TEST_PASSWORD, displayName: "David Brown", username: "david_brown",
    skills: ["construction", "carpentry", "project-management"], bio: "Builder helping with home repairs for the elderly." },
  { email: "sophia.nguyen@test.synerxus.com", password: TEST_PASSWORD, displayName: "Sophia Nguyen", username: "sophia_nguyen",
    skills: ["graphic-design", "marketing", "social-media"], bio: "Designer creating visuals for non-profit campaigns." },
  { email: "lucas.silva@test.synerxus.com", password: TEST_PASSWORD, displayName: "Lucas Silva", username: "lucas_silva",
    skills: ["agriculture", "permaculture", "environmental"], bio: "Urban farmer running community garden workshops." },
  { email: "emma.johnson@test.synerxus.com", password: TEST_PASSWORD, displayName: "Emma Johnson", username: "emma_johnson",
    skills: ["legal", "policy", "advocacy"], bio: "Pro bono lawyer advising small NGOs on compliance." },
  { email: "noah.williams@test.synerxus.com", password: TEST_PASSWORD, displayName: "Noah Williams", username: "noah_williams",
    skills: ["sports-coaching", "youth-development", "fitness"], bio: "Coach running after-school sports programs." },
  { email: "olivia.chen@test.synerxus.com", password: TEST_PASSWORD, displayName: "Olivia Chen", username: "olivia_chen",
    skills: ["accounting", "finance", "bookkeeping"], bio: "CPA helping non-profits with financial reporting." },
];

const ORGS = [
  {
    name: "Bright Futures Foundation", contactEmail: "contact@brightfutures.test.synerxus.com",
    description: "Provides after-school education and mentoring for underserved youth.",
    website: "https://brightfutures.test.synerxus.com", city: "Austin", country: "USA",
    primarySdgs: [4, 10, 17], needs: ["tutors", "mentors", "fundraisers"],
    goals: "Reduce education gap for low-income students by 30% in 5 years.",
    admin: { email: "admin@brightfutures.test.synerxus.com", displayName: "Sarah Mitchell", username: "sarah_brightfutures" },
  },
  {
    name: "GreenEarth Coalition", contactEmail: "contact@greenearth.test.synerxus.com",
    description: "Community-led environmental conservation and reforestation initiatives.",
    website: "https://greenearth.test.synerxus.com", city: "Portland", country: "USA",
    primarySdgs: [13, 15, 11], needs: ["volunteers", "field-workers", "researchers"],
    goals: "Plant 1M trees and restore 50 wetland sites by 2030.",
    admin: { email: "admin@greenearth.test.synerxus.com", displayName: "Rajesh Kumar", username: "rajesh_greenearth" },
  },
  {
    name: "HealthBridge Network", contactEmail: "contact@healthbridge.test.synerxus.com",
    description: "Mobile clinics and health education for rural and underserved communities.",
    website: "https://healthbridge.test.synerxus.com", city: "Denver", country: "USA",
    primarySdgs: [3, 5, 10], needs: ["nurses", "doctors", "health-educators"],
    goals: "Deliver primary care to 100,000 rural residents annually.",
    admin: { email: "admin@healthbridge.test.synerxus.com", displayName: "Linda Park", username: "linda_healthbridge" },
  },
];

const CORPORATE = {
  name: "BuildSmart Industries", contactEmail: "csr@buildsmart.test.synerxus.com",
  description: "Sustainable construction company committed to community impact through employee volunteering.",
  website: "https://buildsmart.test.synerxus.com", city: "Seattle", country: "USA",
  primarySdgs: [9, 11, 13], needs: ["skills-based-volunteering", "team-events"],
  goals: "10,000 employee volunteer hours and $1M social impact ROI by 2027.",
  admin: { email: "csr-admin@buildsmart.test.synerxus.com", displayName: "Michael Torres", username: "michael_buildsmart" },
};

async function ensureFirebaseUser(auth: any, email: string, password: string, displayName: string): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { password, displayName, emailVerified: true });
    console.log(`  [Firebase] updated ${email} -> ${existing.uid}`);
    return existing.uid;
  } catch (e: any) {
    if (e?.code === "auth/user-not-found") {
      const created = await auth.createUser({ email, password, displayName, emailVerified: true });
      console.log(`  [Firebase] created ${email} -> ${created.uid}`);
      return created.uid;
    }
    throw e;
  }
}

async function upsertDbUser(data: any) {
  const existing = await db.select().from(users).where(eq(users.email, data.email));
  if (existing.length > 0) {
    const updated = await db.update(users).set({
      firebaseUid: data.firebaseUid,
      username: data.username,
      displayName: data.displayName,
      userType: data.userType,
      organizationId: data.organizationId,
      isAdmin: data.isAdmin ?? false,
      skills: data.skills,
      bio: data.bio,
      dataConsent: true,
      dataConsentDate: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, existing[0].id)).returning();
    console.log(`  [DB] updated user ${data.email} -> id ${updated[0].id}`);
    return updated[0];
  }
  const inserted = await db.insert(users).values({
    firebaseUid: data.firebaseUid,
    username: data.username,
    email: data.email,
    displayName: data.displayName,
    userType: data.userType,
    organizationId: data.organizationId,
    isAdmin: data.isAdmin ?? false,
    skills: data.skills,
    bio: data.bio,
    dataConsent: true,
    dataConsentDate: new Date(),
  }).returning();
  console.log(`  [DB] created user ${data.email} -> id ${inserted[0].id}`);
  return inserted[0];
}

async function upsertOrg(data: any) {
  const existing = await db.select().from(organizations).where(eq(organizations.name, data.name));
  if (existing.length > 0) {
    const updated = await db.update(organizations).set({
      ...data, approvalStatus: "approved", updatedAt: new Date(),
    }).where(eq(organizations.id, existing[0].id)).returning();
    console.log(`  [DB] updated org ${data.name} -> id ${updated[0].id}`);
    return updated[0];
  }
  const inserted = await db.insert(organizations).values({
    ...data, approvalStatus: "approved",
  }).returning();
  console.log(`  [DB] created org ${data.name} -> id ${inserted[0].id}`);
  return inserted[0];
}

async function ensureOrgMember(orgId: number, userId: number) {
  const existing = await db.select().from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));
  if (existing.find(m => m.organizationId === orgId)) return;
  await db.insert(organizationMembers).values({
    organizationId: orgId, userId, role: "admin",
    canApproveHours: true, canApproveApplications: true,
    canManageProjects: true, canManageMembers: true,
    canViewReports: true, canEditOrganization: true,
    status: "active", acceptedAt: new Date(),
  });
  console.log(`  [DB] linked user ${userId} as admin of org ${orgId}`);
}

async function main() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase Admin SDK not initialized — check FIREBASE_* env vars.");
  }

  console.log("\n=== Seeding volunteers ===");
  for (const v of VOLUNTEERS) {
    const uid = await ensureFirebaseUser(auth, v.email, v.password, v.displayName);
    await upsertDbUser({
      firebaseUid: uid, username: v.username, email: v.email,
      displayName: v.displayName, userType: "volunteer",
      isAdmin: v.isAdmin === true, skills: v.skills, bio: v.bio,
    });
  }

  console.log("\n=== Seeding NGO organizations ===");
  for (const org of ORGS) {
    const { admin: adminInfo, ...orgData } = org;
    const dbOrg = await upsertOrg(orgData);
    const uid = await ensureFirebaseUser(auth, adminInfo.email, TEST_PASSWORD, adminInfo.displayName);
    const dbUser = await upsertDbUser({
      firebaseUid: uid, username: adminInfo.username, email: adminInfo.email,
      displayName: adminInfo.displayName, userType: "organization",
      organizationId: dbOrg.id, bio: `Administrator at ${org.name}.`,
    });
    await ensureOrgMember(dbOrg.id, dbUser.id);
  }

  console.log("\n=== Seeding corporate organization ===");
  const { admin: corpAdminInfo, ...corpData } = CORPORATE;
  const dbCorp = await upsertOrg(corpData);
  const corpUid = await ensureFirebaseUser(auth, corpAdminInfo.email, TEST_PASSWORD, corpAdminInfo.displayName);
  const corpUser = await upsertDbUser({
    firebaseUid: corpUid, username: corpAdminInfo.username, email: corpAdminInfo.email,
    displayName: corpAdminInfo.displayName, userType: "corporate-partner",
    organizationId: dbCorp.id, bio: `CSR Lead at ${CORPORATE.name}.`,
  });
  await ensureOrgMember(dbCorp.id, corpUser.id);

  console.log("\n=== Summary ===");
  const userCount = await db.select().from(users);
  const orgCount = await db.select().from(organizations);
  console.log(`Total users: ${userCount.length}`);
  console.log(`Total organizations: ${orgCount.length}`);
  console.log(`\nAdministrator: ${ADMIN_EMAIL} (password: ${ADMIN_PASSWORD})`);
  console.log(`Test password for all other accounts: ${TEST_PASSWORD}`);
  process.exit(0);
}

main().catch(err => {
  console.error("Seed failed:", err?.cause?.message || err?.message || err);
  process.exit(1);
});
