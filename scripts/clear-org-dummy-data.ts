// Script to clear dummy/seeded data for a specific organization
// Run with: npx tsx scripts/clear-org-dummy-data.ts <organizationId>

import { db } from "../server/db";
import {
  volunteerActivities,
  projectImpacts,
  projectAssignments,
  projects,
  tasks,
  users
} from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

async function clearOrgDummyData(organizationId: number) {
  console.log(`🧹 Clearing dummy data for organization ${organizationId}...`);

  try {
    // Get the organization user
    const [orgUser] = await db.select().from(users).where(eq(users.id, organizationId));
    if (!orgUser) {
      console.error(`❌ Organization user with ID ${organizationId} not found`);
      process.exit(1);
    }
    console.log(`Organization: ${orgUser.displayName || orgUser.username}`);

    // Get organization's projects
    const orgProjects = await db.select().from(projects).where(eq(projects.organizationId, organizationId));
    const projectIds = orgProjects.map(p => p.id);

    console.log(`Found ${orgProjects.length} projects for this organization`);

    if (projectIds.length === 0) {
      console.log("No projects found - nothing to clear");
      process.exit(0);
    }

    // Clear volunteer activities for these projects
    const deletedActivities = await db.delete(volunteerActivities)
      .where(inArray(volunteerActivities.projectId, projectIds))
      .returning();
    console.log(`✅ Deleted ${deletedActivities.length} volunteer activities`);

    // Clear project impacts for these projects
    const deletedImpacts = await db.delete(projectImpacts)
      .where(inArray(projectImpacts.projectId, projectIds))
      .returning();
    console.log(`✅ Deleted ${deletedImpacts.length} project impacts`);

    // Clear project assignments for these projects
    const deletedAssignments = await db.delete(projectAssignments)
      .where(inArray(projectAssignments.projectId, projectIds))
      .returning();
    console.log(`✅ Deleted ${deletedAssignments.length} project assignments`);

    // Clear tasks for these projects
    const deletedTasks = await db.delete(tasks)
      .where(inArray(tasks.projectId, projectIds))
      .returning();
    console.log(`✅ Deleted ${deletedTasks.length} tasks`);

    console.log(`\n✨ All dummy data cleared for organization ${organizationId}`);
    console.log("The KPIs will now show real values (likely zeros until real data is entered)");

  } catch (error) {
    console.error("❌ Error clearing dummy data:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Get organizationId from command line
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: npx tsx scripts/clear-org-dummy-data.ts <organizationId>");
  console.log("Example: npx tsx scripts/clear-org-dummy-data.ts 5");
  process.exit(1);
}

const organizationId = parseInt(args[0]);
if (isNaN(organizationId)) {
  console.error("Invalid organizationId - must be a number");
  process.exit(1);
}

clearOrgDummyData(organizationId);
