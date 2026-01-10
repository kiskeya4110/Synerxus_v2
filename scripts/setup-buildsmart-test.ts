/**
 * Setup test data for Build Smart Engineering
 * Links volunteers to the CSR partner and creates test activities
 */
import { db } from "../server/db";
import { csrPartners, users, volunteerProfiles, volunteerActivities, employeeEngagement, projects } from "@shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";

async function setupBuildSmartTest() {
  console.log("=== Setting Up Build Smart Engineering Test Data ===\n");

  // Find Build Smart Engineering CSR Partner
  const partners = await db.select().from(csrPartners);
  const buildSmart = partners.find(p => p.companyName && p.companyName.toLowerCase().includes('build'));

  if (!buildSmart) {
    console.log('Build Smart Engineering not found');
    return;
  }

  console.log('Found Build Smart Engineering:', buildSmart.companyName, 'ID:', buildSmart.id);

  // Find volunteer profiles that can be linked
  const profiles = await db.select().from(volunteerProfiles);
  const allUsers = await db.select().from(users);

  // Find users with volunteer type who have profiles
  const volunteerUsers = allUsers.filter(u => u.userType === 'volunteer');
  console.log('\nFound', volunteerUsers.length, 'volunteer users');

  // Get profiles with users
  const profilesWithUsers = profiles.filter(p => {
    const user = volunteerUsers.find(u => u.id === p.userId);
    return user && !p.employerId; // Not already linked
  });

  console.log('Profiles available for linking:', profilesWithUsers.length);

  if (profilesWithUsers.length === 0) {
    console.log('No available profiles to link. Let me check existing profiles...');
    console.log('Total profiles:', profiles.length);
    profiles.slice(0, 10).forEach(p => {
      const user = allUsers.find(u => u.id === p.userId);
      console.log(`  - Profile ${p.id}: userId=${p.userId}, name=${p.volunteerName}, employerId=${p.employerId}, user=${user?.email}`);
    });
    return;
  }

  // Link first 3 profiles to Build Smart Engineering
  const profilesToLink = profilesWithUsers.slice(0, 3);
  console.log('\n=== Linking Profiles to Build Smart Engineering ===');

  for (const profile of profilesToLink) {
    const user = allUsers.find(u => u.id === profile.userId);
    console.log(`Linking ${profile.volunteerName || user?.email} (Profile ID: ${profile.id}) to Build Smart...`);

    await db
      .update(volunteerProfiles)
      .set({
        employerId: buildSmart.id,
        departmentName: 'Engineering',
        jobTitleAtCompany: 'Software Engineer'
      })
      .where(eq(volunteerProfiles.id, profile.id));
  }

  console.log('Linked', profilesToLink.length, 'profiles to Build Smart Engineering');

  // Get a project to link activities to
  const allProjects = await db.select().from(projects);
  const activeProject = allProjects.find(p => p.status === 'active') || allProjects[0];

  if (!activeProject) {
    console.log('No projects found to create activities');
    return;
  }

  console.log('\n=== Creating Test Volunteer Activities ===');
  console.log('Using project:', activeProject.name, 'ID:', activeProject.id);

  // Create some volunteer activities for the linked employees
  for (const profile of profilesToLink) {
    const user = allUsers.find(u => u.id === profile.userId);

    // Create a pending activity
    await db.insert(volunteerActivities).values({
      userId: profile.userId,
      projectId: activeProject.id,
      hours: 4,
      date: new Date(),
      description: 'Volunteer work session - testing seamless dataflow',
      verificationStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create an approved activity
    await db.insert(volunteerActivities).values({
      userId: profile.userId,
      projectId: activeProject.id,
      hours: 8,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      description: 'Completed volunteer session',
      verificationStatus: 'approved',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`Created activities for ${profile.volunteerName || user?.email}`);

    // Create/update employee engagement record
    const existing = await db.select().from(employeeEngagement)
      .where(and(
        eq(employeeEngagement.partnerId, buildSmart.id),
        eq(employeeEngagement.employeeEmail, user?.email || '')
      ));

    if (existing.length === 0 && user?.email) {
      await db.insert(employeeEngagement).values({
        partnerId: buildSmart.id,
        employeeEmail: user.email,
        employeeName: profile.volunteerName || user.displayName,
        hoursVolunteered: 8, // Only count verified hours
        status: 'active'
      });
      console.log(`Created employee engagement record for ${user.email}`);
    }
  }

  console.log('\n=== Setup Complete ===');
  console.log('Linked employees:', profilesToLink.length);
  console.log('Activities created:', profilesToLink.length * 2, '(1 pending + 1 approved per employee)');
}

setupBuildSmartTest()
  .then(() => {
    console.log('\nRun test-buildsmart.ts again to verify the data');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
