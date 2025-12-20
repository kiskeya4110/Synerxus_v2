// Comprehensive seed data for testing Synerxus platform
// Run with: tsx dummy/seed-data.ts

import { db } from "../server/db";
import { users, organizations, projects, tasks, volunteerActivities, impactMetrics, projectImpacts, calendarEvents, volunteers, matchableOrganizations, projectAssignments, volunteerProfiles, projectAiuSettings, opportunities, applications, savedOpportunities, rejectedOpportunities, feedback, badges, userBadges, leaderboardStats, volunteerSpotlights, csrPartners, employeeEngagement, uploadedImages, csrChallenges, projectBudgetLinks, verifiedOutputs, volunteerEmployerLinks, matchAnalytics, organizationProfiles, matches, notifications, conversationThreads, messages, employeeCommitments, employeeActivityLogs, employeeMilestones, csrCommitmentGoals, csrProjectPortfolios, beneficiaryRegistry, volunteerAiuRecords, aiuExportLogs, volunteerStories, storyLikes } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function seedDatabase() {
  console.log("🌱 Starting database seed...");

  try {
    await db.transaction(async (tx) => {
      // Clear existing data in correct order (children first)
      console.log("Clearing existing data...");

      // Clear all dependent tables first
      await tx.delete(storyLikes);
      await tx.delete(volunteerStories);
      await tx.delete(aiuExportLogs);
      await tx.delete(volunteerAiuRecords);
      await tx.delete(beneficiaryRegistry);
      await tx.delete(csrProjectPortfolios);
      await tx.delete(csrCommitmentGoals);
      await tx.delete(employeeMilestones);
      await tx.delete(employeeActivityLogs);
      await tx.delete(employeeCommitments);
      await tx.delete(messages);
      await tx.delete(conversationThreads);
      await tx.delete(notifications);
      await tx.delete(matches);
      await tx.delete(organizationProfiles);
      await tx.delete(matchAnalytics);
      await tx.delete(volunteerEmployerLinks);
      await tx.delete(verifiedOutputs);
      await tx.delete(projectBudgetLinks);
      await tx.delete(csrChallenges);
      await tx.delete(uploadedImages);
      await tx.delete(employeeEngagement);
      await tx.delete(csrPartners);
      await tx.delete(volunteerSpotlights);
      await tx.delete(leaderboardStats);
      await tx.delete(userBadges);
      await tx.delete(badges);
      await tx.delete(feedback);
      await tx.delete(rejectedOpportunities);
      await tx.delete(savedOpportunities);
      await tx.delete(applications);
      await tx.delete(opportunities);
      await tx.delete(projectImpacts);
      await tx.delete(volunteerActivities);
      await tx.delete(projectAssignments);
      await tx.delete(volunteerProfiles);
      await tx.delete(calendarEvents);
      await tx.delete(tasks);
      await tx.delete(projectAiuSettings);
      await tx.delete(projects);
      await tx.delete(impactMetrics);
      await tx.delete(volunteers);
      await tx.delete(matchableOrganizations);
      await tx.delete(users); // Delete users before organizations (FK)
      await tx.delete(organizations);

      // Seed Organizations (parents first)
      console.log("Creating organizations...");
      const [waterAid, educateGlobal, healthAccess] = await tx.insert(organizations).values([
        {
          name: "WaterAid International",
          description: "Providing clean water and sanitation to communities worldwide",
          website: "https://wateraid.org",
          contactEmail: "contact@wateraid.org",
          contactPhone: "+1-555-0101",
          address: "123 Water Street, New York, NY 10001",
        },
        {
          name: "Educate Global",
          description: "Digital literacy and education programs for underserved communities",
          website: "https://educateglobal.org",
          contactEmail: "info@educateglobal.org",
          contactPhone: "+1-555-0202",
          address: "456 Learning Ave, San Francisco, CA 94102",
        },
        {
          name: "Health Access Initiative",
          description: "Mobile healthcare services for remote and underserved populations",
          website: "https://healthaccess.org",
          contactEmail: "contact@healthaccess.org",
          contactPhone: "+1-555-0303",
          address: "789 Medical Plaza, Boston, MA 02101",
        },
      ]).returning();

      // Seed Users
      // Note: Firebase handles actual authentication separately
      console.log("Creating users...");
      const dummyPassword = "firebase_auth_managed";
      
      const [volunteer1, volunteer2, volunteer3, org1User, org2User, org3User] = await tx.insert(users).values([
        {
          username: "sarah_volunteer",
          email: "sarah@volunteers.com",
          password: dummyPassword,
          userType: "volunteer",
          displayName: "Sarah Johnson",
          bio: "Passionate about clean water and education",
          skills: ["Teaching", "Engineering", "Project Management"],
        },
        {
          username: "michael_volunteer",
          email: "michael@volunteers.com",
          password: dummyPassword,
          userType: "volunteer",
          displayName: "Michael Chen",
          bio: "Healthcare professional dedicated to serving communities",
          skills: ["Healthcare", "Training", "Logistics"],
        },
        {
          username: "emma_volunteer",
          email: "emma@volunteers.com",
          password: dummyPassword,
          userType: "volunteer",
          displayName: "Emma Rodriguez",
          bio: "Environmental advocate and educator",
          skills: ["Environmental Science", "Community Organizing", "Data Analysis"],
        },
        {
          username: "wateraid_org",
          email: "admin@wateraid.org",
          password: dummyPassword,
          userType: "organization",
          displayName: "WaterAid Admin",
          organizationId: waterAid.id,
        },
        {
          username: "educate_org",
          email: "admin@educate.org",
          password: dummyPassword,
          userType: "organization",
          displayName: "Educate Global Admin",
          organizationId: educateGlobal.id,
        },
        {
          username: "health_org",
          email: "admin@healthaccess.org",
          password: dummyPassword,
          userType: "organization",
          displayName: "Health Access Admin",
          organizationId: healthAccess.id,
        },
      ]).returning();

      // Seed Volunteer Profiles for dashboard (linked to users table)
      console.log("Creating volunteer profiles for dashboard...");
      await tx.insert(volunteerProfiles).values([
        {
          userId: volunteer1.id,
          volunteerName: "Sarah Johnson",
          contactEmail: "sarah@volunteers.com",
          skills: ["Teaching", "Engineering", "Project Management"],
          availability: "weekends",
          weeklyAvailability: 20,
          preferredCauses: ["Clean Water", "Education", "Infrastructure"],
          sdgGoals: [6, 4, 11],
          location: "New York, NY",
          isPublic: true,
        },
        {
          userId: volunteer2.id,
          volunteerName: "Michael Chen",
          contactEmail: "michael@volunteers.com",
          skills: ["Healthcare", "Training", "Logistics"],
          availability: "flexible",
          weeklyAvailability: 15,
          preferredCauses: ["Healthcare", "Community Health"],
          sdgGoals: [3, 10, 17],
          location: "Los Angeles, CA",
          isPublic: true,
        },
        {
          userId: volunteer3.id,
          volunteerName: "Emma Rodriguez",
          contactEmail: "emma@volunteers.com",
          skills: ["Environmental Science", "Community Organizing", "Data Analysis"],
          availability: "evenings",
          weeklyAvailability: 12,
          preferredCauses: ["Environment", "Climate Action"],
          sdgGoals: [13, 15, 7],
          location: "Seattle, WA",
          isPublic: true,
        },
      ]);

      // Seed Volunteer Profiles (for matching system)
      console.log("Creating volunteer profiles for matching...");
      await tx.insert(volunteers).values([
        {
          id: "vol-sarah-001",
          email: "sarah@volunteers.com",
          name: "Sarah Johnson",
          location: "New York, NY",
          skills: ["Teaching", "Engineering", "Project Management"],
          interests: ["Clean Water", "Education", "Infrastructure"],
          sdgGoals: [6, 4, 11],
        },
        {
          id: "vol-michael-002",
          email: "michael@volunteers.com",
          name: "Michael Chen",
          location: "Los Angeles, CA",
          skills: ["Healthcare", "Training", "Logistics"],
          interests: ["Healthcare", "Community Health", "Training"],
          sdgGoals: [3, 10, 17],
        },
        {
          id: "vol-emma-003",
          email: "emma@volunteers.com",
          name: "Emma Rodriguez",
          location: "Seattle, WA",
          skills: ["Environmental Science", "Community Organizing", "Data Analysis"],
          interests: ["Environment", "Climate Action", "Sustainability"],
          sdgGoals: [13, 15, 7],
        },
      ]);

      // Seed Organization Profiles (for matching system)
      console.log("Creating organization profiles...");
      await tx.insert(matchableOrganizations).values([
        {
          id: "org-wateraid-001",
          email: "admin@wateraid.org",
          name: "WaterAid International",
          mission: "Providing clean water and sanitation to communities worldwide",
          needs: ["Engineering", "Project Management", "Community Outreach", "Water Systems"],
          location: "New York, NY",
          sdgFocus: [6, 3, 11],
        },
        {
          id: "org-educate-002",
          email: "admin@educate.org",
          name: "Educate Global",
          mission: "Digital literacy and education programs for underserved communities",
          needs: ["Teaching", "IT Support", "Curriculum Development", "Mentoring"],
          location: "San Francisco, CA",
          sdgFocus: [4, 8, 10],
        },
        {
          id: "org-healthaccess-003",
          email: "admin@healthaccess.org",
          name: "Health Access Initiative",
          mission: "Mobile healthcare services for remote and underserved populations",
          needs: ["Healthcare", "Logistics", "Data Analysis", "Medical Training"],
          location: "Boston, MA",
          sdgFocus: [3, 1, 10],
        },
      ]);

      // Seed Impact Metrics
      console.log("Creating impact metrics...");
      const [metric1, metric2, metric3, metric4, metric5] = await tx.insert(impactMetrics).values([
        {
          name: "People with Clean Water Access",
          description: "Number of individuals gaining access to clean drinking water",
          unit: "people",
          category: "Water & Sanitation",
          sdgGoal: 6,
        },
        {
          name: "Students Educated",
          description: "Number of students completing digital literacy training",
          unit: "students",
          category: "Education",
          sdgGoal: 4,
        },
        {
          name: "Healthcare Services Delivered",
          description: "Number of healthcare consultations and treatments provided",
          unit: "services",
          category: "Health",
          sdgGoal: 3,
        },
        {
          name: "Trees Planted",
          description: "Number of trees planted in reforestation efforts",
          unit: "trees",
          category: "Environment",
          sdgGoal: 13,
        },
        {
          name: "Volunteer Hours Contributed",
          description: "Total hours volunteered across all projects",
          unit: "hours",
          category: "General",
        },
      ]).returning();

      // Seed Projects
      console.log("Creating projects...");
      const [waterProject, eduProject, healthProject, envProject] = await tx.insert(projects).values([
        {
          name: "Clean Water Initiative - Phase 3",
          description: "Installing sustainable water filtration systems in rural communities across East Africa",
          organizationId: waterAid.id,
          status: "Active",
          startDate: new Date("2024-01-15"),
          endDate: new Date("2025-06-30"),
          location: "Kenya, Tanzania",
          sdgGoals: [6, 3, 11],
          coverImage: "https://images.unsplash.com/photo-1559827260-dc66d52bef19",
        },
        {
          name: "Digital Literacy Program",
          description: "Computer training and internet access for underserved communities",
          organizationId: educateGlobal.id,
          status: "Active",
          startDate: new Date("2024-03-01"),
          endDate: new Date("2025-12-31"),
          location: "Rural India, Philippines",
          sdgGoals: [4, 8, 10],
          coverImage: "https://images.unsplash.com/photo-1509062522246-3755977927d7",
        },
        {
          name: "Mobile Health Clinics",
          description: "Providing primary healthcare services to remote villages",
          organizationId: healthAccess.id,
          status: "Active",
          startDate: new Date("2024-02-01"),
          endDate: new Date("2025-08-31"),
          location: "Guatemala, Peru",
          sdgGoals: [3, 1, 10],
          coverImage: "https://images.unsplash.com/photo-1576091160550-2173dba999ef",
        },
        {
          name: "Urban Reforestation Project",
          description: "Planting trees and creating green spaces in urban areas",
          organizationId: waterAid.id,
          status: "Planning",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-12-31"),
          location: "New York, Los Angeles",
          sdgGoals: [13, 15, 11],
          coverImage: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09",
        },
      ]).returning();

      // Seed Project Assignments (CRITICAL: This links volunteers to projects!)
      console.log("Creating project assignments...");
      await tx.insert(projectAssignments).values([
        {
          projectId: waterProject.id,
          volunteerId: volunteer1.id,
          role: "Team Lead",
          status: "active",
          hoursCommitted: 100,
          hoursCompleted: 45,
          notes: "Leading water system installation efforts",
        },
        {
          projectId: healthProject.id,
          volunteerId: volunteer2.id,
          role: "Healthcare Volunteer",
          status: "active",
          hoursCommitted: 80,
          hoursCompleted: 32,
          notes: "Providing healthcare services at mobile clinics",
        },
        {
          projectId: eduProject.id,
          volunteerId: volunteer3.id,
          role: "Instructor",
          status: "active",
          hoursCommitted: 60,
          hoursCompleted: 28,
          notes: "Teaching digital literacy courses",
        },
        {
          projectId: envProject.id,
          volunteerId: volunteer1.id,
          role: "Contributor",
          status: "active",
          hoursCommitted: 40,
          hoursCompleted: 15,
          notes: "Supporting environmental initiatives",
        },
        {
          projectId: envProject.id,
          volunteerId: volunteer3.id,
          role: "Contributor",
          status: "active",
          hoursCommitted: 30,
          hoursCompleted: 10,
          notes: "Climate action support",
        },
      ]);

      // Seed Tasks
      console.log("Creating tasks...");
      await tx.insert(tasks).values([
        {
          title: "Water System Installation - Site A",
          description: "Install filtration system at primary school",
          projectId: waterProject.id,
          assigneeId: volunteer1.id,
          status: "In Progress",
          priority: "High",
          dueDate: new Date("2025-11-15"),
          estimatedHours: 40,
        },
        {
          title: "Community Training Session",
          description: "Train local residents on water system maintenance",
          projectId: waterProject.id,
          assigneeId: volunteer1.id,
          status: "Completed",
          priority: "Medium",
          dueDate: new Date("2024-10-01"),
          estimatedHours: 8,
        },
        {
          title: "Curriculum Development",
          description: "Create digital literacy curriculum for ages 10-15",
          projectId: eduProject.id,
          assigneeId: volunteer3.id,
          status: "Completed",
          priority: "High",
          dueDate: new Date("2024-09-15"),
          estimatedHours: 60,
        },
        {
          title: "Computer Lab Setup",
          description: "Set up and configure computer lab equipment",
          projectId: eduProject.id,
          status: "To Do",
          priority: "High",
          dueDate: new Date("2025-11-30"),
          estimatedHours: 24,
        },
        {
          title: "Health Screening Camp",
          description: "Organize and staff health screening event",
          projectId: healthProject.id,
          assigneeId: volunteer2.id,
          status: "In Progress",
          priority: "High",
          dueDate: new Date("2025-11-10"),
          estimatedHours: 16,
        },
      ]);

      // Seed Volunteer Activities (past 6 months for charts)
      console.log("Creating volunteer activities...");
      const activities = [];
      const startDate = new Date("2024-04-01");
      
      for (let month = 0; month < 7; month++) {
        const monthDate = new Date(startDate);
        monthDate.setMonth(startDate.getMonth() + month);
        
        // Sarah's activities
        activities.push({
          userId: volunteer1.id,
          projectId: waterProject.id,
          hours: Math.floor(Math.random() * 20) + 10,
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.floor(Math.random() * 28) + 1),
          description: "Water system installation and community training",
          skillsApplied: ["Engineering", "Project Management"],
          outcomes: "Successfully installed filtration system, trained 25 community members",
        });

        // Michael's activities
        activities.push({
          userId: volunteer2.id,
          projectId: healthProject.id,
          hours: Math.floor(Math.random() * 15) + 8,
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.floor(Math.random() * 28) + 1),
          description: "Health screening and patient consultations",
          skillsApplied: ["Healthcare", "Patient Care"],
          outcomes: "Screened 50+ patients, provided health education",
        });

        // Emma's activities
        activities.push({
          userId: volunteer3.id,
          projectId: eduProject.id,
          hours: Math.floor(Math.random() * 12) + 6,
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.floor(Math.random() * 28) + 1),
          description: "Digital literacy training sessions",
          skillsApplied: ["Teaching", "Technology"],
          outcomes: "Taught 30 students basic computer skills",
        });
      }

      await tx.insert(volunteerActivities).values(activities);

      // Seed Project Impacts (past 6 months for charts)
      console.log("Creating project impacts...");
      const impacts = [];
      
      for (let month = 0; month < 7; month++) {
        const monthDate = new Date(startDate);
        monthDate.setMonth(startDate.getMonth() + month);
        
        impacts.push(
          {
            projectId: waterProject.id,
            metricId: metric1.id,
            value: Math.floor(Math.random() * 200) + 100,
            date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 15),
            notes: "Monthly water access impact measurement",
          },
          {
            projectId: eduProject.id,
            metricId: metric2.id,
            value: Math.floor(Math.random() * 50) + 30,
            date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 15),
            notes: "Students completing digital literacy program",
          },
          {
            projectId: healthProject.id,
            metricId: metric3.id,
            value: Math.floor(Math.random() * 150) + 80,
            date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 15),
            notes: "Healthcare services provided at mobile clinics",
          }
        );
      }

      await tx.insert(projectImpacts).values(impacts);

      // Seed Calendar Events
      console.log("Creating calendar events...");
      const today = new Date();
      await tx.insert(calendarEvents).values([
        {
          title: "Water System Installation - Team A",
          description: "Install filtration system at community center",
          projectId: waterProject.id,
          eventType: "volunteer_shift",
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 9, 0),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 17, 0),
          location: "Community Center, Nairobi",
          attendees: [volunteer1.id],
        },
        {
          title: "Project Planning Meeting",
          description: "Monthly planning and review meeting",
          projectId: waterProject.id,
          eventType: "meeting",
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 14, 0),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 16, 0),
          location: "Virtual",
          attendees: [volunteer1.id, volunteer2.id, volunteer3.id],
        },
        {
          title: "Digital Literacy Training Session",
          description: "Weekly training for new batch of students",
          projectId: eduProject.id,
          eventType: "training",
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 10, 0),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 14, 0),
          location: "Community Learning Center",
          attendees: [volunteer3.id],
        },
        {
          title: "Impact Report Deadline",
          description: "Submit Q4 impact assessment report",
          projectId: healthProject.id,
          eventType: "deadline",
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 17, 0),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 17, 0),
          location: "N/A",
        },
        {
          title: "Health Screening Camp",
          description: "Mobile health clinic at remote village",
          projectId: healthProject.id,
          eventType: "volunteer_shift",
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 8, 0),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10, 18, 0),
          location: "Village Health Post",
          attendees: [volunteer2.id],
        },
      ]);

      console.log("✅ All data inserted successfully!");
    });

    console.log("\n📊 Summary:");
    console.log("- 6 users (3 volunteers, 3 organization admins)");
    console.log("- 3 organizations");
    console.log("- 4 projects");
    console.log("- 5 tasks");
    console.log("- 5 impact metrics");
    console.log("- 21 volunteer activities (7 months × 3 volunteers)");
    console.log("- 21 project impacts (7 months × 3 metrics)");
    console.log("- 5 calendar events");
    console.log("\n🔑 Test Credentials (Firebase Auth required separately):");
    console.log("Volunteers:");
    console.log("  - sarah@volunteers.com");
    console.log("  - michael@volunteers.com");
    console.log("  - emma@volunteers.com");
    console.log("Organizations:");
    console.log("  - admin@wateraid.org");
    console.log("  - admin@educate.org");
    console.log("  - admin@healthaccess.org");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    // Ensure graceful shutdown
    process.exit(0);
  }
}

// Run the seed function
seedDatabase().catch((error) => {
  console.error("Failed to seed database:", error);
  process.exit(1);
});
