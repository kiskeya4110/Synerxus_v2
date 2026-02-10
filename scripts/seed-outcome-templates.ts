/**
 * Seed Outcome Templates
 * Populates outcomeTemplates on projects 16, 17, 18, 20
 */

import { pool } from "../server/db";

const PROJECT_TEMPLATES: Record<number, Array<{ name: string; unit: string; sdg: number; icon: string; sortOrder: number }>> = {
  // Project 16 — Youth Literacy (SDGs 4, 10)
  16: [
    { name: "Students Tutored", unit: "students", sdg: 4, icon: "📚", sortOrder: 1 },
    { name: "Reading Sessions Held", unit: "sessions", sdg: 4, icon: "📖", sortOrder: 2 },
    { name: "Books Distributed", unit: "books", sdg: 4, icon: "📕", sortOrder: 3 },
    { name: "Youth Mentored", unit: "youth", sdg: 10, icon: "🤝", sortOrder: 4 },
  ],
  // Project 17 — iDream Health (SDGs 3, 10, 17)
  17: [
    { name: "Health Screenings Completed", unit: "screenings", sdg: 3, icon: "🏥", sortOrder: 1 },
    { name: "Wellness Sessions Held", unit: "sessions", sdg: 3, icon: "💪", sortOrder: 2 },
    { name: "Families Reached", unit: "families", sdg: 10, icon: "👨‍👩‍👧‍👦", sortOrder: 3 },
    { name: "Youth Counseled", unit: "youth", sdg: 17, icon: "💬", sortOrder: 4 },
  ],
  // Project 18 — Skills for Success (SDGs 4, 8, 10, 17)
  18: [
    { name: "Job Training Sessions Held", unit: "sessions", sdg: 8, icon: "💼", sortOrder: 1 },
    { name: "Youth Trained", unit: "youth", sdg: 4, icon: "🎓", sortOrder: 2 },
    { name: "Business Plans Created", unit: "plans", sdg: 8, icon: "📋", sortOrder: 3 },
    { name: "Workshops Conducted", unit: "workshops", sdg: 17, icon: "🏫", sortOrder: 4 },
  ],
  // Project 20 — Back to School (SDGs 1, 2, 3, 4)
  20: [
    { name: "Funds Raised", unit: "dollars", sdg: 1, icon: "💰", sortOrder: 1 },
    { name: "School Supply Kits Distributed", unit: "kits", sdg: 4, icon: "🎒", sortOrder: 2 },
    { name: "Students Supported", unit: "students", sdg: 4, icon: "👩‍🎓", sortOrder: 3 },
    { name: "Families Reached", unit: "families", sdg: 2, icon: "👨‍👩‍👧‍👦", sortOrder: 4 },
  ],
};

async function seedOutcomeTemplates() {
  const client = await pool.connect();

  try {
    console.log("Seeding outcome templates for projects...");

    for (const [projectId, templates] of Object.entries(PROJECT_TEMPLATES)) {
      const result = await client.query(
        `UPDATE projects SET outcome_templates = $1 WHERE id = $2 RETURNING id, name`,
        [JSON.stringify(templates), parseInt(projectId)]
      );

      if (result.rows.length > 0) {
        console.log(`  ✓ Project ${projectId} (${result.rows[0].name}): ${templates.length} templates set`);
      } else {
        console.log(`  ✗ Project ${projectId}: not found`);
      }
    }

    console.log("Done!");
  } catch (err) {
    console.error("Error seeding outcome templates:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedOutcomeTemplates();
