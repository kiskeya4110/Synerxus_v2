// Seed MemStorage with dummy data for testing
// This runs automatically on server startup in development mode

import { storage } from "./storage";

export async function seedMemStorage() {
  console.log("🌱 Seeding MemStorage with test data...");

  try {
    // Create impact metrics first (no dependencies)
    const metrics = await Promise.all([
      storage.createImpactMetric({
        name: "People with Clean Water Access",
        unit: "people",
        category: "health"
      }),
      storage.createImpactMetric({
        name: "Books Distributed",
        unit: "books",
        category: "education"
      }),
      storage.createImpactMetric({
        name: "Health Screenings Conducted",
        unit: "screenings",
        category: "health"
      }),
      storage.createImpactMetric({
        name: "Students Enrolled",
        unit: "students",
        category: "education"
      }),
      storage.createImpactMetric({
        name: "Communities Served",
        unit: "communities",
        category: "community"
      })
    ]);

    // Create organizations
    const org1 = await storage.createOrganization({
      name: "WaterAid International",
      description: "Global organization dedicated to providing clean water and sanitation",
      website: "https://wateraid.org",
      location: "Global",
      mission: "Everyone, everywhere has clean water, decent toilets and good hygiene"
    });

    const org2 = await storage.createOrganization({
      name: "Education for All",
      description: "Building libraries and educational resources in underserved communities",
      website: "https://educationforall.org",
      location: "Africa, Asia",
      mission: "Quality education accessible to all children worldwide"
    });

    const org3 = await storage.createOrganization({
      name: "HealthAccess Initiative",
      description: "Mobile health clinics bringing healthcare to remote areas",
      website: "https://healthaccess.org",
      location: "Rural Africa",
      mission: "Healthcare access for every community, no matter how remote"
    });

    // Create users (volunteers and org admins)
    const volunteer1 = await storage.createUser({
      username: "volunteer_sarah",
      email: "sarah@volunteers.com",
      userType: "volunteer"
    });

    const volunteer2 = await storage.createUser({
      username: "volunteer_michael",
      email: "michael@volunteers.com",
      userType: "volunteer"
    });

    const volunteer3 = await storage.createUser({
      username: "volunteer_emma",
      email: "emma@volunteers.com",
      userType: "volunteer"
    });

    await storage.createUser({
      username: "wateraid_admin",
      email: "admin@wateraid.org",
      userType: "organization"
    });

    await storage.createUser({
      username: "educate_admin",
      email: "admin@educate.org",
      userType: "organization"
    });

    await storage.createUser({
      username: "health_admin",
      email: "admin@healthaccess.org",
      userType: "organization"
    });

    // Create projects
    const project1 = await storage.createProject({
      name: "Clean Water Initiative",
      description: "Installing water purification systems in rural villages",
      organizationId: org1.id,
      status: "Active",
      startDate: new Date("2024-01-15"),
      location: "Kenya",
      sdgGoals: [6, 3] // Clean Water & Sanitation, Good Health
    });

    const project2 = await storage.createProject({
      name: "Community Library Program",
      description: "Building and stocking libraries in underserved schools",
      organizationId: org2.id,
      status: "In Progress",
      startDate: new Date("2024-03-01"),
      location: "India",
      sdgGoals: [4, 10] // Quality Education, Reduced Inequalities
    });

    const project3 = await storage.createProject({
      name: "Mobile Health Clinics",
      description: "Providing medical care via mobile units",
      organizationId: org3.id,
      status: "Active",
      startDate: new Date("2024-02-10"),
      location: "Tanzania",
      sdgGoals: [3, 10] // Good Health, Reduced Inequalities
    });

    const project4 = await storage.createProject({
      name: "Youth Mentorship Program",
      description: "Connecting young people with career mentors",
      organizationId: org2.id,
      status: "Planning",
      startDate: new Date("2024-09-01"),
      location: "Global",
      sdgGoals: [4, 8] // Quality Education, Decent Work
    });

    // Create tasks
    await storage.createTask({
      title: "Survey water sources",
      description: "Conduct survey of local water sources",
      projectId: project1.id,
      status: "Completed",
      priority: "High"
    });

    await storage.createTask({
      title: "Install purification system",
      description: "Install and test water purification equipment",
      projectId: project1.id,
      status: "In Progress",
      priority: "High"
    });

    await storage.createTask({
      title: "Catalog donated books",
      description: "Sort and catalog 500 donated books",
      projectId: project2.id,
      status: "Completed",
      priority: "Medium"
    });

    await storage.createTask({
      title: "Build library shelves",
      description: "Construct shelving units for new library",
      projectId: project2.id,
      status: "In Progress",
      priority: "Medium"
    });

    await storage.createTask({
      title: "Health screening setup",
      description: "Prepare mobile clinic for health screenings",
      projectId: project3.id,
      status: "Completed",
      priority: "High"
    });

    // Create volunteer activities (7 months of data for 3 volunteers)
    const baseDate = new Date();
    baseDate.setMonth(baseDate.getMonth() - 6);

    for (let month = 0; month < 7; month++) {
      const activityDate = new Date(baseDate);
      activityDate.setMonth(baseDate.getMonth() + month);

      // Volunteer 1 activities
      await storage.createVolunteerActivity({
        userId: volunteer1.id,
        projectId: project1.id,
        date: activityDate,
        hours: 8 + Math.floor(Math.random() * 8),
        description: "Water system installation and community training",
        skills: ["plumbing", "training"]
      });

      // Volunteer 2 activities
      await storage.createVolunteerActivity({
        userId: volunteer2.id,
        projectId: project2.id,
        date: activityDate,
        hours: 6 + Math.floor(Math.random() * 6),
        description: "Library setup and book cataloging",
        skills: ["organization", "education"]
      });

      // Volunteer 3 activities
      await storage.createVolunteerActivity({
        userId: volunteer3.id,
        projectId: project3.id,
        date: activityDate,
        hours: 10 + Math.floor(Math.random() * 6),
        description: "Mobile health clinic support",
        skills: ["healthcare", "community outreach"]
      });
    }

    // Create project impacts (7 months of data for 3 metrics)
    for (let month = 0; month < 7; month++) {
      const impactDate = new Date(baseDate);
      impactDate.setMonth(baseDate.getMonth() + month);

      // Clean water impact
      await storage.createProjectImpact({
        projectId: project1.id,
        metricId: metrics[0].id,
        value: 150 + (month * 50),
        date: impactDate,
        notes: "Cumulative people with clean water access"
      });

      // Books distributed
      await storage.createProjectImpact({
        projectId: project2.id,
        metricId: metrics[1].id,
        value: 100 + (month * 75),
        date: impactDate,
        notes: "Books distributed to community libraries"
      });

      // Health screenings
      await storage.createProjectImpact({
        projectId: project3.id,
        metricId: metrics[2].id,
        value: 80 + (month * 40),
        date: impactDate,
        notes: "Health screenings conducted in mobile clinics"
      });
    }

    // Create calendar events
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    await storage.createCalendarEvent({
      title: "Water System Installation",
      description: "Install purification system in Village A",
      eventType: "volunteer_shift",
      projectId: project1.id,
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000),
      location: "Village A, Kenya"
    });

    await storage.createCalendarEvent({
      title: "Team Meeting",
      description: "Monthly progress review meeting",
      eventType: "meeting",
      projectId: project2.id,
      startTime: nextWeek,
      endTime: new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000),
      location: "Virtual"
    });

    const twoWeeks = new Date(now);
    twoWeeks.setDate(twoWeeks.getDate() + 14);

    await storage.createCalendarEvent({
      title: "Report Deadline",
      description: "Submit quarterly impact report",
      eventType: "deadline",
      projectId: project3.id,
      startTime: twoWeeks,
      endTime: twoWeeks,
      location: "Online"
    });

    await storage.createCalendarEvent({
      title: "Volunteer Training",
      description: "Health screening training for new volunteers",
      eventType: "training",
      projectId: project3.id,
      startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      location: "Training Center"
    });

    await storage.createCalendarEvent({
      title: "Library Opening",
      description: "Grand opening of community library",
      eventType: "volunteer_shift",
      projectId: project2.id,
      startTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
      location: "Community Center, India"
    });

    // Create opportunities
    await storage.createOpportunity({
      title: "Water Filtration System Installation",
      description: "Help install and maintain water filtration systems in rural Kenyan villages. Training provided.",
      projectId: project1.id,
      organizationId: org1.id,
      category: "healthcare",
      location: "Kenya",
      isRemote: false,
      timeCommitment: "2-3 weeks",
      requiredSkills: ["plumbing", "engineering", "community outreach"],
      startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
      status: "active"
    });

    await storage.createOpportunity({
      title: "Mobile Library Assistant",
      description: "Support our mobile library program by organizing books, reading to children, and helping with literacy programs.",
      projectId: project2.id,
      organizationId: org2.id,
      category: "education",
      location: "India",
      isRemote: false,
      timeCommitment: "1-2 months",
      requiredSkills: ["teaching", "organization", "literacy"],
      startDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 80 * 24 * 60 * 60 * 1000),
      status: "active"
    });

    await storage.createOpportunity({
      title: "Mobile Health Clinic Coordinator",
      description: "Coordinate mobile health clinics in remote areas. Assist with patient registration, basic health screenings, and logistics.",
      projectId: project3.id,
      organizationId: org3.id,
      category: "healthcare",
      location: "Tanzania",
      isRemote: false,
      timeCommitment: "4-6 weeks",
      requiredSkills: ["healthcare", "logistics", "communication"],
      startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 49 * 24 * 60 * 60 * 1000),
      status: "active"
    });

    await storage.createOpportunity({
      title: "Remote Data Analysis for Impact Reporting",
      description: "Help analyze volunteer activity data and create impact reports. Perfect for data enthusiasts who want to contribute remotely.",
      projectId: project1.id,
      organizationId: org1.id,
      category: "community",
      location: "Remote",
      isRemote: true,
      timeCommitment: "10-15 hours/week",
      requiredSkills: ["data analysis", "reporting", "Excel"],
      startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: "active"
    });

    await storage.createOpportunity({
      title: "Youth Mentorship Program Leader",
      description: "Lead mentorship sessions for young adults in career development. Share your professional experience and guide the next generation.",
      projectId: project4.id,
      organizationId: org2.id,
      category: "education",
      location: "Remote",
      isRemote: true,
      timeCommitment: "5-10 hours/week",
      requiredSkills: ["mentoring", "leadership", "communication"],
      startDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      status: "active"
    });

    await storage.createOpportunity({
      title: "Community Health Educator",
      description: "Teach community members about nutrition, hygiene, and preventive health practices. Make a lasting impact on public health.",
      projectId: project3.id,
      organizationId: org3.id,
      category: "healthcare",
      location: "Tanzania",
      isRemote: false,
      timeCommitment: "3-4 weeks",
      requiredSkills: ["teaching", "healthcare", "public speaking"],
      startDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 56 * 24 * 60 * 60 * 1000),
      status: "active"
    });

    console.log("✅ MemStorage seeded successfully!");
    console.log("📊 Test data includes:");
    console.log("  - 6 users (3 volunteers, 3 org admins)");
    console.log("  - 3 organizations");
    console.log("  - 4 projects");
    console.log("  - 5 tasks");
    console.log("  - 5 impact metrics");
    console.log("  - 21 volunteer activities");
    console.log("  - 21 project impacts");
    console.log("  - 5 calendar events");
    console.log("  - 6 opportunities");

  } catch (error) {
    console.error("❌ Error seeding MemStorage:", error);
  }
}
