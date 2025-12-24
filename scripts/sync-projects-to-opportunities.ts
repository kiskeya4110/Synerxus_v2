/**
 * Script to sync all existing projects to opportunities table
 * Run with: npx tsx scripts/sync-projects-to-opportunities.ts
 */
import { db } from "../server/db";
import { projects, opportunities } from "@shared/schema";
import { eq } from "drizzle-orm";

async function syncProjectToOpportunity(project: any): Promise<void> {
  const [existingOpportunity] = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.projectId, project.id))
    .limit(1);

  const opportunityData = {
    title: project.name,
    description: project.description || "",
    organizationId: project.organizationId!,
    projectId: project.id,
    requiredSkills: project.requiredSkills || [],
    optionalSkills: project.optionalSkills || [],
    location: project.location || "",
    isRemote: project.engagementType === "remote",
    engagementType: project.engagementType || null,
    commitmentType: project.commitmentType || "project-based",
    ongoingHoursPerWeek: project.ongoingHoursPerWeek || null,
    projectTotalHours: project.projectTotalHours || null,
    startDate: project.startDate || null,
    endDate: project.endDate || null,
    status: project.status?.toLowerCase() === 'active' || project.status?.toLowerCase() === 'in-progress' || project.status?.toLowerCase() === 'in progress' ? 'open' : 'closed',
    sdgGoals: project.sdgGoals || [],
    primarySdg: project.primarySdg || null,
    impactMetricName: project.impactMetricName || null,
    impactMetricUnit: project.impactMetricUnit || null,
    category: project.primarySdg ? `SDG ${project.primarySdg}` : null,
    isUrgent: false,
    updatedAt: new Date(),
  };

  if (existingOpportunity) {
    await db
      .update(opportunities)
      .set(opportunityData)
      .where(eq(opportunities.id, existingOpportunity.id));
    console.log(`Updated opportunity ${existingOpportunity.id} for project ${project.id}: ${project.name}`);
  } else {
    const [newOpportunity] = await db
      .insert(opportunities)
      .values({
        ...opportunityData,
        createdAt: new Date(),
      })
      .returning();
    console.log(`Created opportunity ${newOpportunity.id} for project ${project.id}: ${project.name}`);
  }
}

async function main() {
  console.log("Starting project to opportunity sync...");

  const allProjects = await db.select().from(projects);
  console.log(`Found ${allProjects.length} projects to sync`);

  let synced = 0;
  let errors = 0;

  for (const project of allProjects) {
    try {
      await syncProjectToOpportunity(project);
      synced++;
    } catch (err) {
      console.error(`Failed to sync project ${project.id}:`, err);
      errors++;
    }
  }

  console.log(`\nSync complete!`);
  console.log(`Total: ${allProjects.length}, Synced: ${synced}, Errors: ${errors}`);
  process.exit(0);
}

main().catch(err => {
  console.error("Sync failed:", err);
  process.exit(1);
});
