/**
 * Script to link a volunteer/employee to a corporate partner
 * Run with: npx tsx scripts/link-employee-to-employer.ts
 */
import { db } from "../server/db";
import { users, csrPartners, employeeEngagement } from "@shared/schema";
import { eq } from "drizzle-orm";

async function linkEmployeeToEmployer() {
  // Find Fatima
  const [fatima] = await db
    .select()
    .from(users)
    .where(eq(users.id, 2072))
    .limit(1);

  if (!fatima) {
    console.log("Fatima not found");
    return;
  }
  console.log("Found Fatima:", fatima.displayName, fatima.email);

  // Find the CSR Partner for BuildSmart (user 2073)
  const [csrPartner] = await db
    .select()
    .from(csrPartners)
    .where(eq(csrPartners.userId, 2073))
    .limit(1);

  if (!csrPartner) {
    console.log("CSR Partner not found for user 2073");
    return;
  }
  console.log("Found CSR Partner:", csrPartner.companyName, "ID:", csrPartner.id);

  // First, add employer_id column if it doesn't exist
  try {
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS employer_id INTEGER REFERENCES csr_partners(id)`);
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS department_name TEXT`);
    await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title_at_company TEXT`);
    console.log("Columns added or already exist");
  } catch (err) {
    console.log("Columns might already exist:", err);
  }

  // Link Fatima to the employer
  await db.execute(`UPDATE users SET employer_id = ${csrPartner.id}, department_name = 'Engineering', job_title_at_company = 'Civil Engineer' WHERE id = 2072`);

  console.log(`Successfully linked Fatima (ID: 2072) to ${csrPartner.companyName} (CSR Partner ID: ${csrPartner.id})`);

  // Also add to employee_engagement table for tracking
  try {
    await db.insert(employeeEngagement).values({
      partnerId: csrPartner.id,
      employeeEmail: fatima.email,
      employeeName: fatima.displayName,
      projectId: null,
      hoursLogged: 0,
      status: "active",
    }).onConflictDoNothing();
    console.log("Added to employee_engagement table");
  } catch (err) {
    console.log("Employee engagement entry might already exist:", err);
  }

  // Verify
  const result = await db.execute(`SELECT id, display_name, employer_id, department_name, job_title_at_company FROM users WHERE id = 2072`);
  console.log("Updated Fatima:", result.rows[0]);
}

linkEmployeeToEmployer()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
