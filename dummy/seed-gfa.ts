// Green Future Alliance (GFA) test data seed
// Adds GFA org, 10 volunteers, 5 projects, and rich impact metrics
// Does NOT wipe existing data — safe to run alongside seed-data.ts output
// Run with: npx tsx dummy/seed-gfa.ts

import { db } from "../server/db";
import {
  users, organizations, projects, tasks, volunteerActivities,
  impactMetrics, projectImpacts, projectAssignments, volunteerProfiles,
  volunteers, matchableOrganizations,
} from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedGFA() {
  console.log("🌿 Seeding Green Future Alliance test data...");

  try {
    // ── 1. Organization ──────────────────────────────────────────────────────
    console.log("\n🏢 Creating Green Future Alliance organization...");
    const [gfa] = await db.insert(organizations).values({
      name: "Green Future Alliance",
      description:
        "A global coalition dedicated to environmental conservation, climate action, and sustainable community development across emerging economies.",
      website: "https://greenfuturealliance.org",
      contactEmail: "info@greenfuturealliance.org",
      contactPhone: "+1-555-0450",
      address: "250 Sustainability Drive, Portland, OR 97201",
      primarySdgs: [13, 15, 7, 6, 11],
      needs: ["Environmental Science", "Community Organizing", "Data Analysis", "Project Management", "Fundraising"],
      approvalStatus: "approved",
    }).returning();

    console.log(`   ✓ Organization created (id: ${gfa.id})`);

    // ── 2. GFA Admin User ────────────────────────────────────────────────────
    const [gfaAdmin] = await db.insert(users).values({
      username: "gfa_admin",
      email: "admin@greenfuturealliance.org",
      password: "firebase_auth_managed",
      userType: "organization",
      displayName: "GFA Admin",
      organizationId: gfa.id,
    }).returning();

    // ── 3. Volunteer Users ───────────────────────────────────────────────────
    console.log("\n👥 Creating 10 volunteer users...");

    const volunteerData = [
      {
        username: "alex_green",
        email: "alex.green@gfavolunteers.org",
        displayName: "Alex Green",
        bio: "Environmental engineer passionate about clean energy and reforestation.",
        skills: ["Environmental Science", "Engineering", "Project Management"],
        location: "Seattle, WA",
        weeklyAvailability: 18,
        sdgGoals: [13, 7, 15],
        preferredCauses: ["Climate Action", "Clean Energy"],
      },
      {
        username: "priya_sharma",
        email: "priya.sharma@gfavolunteers.org",
        displayName: "Priya Sharma",
        bio: "Data scientist using analytics to drive environmental impact measurement.",
        skills: ["Data Analysis", "Research", "Machine Learning"],
        location: "San Francisco, CA",
        weeklyAvailability: 12,
        sdgGoals: [13, 9, 11],
        preferredCauses: ["Climate Data", "Sustainability Metrics"],
      },
      {
        username: "carlos_reyes",
        email: "carlos.reyes@gfavolunteers.org",
        displayName: "Carlos Reyes",
        bio: "Community organizer with 8 years of experience in Latin American conservation.",
        skills: ["Community Organizing", "Leadership", "Spanish Translation"],
        location: "Miami, FL",
        weeklyAvailability: 20,
        sdgGoals: [15, 13, 1],
        preferredCauses: ["Biodiversity", "Community Development"],
      },
      {
        username: "yuki_tanaka",
        email: "yuki.tanaka@gfavolunteers.org",
        displayName: "Yuki Tanaka",
        bio: "Urban planner focused on green infrastructure and sustainable cities.",
        skills: ["Urban Planning", "Architecture", "Sustainability"],
        location: "Portland, OR",
        weeklyAvailability: 15,
        sdgGoals: [11, 13, 9],
        preferredCauses: ["Smart Cities", "Green Infrastructure"],
      },
      {
        username: "amara_osei",
        email: "amara.osei@gfavolunteers.org",
        displayName: "Amara Osei",
        bio: "Agronomist and food systems advocate working on sustainable agriculture.",
        skills: ["Agriculture", "Training", "Community Organizing"],
        location: "Atlanta, GA",
        weeklyAvailability: 16,
        sdgGoals: [2, 15, 13],
        preferredCauses: ["Food Security", "Land Conservation"],
      },
      {
        username: "sophie_mueller",
        email: "sophie.mueller@gfavolunteers.org",
        displayName: "Sophie Mueller",
        bio: "Environmental lawyer and policy advocate for climate legislation.",
        skills: ["Legal", "Policy Research", "Communication"],
        location: "Washington, DC",
        weeklyAvailability: 10,
        sdgGoals: [13, 16, 17],
        preferredCauses: ["Climate Policy", "Environmental Justice"],
      },
      {
        username: "kwame_asante",
        email: "kwame.asante@gfavolunteers.org",
        displayName: "Kwame Asante",
        bio: "Renewable energy specialist with expertise in solar micro-grids for off-grid communities.",
        skills: ["Electrical", "Engineering", "Training"],
        location: "Denver, CO",
        weeklyAvailability: 14,
        sdgGoals: [7, 13, 1],
        preferredCauses: ["Clean Energy", "Poverty Reduction"],
      },
      {
        username: "fatima_al_rashid",
        email: "fatima.alrashid@gfavolunteers.org",
        displayName: "Fatima Al-Rashid",
        bio: "Water resource engineer specializing in drought mitigation and watershed management.",
        skills: ["Environmental Science", "Engineering", "Data Analysis"],
        location: "Phoenix, AZ",
        weeklyAvailability: 20,
        sdgGoals: [6, 13, 15],
        preferredCauses: ["Water Conservation", "Drought Management"],
      },
      {
        username: "lena_novak",
        email: "lena.novak@gfavolunteers.org",
        displayName: "Lena Novak",
        bio: "Science communicator and educator helping communities understand climate change.",
        skills: ["Teaching", "Writing", "Communication"],
        location: "Boston, MA",
        weeklyAvailability: 12,
        sdgGoals: [4, 13, 17],
        preferredCauses: ["Climate Education", "Youth Engagement"],
      },
      {
        username: "james_okonkwo",
        email: "james.okonkwo@gfavolunteers.org",
        displayName: "James Okonkwo",
        bio: "Fundraising and grant writing expert helping NGOs secure environmental funding.",
        skills: ["Fundraising", "Writing", "Project Management"],
        location: "Chicago, IL",
        weeklyAvailability: 10,
        sdgGoals: [13, 17, 10],
        preferredCauses: ["NGO Capacity Building", "Climate Funding"],
      },
    ];

    const createdVolunteers: any[] = [];
    for (const v of volunteerData) {
      const [user] = await db.insert(users).values({
        username: v.username,
        email: v.email,
        password: "firebase_auth_managed",
        userType: "volunteer",
        displayName: v.displayName,
        bio: v.bio,
        skills: v.skills,
      }).returning();
      createdVolunteers.push({ ...user, ...v });
    }
    console.log(`   ✓ Created ${createdVolunteers.length} volunteer users`);

    // ── 4. Volunteer Profiles ────────────────────────────────────────────────
    console.log("\n📋 Creating volunteer profiles...");
    for (const v of createdVolunteers) {
      await db.insert(volunteerProfiles).values({
        userId: v.id,
        volunteerName: v.displayName,
        contactEmail: v.email,
        skills: v.skills,
        availability: "flexible",
        weeklyAvailability: v.weeklyAvailability,
        preferredCauses: v.preferredCauses,
        sdgGoals: v.sdgGoals,
        location: v.location,
        isPublic: true,
      });

      // Matchable volunteer entry
      await db.insert(volunteers).values({
        id: `vol-gfa-${v.id}`,
        email: v.email,
        name: v.displayName,
        location: v.location,
        skills: v.skills,
        interests: v.preferredCauses,
        sdgGoals: v.sdgGoals,
      });
    }
    console.log(`   ✓ Created volunteer profiles and matchable entries`);

    // ── 5. Matchable organization entry ─────────────────────────────────────
    await db.insert(matchableOrganizations).values({
      id: `org-gfa-${gfa.id}`,
      email: "info@greenfuturealliance.org",
      name: "Green Future Alliance",
      mission: "Global coalition for environmental conservation, climate action, and sustainable development.",
      needs: ["Environmental Science", "Community Organizing", "Data Analysis", "Project Management", "Fundraising"],
      location: "Portland, OR",
      sdgFocus: [13, 15, 7, 6, 11],
    });

    // ── 6. Impact Metrics ────────────────────────────────────────────────────
    console.log("\n📊 Creating GFA impact metrics...");
    const [
      metricTrees,
      metricCO2,
      metricEnergy,
      metricWater,
      metricCommunity,
      metricYouth,
      metricHectares,
    ] = await db.insert(impactMetrics).values([
      {
        name: "Trees Planted (GFA)",
        description: "Trees planted through GFA reforestation programs",
        unit: "trees",
        category: "Environment",
        sdgGoal: 15,
      },
      {
        name: "CO₂ Emissions Reduced (GFA)",
        description: "Metric tonnes of CO₂-equivalent emissions avoided or sequestered",
        unit: "tonnes CO₂e",
        category: "Climate",
        sdgGoal: 13,
      },
      {
        name: "Households with Clean Energy (GFA)",
        description: "Households gaining access to renewable energy sources",
        unit: "households",
        category: "Energy",
        sdgGoal: 7,
      },
      {
        name: "Watershed Area Protected (GFA)",
        description: "Hectares of watershed and water catchment areas under active protection",
        unit: "hectares",
        category: "Water",
        sdgGoal: 6,
      },
      {
        name: "Community Members Trained (GFA)",
        description: "Individuals trained in sustainable farming, conservation, or climate adaptation practices",
        unit: "people",
        category: "Education",
        sdgGoal: 4,
      },
      {
        name: "Youth Climate Educators (GFA)",
        description: "Young people trained as local climate change educators",
        unit: "youth",
        category: "Education",
        sdgGoal: 13,
      },
      {
        name: "Land Area Restored (GFA)",
        description: "Hectares of degraded land restored to productive use",
        unit: "hectares",
        category: "Environment",
        sdgGoal: 15,
      },
    ]).returning();
    console.log(`   ✓ Created 7 GFA impact metrics`);

    // ── 7. Projects ──────────────────────────────────────────────────────────
    console.log("\n📁 Creating GFA projects...");
    const [
      projReforestation,
      projSolarEnergy,
      projWatershed,
      projClimateEd,
      projUrbanGreen,
    ] = await db.insert(projects).values([
      {
        name: "Amazon Basin Reforestation Initiative",
        description:
          "Large-scale native tree planting and ecosystem restoration across 500 hectares of degraded land in the Amazon Basin, partnering with indigenous communities for long-term stewardship.",
        organizationId: gfa.id,
        status: "Active",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2026-12-31"),
        location: "Brazil, Colombia",
        sdgGoals: [15, 13, 1],
        primarySdg: 15,
        impactMetricName: "Trees Planted",
        impactMetricUnit: "trees",
        livesTouched: 4200,
        completionPercentage: 42,
        volunteersNeeded: 30,
        requiredSkills: ["Environmental Science", "Community Organizing", "Agriculture"],
        engagementType: "in-person",
      },
      {
        name: "Solar Micro-Grid Access Program",
        description:
          "Installing off-grid solar micro-grids in 200 rural households across East Africa, replacing kerosene lanterns and diesel generators with clean, affordable electricity.",
        organizationId: gfa.id,
        status: "Active",
        startDate: new Date("2025-03-15"),
        endDate: new Date("2026-06-30"),
        location: "Kenya, Uganda, Tanzania",
        sdgGoals: [7, 13, 1],
        primarySdg: 7,
        impactMetricName: "Households with Clean Energy",
        impactMetricUnit: "households",
        livesTouched: 1800,
        completionPercentage: 35,
        volunteersNeeded: 20,
        requiredSkills: ["Electrical", "Engineering", "Training"],
        engagementType: "in-person",
      },
      {
        name: "Highland Watershed Restoration",
        description:
          "Restoring critical watershed areas in the Andean highlands to protect freshwater sources for downstream communities, reduce erosion, and increase ecosystem biodiversity.",
        organizationId: gfa.id,
        status: "Active",
        startDate: new Date("2024-09-01"),
        endDate: new Date("2026-03-31"),
        location: "Peru, Bolivia",
        sdgGoals: [6, 15, 13],
        primarySdg: 6,
        impactMetricName: "Watershed Area Protected",
        impactMetricUnit: "hectares",
        livesTouched: 12000,
        completionPercentage: 68,
        volunteersNeeded: 25,
        requiredSkills: ["Environmental Science", "Engineering", "Data Analysis"],
        engagementType: "hybrid",
      },
      {
        name: "Youth Climate Action Network",
        description:
          "Training and equipping young climate educators in 50 schools across Southeast Asia to lead peer-to-peer climate literacy programs and local community action projects.",
        organizationId: gfa.id,
        status: "Active",
        startDate: new Date("2025-02-01"),
        endDate: new Date("2025-12-31"),
        location: "Philippines, Indonesia, Vietnam",
        sdgGoals: [4, 13, 17],
        primarySdg: 13,
        impactMetricName: "Youth Climate Educators Trained",
        impactMetricUnit: "youth",
        livesTouched: 5600,
        completionPercentage: 55,
        volunteersNeeded: 15,
        requiredSkills: ["Teaching", "Communication", "Training"],
        engagementType: "hybrid",
      },
      {
        name: "Urban Green Corridors - Portland",
        description:
          "Creating connected green corridors through urban neighborhoods in Portland to reduce the heat island effect, improve air quality, and increase biodiversity in the city.",
        organizationId: gfa.id,
        status: "Active",
        startDate: new Date("2025-04-01"),
        endDate: new Date("2025-11-30"),
        location: "Portland, OR",
        sdgGoals: [11, 13, 15],
        primarySdg: 11,
        impactMetricName: "Trees Planted in Urban Areas",
        impactMetricUnit: "trees",
        livesTouched: 28000,
        completionPercentage: 25,
        volunteersNeeded: 40,
        requiredSkills: ["Urban Planning", "Community Organizing", "Project Management"],
        engagementType: "in-person",
      },
    ]).returning();
    console.log(`   ✓ Created 5 GFA projects`);

    // ── 8. Tasks ─────────────────────────────────────────────────────────────
    console.log("\n📝 Creating tasks...");
    const today = new Date();
    const future = (days: number) => new Date(today.getTime() + days * 86400000);

    await db.insert(tasks).values([
      // Reforestation tasks
      { title: "Site survey and soil assessment", projectId: projReforestation.id, assigneeId: createdVolunteers[0].id, status: "Completed", priority: "High", dueDate: future(-60), estimatedHours: 24 },
      { title: "Native seedling nursery setup", projectId: projReforestation.id, assigneeId: createdVolunteers[2].id, status: "Completed", priority: "High", dueDate: future(-30), estimatedHours: 40 },
      { title: "Community training on tree planting", projectId: projReforestation.id, assigneeId: createdVolunteers[4].id, status: "In Progress", priority: "High", dueDate: future(15), estimatedHours: 20 },
      { title: "Q2 planting campaign (Phase 1)", projectId: projReforestation.id, assigneeId: createdVolunteers[0].id, status: "In Progress", priority: "Critical", dueDate: future(30), estimatedHours: 80 },
      { title: "Impact data collection & reporting", projectId: projReforestation.id, assigneeId: createdVolunteers[1].id, status: "To Do", priority: "Medium", dueDate: future(45), estimatedHours: 16 },
      // Solar Energy tasks
      { title: "Community needs assessment", projectId: projSolarEnergy.id, assigneeId: createdVolunteers[6].id, status: "Completed", priority: "High", dueDate: future(-45), estimatedHours: 16 },
      { title: "Grid design and technical planning", projectId: projSolarEnergy.id, assigneeId: createdVolunteers[6].id, status: "Completed", priority: "High", dueDate: future(-20), estimatedHours: 32 },
      { title: "Installation team training", projectId: projSolarEnergy.id, assigneeId: createdVolunteers[6].id, status: "In Progress", priority: "High", dueDate: future(10), estimatedHours: 24 },
      { title: "Phase 1 installations (50 households)", projectId: projSolarEnergy.id, assigneeId: createdVolunteers[6].id, status: "In Progress", priority: "Critical", dueDate: future(40), estimatedHours: 120 },
      // Watershed tasks
      { title: "Hydrological mapping", projectId: projWatershed.id, assigneeId: createdVolunteers[7].id, status: "Completed", priority: "High", dueDate: future(-90), estimatedHours: 40 },
      { title: "Erosion control barrier installation", projectId: projWatershed.id, assigneeId: createdVolunteers[2].id, status: "Completed", priority: "High", dueDate: future(-50), estimatedHours: 60 },
      { title: "Vegetation replanting — upper catchment", projectId: projWatershed.id, assigneeId: createdVolunteers[0].id, status: "In Progress", priority: "High", dueDate: future(20), estimatedHours: 80 },
      { title: "Water quality monitoring Q1", projectId: projWatershed.id, assigneeId: createdVolunteers[1].id, status: "Completed", priority: "Medium", dueDate: future(-10), estimatedHours: 12 },
      // Climate Education tasks
      { title: "Curriculum development", projectId: projClimateEd.id, assigneeId: createdVolunteers[8].id, status: "Completed", priority: "High", dueDate: future(-60), estimatedHours: 50 },
      { title: "Train-the-trainer workshops (Batch 1)", projectId: projClimateEd.id, assigneeId: createdVolunteers[8].id, status: "Completed", priority: "High", dueDate: future(-30), estimatedHours: 30 },
      { title: "School rollout — Philippines cohort", projectId: projClimateEd.id, assigneeId: createdVolunteers[8].id, status: "In Progress", priority: "High", dueDate: future(20), estimatedHours: 40 },
      // Urban Green tasks
      { title: "Corridor mapping and site selection", projectId: projUrbanGreen.id, assigneeId: createdVolunteers[3].id, status: "Completed", priority: "High", dueDate: future(-20), estimatedHours: 20 },
      { title: "Community outreach and sign-up", projectId: projUrbanGreen.id, assigneeId: createdVolunteers[2].id, status: "In Progress", priority: "Medium", dueDate: future(7), estimatedHours: 16 },
      { title: "Spring planting weekend — Site A", projectId: projUrbanGreen.id, assigneeId: createdVolunteers[3].id, status: "To Do", priority: "High", dueDate: future(14), estimatedHours: 32 },
    ]);
    console.log(`   ✓ Created project tasks`);

    // ── 9. Project Assignments ───────────────────────────────────────────────
    console.log("\n🔗 Creating project assignments...");
    const assignments = [
      // Reforestation
      { projectId: projReforestation.id, volunteerId: createdVolunteers[0].id, role: "Field Lead", hoursCommitted: 120, hoursCompleted: 55 },
      { projectId: projReforestation.id, volunteerId: createdVolunteers[1].id, role: "Data Analyst", hoursCommitted: 60, hoursCompleted: 28 },
      { projectId: projReforestation.id, volunteerId: createdVolunteers[2].id, role: "Community Coordinator", hoursCommitted: 90, hoursCompleted: 40 },
      { projectId: projReforestation.id, volunteerId: createdVolunteers[4].id, role: "Agronomy Specialist", hoursCommitted: 80, hoursCompleted: 35 },
      { projectId: projReforestation.id, volunteerId: createdVolunteers[5].id, role: "Policy Advisor", hoursCommitted: 30, hoursCompleted: 18 },
      // Solar Energy
      { projectId: projSolarEnergy.id, volunteerId: createdVolunteers[6].id, role: "Lead Engineer", hoursCommitted: 140, hoursCompleted: 60 },
      { projectId: projSolarEnergy.id, volunteerId: createdVolunteers[1].id, role: "Data Support", hoursCommitted: 40, hoursCompleted: 15 },
      { projectId: projSolarEnergy.id, volunteerId: createdVolunteers[9].id, role: "Grants Writer", hoursCommitted: 25, hoursCompleted: 20 },
      // Watershed
      { projectId: projWatershed.id, volunteerId: createdVolunteers[7].id, role: "Lead Engineer", hoursCommitted: 150, hoursCompleted: 110 },
      { projectId: projWatershed.id, volunteerId: createdVolunteers[0].id, role: "Field Volunteer", hoursCommitted: 80, hoursCompleted: 60 },
      { projectId: projWatershed.id, volunteerId: createdVolunteers[1].id, role: "Data Analyst", hoursCommitted: 50, hoursCompleted: 38 },
      { projectId: projWatershed.id, volunteerId: createdVolunteers[2].id, role: "Community Liaison", hoursCommitted: 70, hoursCompleted: 50 },
      // Climate Education
      { projectId: projClimateEd.id, volunteerId: createdVolunteers[8].id, role: "Lead Educator", hoursCommitted: 120, hoursCompleted: 72 },
      { projectId: projClimateEd.id, volunteerId: createdVolunteers[3].id, role: "Curriculum Designer", hoursCommitted: 60, hoursCompleted: 50 },
      { projectId: projClimateEd.id, volunteerId: createdVolunteers[5].id, role: "Policy Integrator", hoursCommitted: 20, hoursCompleted: 12 },
      // Urban Green
      { projectId: projUrbanGreen.id, volunteerId: createdVolunteers[3].id, role: "Urban Planner", hoursCommitted: 80, hoursCompleted: 22 },
      { projectId: projUrbanGreen.id, volunteerId: createdVolunteers[2].id, role: "Outreach Lead", hoursCommitted: 40, hoursCompleted: 8 },
      { projectId: projUrbanGreen.id, volunteerId: createdVolunteers[8].id, role: "Communications", hoursCommitted: 20, hoursCompleted: 5 },
      { projectId: projUrbanGreen.id, volunteerId: createdVolunteers[9].id, role: "Fundraising Lead", hoursCommitted: 30, hoursCompleted: 10 },
    ];

    for (const a of assignments) {
      await db.insert(projectAssignments).values({
        projectId: a.projectId,
        volunteerId: a.volunteerId,
        role: a.role,
        status: "active",
        hoursCommitted: a.hoursCommitted,
        hoursCompleted: a.hoursCompleted,
        notes: `GFA test data assignment`,
      });
    }
    console.log(`   ✓ Created ${assignments.length} project assignments`);

    // ── 10. Volunteer Activities (12 months of history) ──────────────────────
    console.log("\n📈 Creating volunteer activity history (12 months)...");

    const activityTemplates = [
      // Reforestation activities
      { volunteerId: 0, projectId: projReforestation.id, desc: "Native tree planting — upper ridge site", skills: ["Environmental Science", "Agriculture"], outcome: "Planted 450 native saplings with local community team", sdgTags: [15, 13], beneficiaryCount: 120, beneficiaryType: "community_member", hours: 14 },
      { volunteerId: 2, projectId: projReforestation.id, desc: "Community mobilization and seedling distribution", skills: ["Community Organizing", "Spanish Translation"], outcome: "Coordinated 35 community volunteers, distributed 600 seedlings", sdgTags: [15, 1], beneficiaryCount: 350, beneficiaryType: "community_member", hours: 10 },
      { volunteerId: 4, projectId: projReforestation.id, desc: "Agroforestry training workshop", skills: ["Agriculture", "Training"], outcome: "Trained 28 farmers in companion planting and soil conservation", sdgTags: [15, 2], beneficiaryCount: 28, beneficiaryType: "farmer", hours: 8 },
      { volunteerId: 1, projectId: projReforestation.id, desc: "Reforestation impact data collection", skills: ["Data Analysis", "Research"], outcome: "Documented survival rates: 87% for native species, 92% canopy coverage progress", sdgTags: [13, 15], beneficiaryCount: 0, beneficiaryType: "community_member", hours: 6 },
      { volunteerId: 5, projectId: projReforestation.id, desc: "Environmental policy brief — Amazon basin protections", skills: ["Legal", "Writing"], outcome: "Submitted policy brief to 3 regional governments on expanding protected zones", sdgTags: [13, 16], beneficiaryCount: 4200, beneficiaryType: "community_member", hours: 12 },
      // Solar activities
      { volunteerId: 6, projectId: projSolarEnergy.id, desc: "Solar panel installation — Kiambu village batch 1", skills: ["Electrical", "Engineering"], outcome: "Installed 18 household solar systems, providing power to 18 families", sdgTags: [7, 13], beneficiaryCount: 90, beneficiaryType: "community_member", hours: 16 },
      { volunteerId: 6, projectId: projSolarEnergy.id, desc: "Maintenance training for local technicians", skills: ["Training", "Electrical"], outcome: "Trained 6 local technicians to maintain and repair solar systems independently", sdgTags: [7, 8], beneficiaryCount: 6, beneficiaryType: "community_member", hours: 12 },
      { volunteerId: 9, projectId: projSolarEnergy.id, desc: "Renewable energy grant proposal writing", skills: ["Fundraising", "Writing"], outcome: "Submitted $85,000 grant application to Green Climate Fund", sdgTags: [7, 17], beneficiaryCount: 200, beneficiaryType: "community_member", hours: 10 },
      // Watershed activities
      { volunteerId: 7, projectId: projWatershed.id, desc: "Hydrological survey — Río Madre de Dios headwaters", skills: ["Environmental Science", "Engineering"], outcome: "Mapped 12km of critical watershed corridor, identified 3 high-priority restoration zones", sdgTags: [6, 15], beneficiaryCount: 3000, beneficiaryType: "community_member", hours: 20 },
      { volunteerId: 7, projectId: projWatershed.id, desc: "Erosion control gabion installation", skills: ["Engineering", "Environmental Science"], outcome: "Installed 45 gabion structures reducing sediment runoff by estimated 60%", sdgTags: [6, 15], beneficiaryCount: 2000, beneficiaryType: "community_member", hours: 18 },
      { volunteerId: 0, projectId: projWatershed.id, desc: "Riparian vegetation replanting", skills: ["Environmental Science", "Agriculture"], outcome: "Replanted 2.5 hectares of riparian buffer with native grass and shrubs", sdgTags: [6, 15, 13], beneficiaryCount: 800, beneficiaryType: "community_member", hours: 14 },
      { volunteerId: 1, projectId: projWatershed.id, desc: "Water quality monitoring Q3", skills: ["Data Analysis", "Environmental Science"], outcome: "Collected samples at 8 monitoring stations; turbidity reduced 40% vs baseline", sdgTags: [6], beneficiaryCount: 5000, beneficiaryType: "community_member", hours: 8 },
      { volunteerId: 2, projectId: projWatershed.id, desc: "Upstream community agreements on water use", skills: ["Community Organizing", "Spanish Translation"], outcome: "Facilitated agreements with 4 upstream farming communities on sustainable water use", sdgTags: [6, 16], beneficiaryCount: 12000, beneficiaryType: "community_member", hours: 16 },
      // Climate Education activities
      { volunteerId: 8, projectId: projClimateEd.id, desc: "Train-the-trainer workshop — Manila cohort", skills: ["Teaching", "Communication"], outcome: "Trained 22 youth educators who will reach 440+ students in their schools", sdgTags: [4, 13], beneficiaryCount: 22, beneficiaryType: "student", hours: 14 },
      { volunteerId: 8, projectId: projClimateEd.id, desc: "Climate curriculum localization — Indonesia", skills: ["Teaching", "Writing"], outcome: "Adapted curriculum for 3 Indonesian regional contexts, incorporating local climate risks", sdgTags: [4, 13], beneficiaryCount: 300, beneficiaryType: "student", hours: 18 },
      { volunteerId: 3, projectId: projClimateEd.id, desc: "Interactive climate visualization module design", skills: ["Urban Planning", "Sustainability"], outcome: "Created 5 interactive city heat-map modules showing impact of green infrastructure", sdgTags: [11, 13], beneficiaryCount: 150, beneficiaryType: "student", hours: 20 },
      // Urban Green activities
      { volunteerId: 3, projectId: projUrbanGreen.id, desc: "Green corridor route planning — North Portland", skills: ["Urban Planning", "Architecture"], outcome: "Finalized planting routes for 3.2km of connected corridor through 4 neighborhoods", sdgTags: [11, 13], beneficiaryCount: 8500, beneficiaryType: "community_member", hours: 12 },
      { volunteerId: 2, projectId: projUrbanGreen.id, desc: "Neighborhood outreach and volunteer recruitment", skills: ["Community Organizing", "Communication"], outcome: "Recruited 65 community volunteers for spring planting weekends", sdgTags: [11], beneficiaryCount: 28000, beneficiaryType: "community_member", hours: 8 },
    ];

    const allActivities: any[] = [];
    const monthsBack = 12;

    for (let monthOffset = 0; monthOffset < monthsBack; monthOffset++) {
      const actDate = new Date();
      actDate.setMonth(actDate.getMonth() - monthOffset);

      // Each month, insert a rotating subset of activities
      const subset = activityTemplates.filter((_, i) => (i + monthOffset) % 3 !== 0);

      for (const t of subset) {
        const dayOfMonth = 5 + Math.floor(Math.random() * 20);
        allActivities.push({
          userId: createdVolunteers[t.volunteerId].id,
          projectId: t.projectId,
          hours: t.hours + (Math.random() > 0.5 ? 1 : -1),
          date: new Date(actDate.getFullYear(), actDate.getMonth(), dayOfMonth),
          description: t.desc,
          skillsApplied: t.skills,
          outcomes: t.outcome,
          outcomeText: t.outcome,
          outcomeQuantity: t.beneficiaryCount,
          outcomeType: "shared",
          sdgTags: t.sdgTags,
          beneficiaryCount: t.beneficiaryCount,
          beneficiaryType: t.beneficiaryType,
          verificationStatus: monthOffset >= 2 ? "approved" : "pending",
          role: t.volunteerId === 0 || t.volunteerId === 6 || t.volunteerId === 7 ? "lead" : "support",
          loggedByType: "self",
          sdgMappingMethod: "manual",
        });
      }
    }

    // Insert in batches of 50
    const BATCH = 50;
    for (let i = 0; i < allActivities.length; i += BATCH) {
      await db.insert(volunteerActivities).values(allActivities.slice(i, i + BATCH));
    }
    console.log(`   ✓ Created ${allActivities.length} volunteer activity records`);

    // ── 11. Project Impacts (monthly aggregates per metric) ──────────────────
    console.log("\n🎯 Creating project impact records...");

    const impactRecords: any[] = [];

    // Monthly impact data per project/metric
    const projectMetricMap = [
      // Reforestation — trees planted + land restored
      { project: projReforestation, metric: metricTrees, baseValue: 2800, variance: 600 },
      { project: projReforestation, metric: metricHectares, baseValue: 18, variance: 4 },
      { project: projReforestation, metric: metricCO2, baseValue: 120, variance: 30 },
      { project: projReforestation, metric: metricCommunity, baseValue: 55, variance: 12 },
      // Solar Energy — households + CO2
      { project: projSolarEnergy, metric: metricEnergy, baseValue: 22, variance: 6 },
      { project: projSolarEnergy, metric: metricCO2, baseValue: 85, variance: 20 },
      { project: projSolarEnergy, metric: metricCommunity, baseValue: 18, variance: 5 },
      // Watershed — water + land
      { project: projWatershed, metric: metricWater, baseValue: 45, variance: 8 },
      { project: projWatershed, metric: metricHectares, baseValue: 12, variance: 3 },
      { project: projWatershed, metric: metricCommunity, baseValue: 40, variance: 10 },
      // Climate Education — youth + community
      { project: projClimateEd, metric: metricYouth, baseValue: 38, variance: 8 },
      { project: projClimateEd, metric: metricCommunity, baseValue: 90, variance: 20 },
      // Urban Green — trees + CO2
      { project: projUrbanGreen, metric: metricTrees, baseValue: 350, variance: 80 },
      { project: projUrbanGreen, metric: metricCO2, baseValue: 12, variance: 4 },
      { project: projUrbanGreen, metric: metricCommunity, baseValue: 65, variance: 15 },
    ];

    for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
      const impactDate = new Date();
      impactDate.setMonth(impactDate.getMonth() - monthOffset);
      const recordDate = new Date(impactDate.getFullYear(), impactDate.getMonth(), 28);

      for (const { project, metric, baseValue, variance } of projectMetricMap) {
        const value = Math.max(1, Math.round(baseValue + (Math.random() * 2 - 1) * variance));
        impactRecords.push({
          projectId: project.id,
          metricId: metric.id,
          value,
          date: recordDate,
          notes: `Monthly impact measurement — ${impactDate.toLocaleString("default", { month: "long", year: "numeric" })}`,
          verificationStatus: monthOffset >= 2 ? "approved" : "pending",
          loggedByType: "admin",
          loggedBy: gfaAdmin.id,
          outcomeType: "system",
          role: "lead",
        });
      }
    }

    for (let i = 0; i < impactRecords.length; i += BATCH) {
      await db.insert(projectImpacts).values(impactRecords.slice(i, i + BATCH));
    }
    console.log(`   ✓ Created ${impactRecords.length} project impact records (12 months × 15 metric/project combos)`);

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log("\n" + "=".repeat(60));
    console.log("✅ GREEN FUTURE ALLIANCE SEED COMPLETE");
    console.log("=".repeat(60));
    console.log("\n📊 Summary:");
    console.log(`   Organization:          Green Future Alliance (id: ${gfa.id})`);
    console.log(`   Admin user:            admin@greenfuturealliance.org`);
    console.log(`   Volunteer users:       10`);
    console.log(`   Projects:              5 (Amazon Reforestation, Solar Energy, Watershed, Climate Ed, Urban Green)`);
    console.log(`   Impact metrics:        7 (GFA-specific)`);
    console.log(`   Project assignments:   ${assignments.length}`);
    console.log(`   Volunteer activities:  ~${allActivities.length} (12 months history)`);
    console.log(`   Project impacts:       ${impactRecords.length} (12 months × 15 combos)`);
    console.log("\n🔑 Test Volunteers:");
    for (const v of createdVolunteers) {
      console.log(`   ${v.email.padEnd(42)} — ${v.displayName}`);
    }

  } catch (error) {
    console.error("\n❌ Error seeding GFA data:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seedGFA().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
