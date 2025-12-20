// Bulk seed data generator for stress testing Synerxus platform
// Run with: npx tsx dummy/seed-bulk.ts --count 2000
// Or: npx tsx dummy/seed-bulk.ts (defaults to 500 volunteers)

import { db } from "../server/db";
import {
  users, organizations, projects, tasks, volunteerActivities,
  impactMetrics, projectImpacts, calendarEvents, volunteers,
  matchableOrganizations, projectAssignments, volunteerProfiles,
  projectAiuSettings, opportunities, applications, savedOpportunities,
  rejectedOpportunities, feedback, badges, userBadges, leaderboardStats,
  volunteerSpotlights, csrPartners, employeeEngagement, uploadedImages,
  csrChallenges, projectBudgetLinks, verifiedOutputs, volunteerEmployerLinks,
  matchAnalytics, organizationProfiles, matches, notifications,
  conversationThreads, messages, employeeCommitments, employeeActivityLogs,
  employeeMilestones, csrCommitmentGoals, csrProjectPortfolios,
  beneficiaryRegistry, volunteerAiuRecords, aiuExportLogs, volunteerStories, storyLikes
} from "../shared/schema";

// Configuration
const args = process.argv.slice(2);
const countArg = args.find(a => a.startsWith('--count=')) || args.find((a, i) => args[i-1] === '--count');
const VOLUNTEER_COUNT = parseInt(countArg?.replace('--count=', '') || args[args.indexOf('--count') + 1] || '500', 10);
const ORG_COUNT = Math.max(10, Math.floor(VOLUNTEER_COUNT / 50)); // 1 org per 50 volunteers
const PROJECTS_PER_ORG = 3;
const TASKS_PER_PROJECT = 5;

// Data generators
const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Oliver', 'Amelia',
  'Benjamin', 'Harper', 'Elijah', 'Evelyn', 'Lucas', 'Abigail', 'Henry',
  'Emily', 'Alexander', 'Elizabeth', 'Sebastian', 'Sofia', 'Jack', 'Avery',
  'Aiden', 'Ella', 'Owen', 'Scarlett', 'Samuel', 'Grace', 'Ryan', 'Chloe',
  'Nathan', 'Victoria', 'Leo', 'Riley', 'Isaac', 'Aria', 'Gabriel', 'Lily',
  'Julian', 'Aurora', 'Mateo', 'Zoey', 'Anthony', 'Penelope', 'Jaxon', 'Layla',
  'Lincoln', 'Nora', 'Joshua', 'Camila', 'Christopher', 'Hannah', 'Andrew', 'Lillian',
  'Theodore', 'Addison', 'Caleb', 'Eleanor', 'Dylan', 'Natalie', 'Asher', 'Luna',
  'Michael', 'Savannah', 'Jayden', 'Brooklyn', 'Carter', 'Leah', 'Daniel', 'Zoe',
  'Priya', 'Raj', 'Aisha', 'Omar', 'Fatima', 'Chen', 'Yuki', 'Hiroshi',
  'Maria', 'Carlos', 'Ana', 'Luis', 'Rosa', 'Miguel', 'Juan', 'Elena'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill',
  'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell',
  'Mitchell', 'Carter', 'Roberts', 'Chen', 'Patel', 'Kim', 'Singh', 'Park',
  'Tanaka', 'Yamamoto', 'Santos', 'Costa', 'Silva', 'Oliveira', 'Khan', 'Ali'
];

const skills = [
  'Teaching', 'Engineering', 'Project Management', 'Healthcare', 'Nursing',
  'Web Development', 'Data Analysis', 'Community Organizing', 'Marketing',
  'Graphic Design', 'Writing', 'Translation', 'Event Planning', 'Fundraising',
  'Legal', 'Accounting', 'Social Work', 'Counseling', 'Photography', 'Video Production',
  'Construction', 'Plumbing', 'Electrical', 'Carpentry', 'Agriculture', 'Environmental Science',
  'Research', 'Training', 'Mentoring', 'IT Support', 'Logistics', 'First Aid',
  'Leadership', 'Communication', 'Problem Solving', 'Team Building'
];

const locations = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
  'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
  'Austin, TX', 'Seattle, WA', 'Denver, CO', 'Boston, MA', 'Nashville, TN',
  'Portland, OR', 'Las Vegas, NV', 'Detroit, MI', 'Miami, FL', 'Atlanta, GA',
  'London, UK', 'Paris, France', 'Berlin, Germany', 'Tokyo, Japan', 'Sydney, Australia',
  'Toronto, Canada', 'Mumbai, India', 'Singapore', 'Dubai, UAE', 'Cape Town, South Africa'
];

const orgTypes = [
  'Foundation', 'Initiative', 'Association', 'Coalition', 'Alliance',
  'Network', 'Trust', 'Institute', 'Society', 'Council'
];

const orgFocus = [
  'Water', 'Education', 'Health', 'Environment', 'Poverty', 'Hunger',
  'Climate', 'Youth', 'Women', 'Technology', 'Arts', 'Sports'
];

const projectStatuses = ['Active', 'Planning', 'Completed', 'On Hold'];
const taskStatuses = ['To Do', 'In Progress', 'Completed', 'Blocked'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];

// Helper functions
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomSDGs(count: number = 3): number[] {
  const sdgs = Array.from({length: 17}, (_, i) => i + 1);
  return randomElements(sdgs, count);
}

function generateEmail(firstName: string, lastName: string, domain: string): string {
  const rand = Math.floor(Math.random() * 1000);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${rand}@${domain}`;
}

async function seedBulkData() {
  console.log(`🚀 Starting bulk seed with ${VOLUNTEER_COUNT} volunteers and ${ORG_COUNT} organizations...`);
  console.log(`   This will create approximately ${ORG_COUNT * PROJECTS_PER_ORG} projects and ${ORG_COUNT * PROJECTS_PER_ORG * TASKS_PER_PROJECT} tasks.`);

  const startTime = Date.now();

  try {
    // Clear existing data
    console.log("\n🧹 Clearing existing data...");
    await db.delete(storyLikes);
    await db.delete(volunteerStories);
    await db.delete(aiuExportLogs);
    await db.delete(volunteerAiuRecords);
    await db.delete(beneficiaryRegistry);
    await db.delete(csrProjectPortfolios);
    await db.delete(csrCommitmentGoals);
    await db.delete(employeeMilestones);
    await db.delete(employeeActivityLogs);
    await db.delete(employeeCommitments);
    await db.delete(messages);
    await db.delete(conversationThreads);
    await db.delete(notifications);
    await db.delete(matches);
    await db.delete(organizationProfiles);
    await db.delete(matchAnalytics);
    await db.delete(volunteerEmployerLinks);
    await db.delete(verifiedOutputs);
    await db.delete(projectBudgetLinks);
    await db.delete(csrChallenges);
    await db.delete(uploadedImages);
    await db.delete(employeeEngagement);
    await db.delete(csrPartners);
    await db.delete(volunteerSpotlights);
    await db.delete(leaderboardStats);
    await db.delete(userBadges);
    await db.delete(badges);
    await db.delete(feedback);
    await db.delete(rejectedOpportunities);
    await db.delete(savedOpportunities);
    await db.delete(applications);
    await db.delete(opportunities);
    await db.delete(projectImpacts);
    await db.delete(volunteerActivities);
    await db.delete(projectAssignments);
    await db.delete(volunteerProfiles);
    await db.delete(calendarEvents);
    await db.delete(tasks);
    await db.delete(projectAiuSettings);
    await db.delete(projects);
    await db.delete(impactMetrics);
    await db.delete(volunteers);
    await db.delete(matchableOrganizations);
    await db.delete(users);
    await db.delete(organizations);

    // Create organizations in batches
    console.log(`\n🏢 Creating ${ORG_COUNT} organizations...`);
    const orgData = [];
    for (let i = 0; i < ORG_COUNT; i++) {
      const focus = randomElement(orgFocus);
      const type = randomElement(orgTypes);
      orgData.push({
        name: `${focus} ${type} ${i + 1}`,
        description: `A ${focus.toLowerCase()}-focused organization dedicated to making a positive impact in communities worldwide.`,
        website: `https://${focus.toLowerCase()}${type.toLowerCase()}${i + 1}.org`,
        contactEmail: `contact@${focus.toLowerCase()}${i + 1}.org`,
        contactPhone: `+1-555-${String(i).padStart(4, '0')}`,
        address: `${100 + i} Main Street, ${randomElement(locations)}`,
      });
    }

    const createdOrgs = await db.insert(organizations).values(orgData).returning();
    console.log(`   ✓ Created ${createdOrgs.length} organizations`);

    // Create impact metrics
    console.log("\n📊 Creating impact metrics...");
    const metricsData = [
      { name: "People Reached", description: "Number of people directly impacted", unit: "people", category: "General" },
      { name: "Hours Contributed", description: "Total volunteer hours", unit: "hours", category: "General" },
      { name: "Clean Water Access", description: "People gaining water access", unit: "people", category: "Water", sdgGoal: 6 },
      { name: "Students Educated", description: "Students completing programs", unit: "students", category: "Education", sdgGoal: 4 },
      { name: "Healthcare Services", description: "Medical consultations provided", unit: "services", category: "Health", sdgGoal: 3 },
      { name: "Trees Planted", description: "Trees planted for reforestation", unit: "trees", category: "Environment", sdgGoal: 13 },
      { name: "Meals Provided", description: "Meals distributed to communities", unit: "meals", category: "Hunger", sdgGoal: 2 },
      { name: "Jobs Created", description: "Employment opportunities created", unit: "jobs", category: "Employment", sdgGoal: 8 },
    ];
    const createdMetrics = await db.insert(impactMetrics).values(metricsData).returning();
    console.log(`   ✓ Created ${createdMetrics.length} impact metrics`);

    // Create projects in batches
    console.log(`\n📁 Creating ${ORG_COUNT * PROJECTS_PER_ORG} projects...`);
    const projectData = [];
    for (const org of createdOrgs) {
      for (let p = 0; p < PROJECTS_PER_ORG; p++) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 12));
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 6 + Math.floor(Math.random() * 18));

        projectData.push({
          name: `${org.name} Project ${p + 1}`,
          description: `A community-focused project by ${org.name} to create positive impact.`,
          organizationId: org.id,
          status: randomElement(projectStatuses),
          startDate,
          endDate,
          location: randomElement(locations),
          sdgGoals: randomSDGs(3),
          completionPercentage: Math.floor(Math.random() * 100),
        });
      }
    }

    const createdProjects = await db.insert(projects).values(projectData).returning();
    console.log(`   ✓ Created ${createdProjects.length} projects`);

    // Create volunteer users in batches
    console.log(`\n👥 Creating ${VOLUNTEER_COUNT} volunteer users...`);
    const BATCH_SIZE = 100;
    const volunteerUsers: any[] = [];

    for (let batch = 0; batch < Math.ceil(VOLUNTEER_COUNT / BATCH_SIZE); batch++) {
      const batchStart = batch * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, VOLUNTEER_COUNT);
      const batchData = [];

      for (let i = batchStart; i < batchEnd; i++) {
        const firstName = randomElement(firstNames);
        const lastName = randomElement(lastNames);
        const displayName = `${firstName} ${lastName}`;

        batchData.push({
          username: `volunteer_${i + 1}`,
          email: generateEmail(firstName, lastName, 'volunteers.test'),
          password: 'test_password_hash',
          userType: 'volunteer' as const,
          displayName,
          bio: `Passionate volunteer dedicated to ${randomElement(orgFocus).toLowerCase()} and community service.`,
          skills: randomElements(skills, 3 + Math.floor(Math.random() * 4)),
        });
      }

      const created = await db.insert(users).values(batchData).returning();
      volunteerUsers.push(...created);

      if ((batch + 1) % 5 === 0 || batch === Math.ceil(VOLUNTEER_COUNT / BATCH_SIZE) - 1) {
        console.log(`   ✓ Created ${volunteerUsers.length}/${VOLUNTEER_COUNT} volunteers`);
      }
    }

    // Create organization admin users
    console.log(`\n👤 Creating ${ORG_COUNT} organization admin users...`);
    const orgAdminData = createdOrgs.map((org, i) => ({
      username: `org_admin_${i + 1}`,
      email: `admin${i + 1}@org.test`,
      password: 'test_password_hash',
      userType: 'organization' as const,
      displayName: `${org.name} Admin`,
      organizationId: org.id,
    }));
    await db.insert(users).values(orgAdminData);
    console.log(`   ✓ Created ${orgAdminData.length} organization admins`);

    // Create volunteer profiles in batches
    console.log(`\n📋 Creating volunteer profiles...`);
    for (let batch = 0; batch < Math.ceil(volunteerUsers.length / BATCH_SIZE); batch++) {
      const batchUsers = volunteerUsers.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE);
      const profileData = batchUsers.map(user => ({
        userId: user.id,
        volunteerName: user.displayName,
        contactEmail: user.email,
        skills: user.skills || randomElements(skills, 3),
        availability: randomElement(['weekends', 'evenings', 'flexible', 'mornings']),
        weeklyAvailability: 5 + Math.floor(Math.random() * 20),
        preferredCauses: randomElements(orgFocus, 2),
        sdgGoals: randomSDGs(3),
        location: randomElement(locations),
        isPublic: Math.random() > 0.2,
      }));

      await db.insert(volunteerProfiles).values(profileData);
    }
    console.log(`   ✓ Created ${volunteerUsers.length} volunteer profiles`);

    // Create matchable volunteers
    console.log(`\n🔗 Creating matchable volunteer entries...`);
    for (let batch = 0; batch < Math.ceil(volunteerUsers.length / BATCH_SIZE); batch++) {
      const batchUsers = volunteerUsers.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE);
      const matchableData = batchUsers.map((user, i) => ({
        id: `vol-${user.id}-${batch * BATCH_SIZE + i}`,
        email: user.email,
        name: user.displayName,
        location: randomElement(locations),
        skills: user.skills || randomElements(skills, 3),
        interests: randomElements(orgFocus, 3),
        sdgGoals: randomSDGs(3),
      }));

      await db.insert(volunteers).values(matchableData);
    }
    console.log(`   ✓ Created ${volunteerUsers.length} matchable volunteers`);

    // Create matchable organizations
    console.log(`\n🏛️ Creating matchable organization entries...`);
    const matchableOrgData = createdOrgs.map((org, i) => ({
      id: `org-${org.id}-${i}`,
      email: org.contactEmail || `org${i}@test.org`,
      name: org.name,
      mission: org.description,
      needs: randomElements(skills, 4),
      location: randomElement(locations),
      sdgFocus: randomSDGs(3),
    }));
    await db.insert(matchableOrganizations).values(matchableOrgData);
    console.log(`   ✓ Created ${matchableOrgData.length} matchable organizations`);

    // Create project assignments (link volunteers to projects)
    console.log(`\n🔗 Creating project assignments...`);
    const roles = ['Volunteer', 'Team Lead', 'Coordinator', 'Specialist', 'Contributor'];
    let assignmentCount = 0;

    for (let batch = 0; batch < Math.ceil(volunteerUsers.length / BATCH_SIZE); batch++) {
      const batchUsers = volunteerUsers.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE);
      const assignmentData = batchUsers.map(user => {
        const project = randomElement(createdProjects);
        return {
          projectId: project.id,
          volunteerId: user.id,
          role: randomElement(roles),
          status: randomElement(['active', 'completed', 'pending']),
          hoursCommitted: 20 + Math.floor(Math.random() * 80),
          hoursCompleted: Math.floor(Math.random() * 50),
          notes: 'Auto-generated assignment for stress testing',
        };
      });

      await db.insert(projectAssignments).values(assignmentData);
      assignmentCount += assignmentData.length;
    }
    console.log(`   ✓ Created ${assignmentCount} project assignments`);

    // Create tasks
    console.log(`\n📝 Creating tasks...`);
    const taskData = [];
    for (const project of createdProjects) {
      for (let t = 0; t < TASKS_PER_PROJECT; t++) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 90));

        taskData.push({
          title: `Task ${t + 1} for ${project.name}`,
          description: `This is task ${t + 1} for the project. It involves important work.`,
          projectId: project.id,
          assigneeId: randomElement(volunteerUsers).id,
          status: randomElement(taskStatuses),
          priority: randomElement(priorities),
          dueDate,
          estimatedHours: 2 + Math.floor(Math.random() * 20),
        });
      }
    }

    // Insert tasks in batches
    for (let i = 0; i < taskData.length; i += BATCH_SIZE) {
      await db.insert(tasks).values(taskData.slice(i, i + BATCH_SIZE));
    }
    console.log(`   ✓ Created ${taskData.length} tasks`);

    // Create volunteer activities
    console.log(`\n📈 Creating volunteer activities...`);
    let activityCount = 0;
    const activitiesPerVolunteer = Math.min(5, Math.ceil(1000 / volunteerUsers.length)); // Cap total activities

    for (let batch = 0; batch < Math.ceil(volunteerUsers.length / BATCH_SIZE); batch++) {
      const batchUsers = volunteerUsers.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE);
      const activityData: any[] = [];

      for (const user of batchUsers) {
        for (let a = 0; a < activitiesPerVolunteer; a++) {
          const activityDate = new Date();
          activityDate.setDate(activityDate.getDate() - Math.floor(Math.random() * 180));

          activityData.push({
            userId: user.id,
            projectId: randomElement(createdProjects).id,
            hours: 1 + Math.floor(Math.random() * 8),
            date: activityDate,
            description: 'Volunteer activity for stress testing',
            skillsApplied: randomElements(skills, 2),
            outcomes: 'Positive impact on community',
          });
        }
      }

      if (activityData.length > 0) {
        await db.insert(volunteerActivities).values(activityData);
        activityCount += activityData.length;
      }
    }
    console.log(`   ✓ Created ${activityCount} volunteer activities`);

    // Create project impacts
    console.log(`\n🎯 Creating project impacts...`);
    const impactData = [];
    for (const project of createdProjects) {
      for (let m = 0; m < 3; m++) { // 3 months of impact data per project
        const impactDate = new Date();
        impactDate.setMonth(impactDate.getMonth() - m);

        impactData.push({
          projectId: project.id,
          metricId: randomElement(createdMetrics).id,
          value: 10 + Math.floor(Math.random() * 500),
          date: impactDate,
          notes: 'Impact measurement for stress testing',
        });
      }
    }

    for (let i = 0; i < impactData.length; i += BATCH_SIZE) {
      await db.insert(projectImpacts).values(impactData.slice(i, i + BATCH_SIZE));
    }
    console.log(`   ✓ Created ${impactData.length} project impacts`);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("\n" + "=".repeat(60));
    console.log("✅ BULK SEED COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   - ${ORG_COUNT} organizations`);
    console.log(`   - ${ORG_COUNT} organization admin users`);
    console.log(`   - ${volunteerUsers.length} volunteer users`);
    console.log(`   - ${volunteerUsers.length} volunteer profiles`);
    console.log(`   - ${createdProjects.length} projects`);
    console.log(`   - ${taskData.length} tasks`);
    console.log(`   - ${assignmentCount} project assignments`);
    console.log(`   - ${activityCount} volunteer activities`);
    console.log(`   - ${impactData.length} project impacts`);
    console.log(`   - ${createdMetrics.length} impact metrics`);
    console.log(`\n⏱️  Total time: ${duration} seconds`);
    console.log(`\n🔑 Test Credentials:`);
    console.log(`   Volunteers: volunteer_1@volunteers.test through volunteer_${VOLUNTEER_COUNT}@volunteers.test`);
    console.log(`   Org Admins: admin1@org.test through admin${ORG_COUNT}@org.test`);

  } catch (error) {
    console.error("\n❌ Error during bulk seed:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run
seedBulkData().catch((error) => {
  console.error("Failed to seed database:", error);
  process.exit(1);
});
