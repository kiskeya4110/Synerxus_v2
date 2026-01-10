/**
 * Test script to verify Build Smart Engineering data flow
 */
import { db } from "../server/db";
import { csrPartners, users, volunteerProfiles, volunteerActivities, employeeEngagement, volunteerEmployerLinks } from "@shared/schema";
import { eq } from "drizzle-orm";

async function testBuildSmart() {
  console.log("=== Testing Build Smart Engineering Data Flow ===\n");

  // Find Build Smart Engineering CSR Partner
  const partners = await db.select().from(csrPartners);
  const buildSmart = partners.find(p => p.companyName && p.companyName.toLowerCase().includes('build'));

  if (!buildSmart) {
    console.log('Build Smart Engineering not found in CSR partners');
    console.log('Available CSR partners:', partners.map(p => ({ id: p.id, name: p.companyName, userId: p.userId })));
    return;
  }

  console.log('=== Build Smart Engineering CSR Partner ===');
  console.log('ID:', buildSmart.id);
  console.log('Company Name:', buildSmart.companyName);
  console.log('User ID:', buildSmart.userId);
  console.log('Employee Count:', buildSmart.employeeCount);
  console.log('Contact Email:', buildSmart.contactEmail);

  // Find linked employees via volunteerProfiles.employerId
  const profiles = await db.select().from(volunteerProfiles);
  const linkedProfiles = profiles.filter(p => Number(p.employerId) === buildSmart.id);
  console.log('\n=== Linked Volunteer Profiles (via employerId) ===');
  console.log('Count:', linkedProfiles.length);
  linkedProfiles.forEach(p => console.log(`  - ID: ${p.id}, UserID: ${p.userId}, Name: ${p.volunteerName}, EmployerId: ${p.employerId}`));

  // Find employees linked via volunteerEmployerLinks table
  const employerLinks = await db.select().from(volunteerEmployerLinks);
  const partnerLinks = employerLinks.filter(l => Number(l.partnerId) === buildSmart.id);
  console.log('\n=== Volunteer Employer Links ===');
  console.log('Count:', partnerLinks.length);
  partnerLinks.forEach(l => console.log(`  - VolunteerId: ${l.volunteerId}, Status: ${l.verificationStatus}, Dept: ${l.department}`));

  // Combine all linked employee user IDs
  const linkedUserIds = new Set<number>();
  linkedProfiles.forEach(p => linkedUserIds.add(p.userId));
  partnerLinks.forEach(link => {
    const profile = profiles.find(p => p.id === link.volunteerId);
    if (profile) linkedUserIds.add(profile.userId);
  });
  console.log('\n=== Total Linked Employee User IDs ===');
  console.log('Count:', linkedUserIds.size);
  console.log('IDs:', Array.from(linkedUserIds));

  // Find employee engagement records
  const engagements = await db.select().from(employeeEngagement);
  const partnerEngagements = engagements.filter(e => e.partnerId === buildSmart.id);
  console.log('\n=== Employee Engagement Records ===');
  console.log('Count:', partnerEngagements.length);
  partnerEngagements.forEach(e => console.log(`  - Email: ${e.employeeEmail}, Hours: ${e.hoursVolunteered}, Status: ${e.status}`));

  // Get volunteer activities for linked employees
  const activities = await db.select().from(volunteerActivities);
  const employeeActivities = activities.filter(a => linkedUserIds.has(a.userId));

  const pendingActivities = employeeActivities.filter(a =>
    !a.verificationStatus || a.verificationStatus === 'pending' || a.verificationStatus === 'self_reported'
  );
  const verifiedActivities = employeeActivities.filter(a =>
    a.verificationStatus === 'approved' || a.verificationStatus === 'verified'
  );

  console.log('\n=== Volunteer Activities for Linked Employees ===');
  console.log('Total activities:', employeeActivities.length);
  console.log('Pending activities:', pendingActivities.length);
  console.log('Verified activities:', verifiedActivities.length);
  console.log('Total hours (all):', employeeActivities.reduce((sum, a) => sum + (a.hours || 0), 0));
  console.log('Verified hours:', verifiedActivities.reduce((sum, a) => sum + (a.hours || 0), 0));
  console.log('Pending hours:', pendingActivities.reduce((sum, a) => sum + (a.hours || 0), 0));

  // Show some sample activities
  if (employeeActivities.length > 0) {
    console.log('\n=== Sample Activities ===');
    employeeActivities.slice(0, 5).forEach(a => {
      console.log(`  - UserID: ${a.userId}, Hours: ${a.hours}, Status: ${a.verificationStatus}, ProjectID: ${a.projectId}`);
    });
  }

  // Summary
  console.log('\n=== SUMMARY: Build Smart Engineering KPIs ===');
  console.log('Linked Employees:', linkedUserIds.size);
  console.log('Verified Hours:', verifiedActivities.reduce((sum, a) => sum + (a.hours || 0), 0));
  console.log('Pending Hours (awaiting org approval):', pendingActivities.reduce((sum, a) => sum + (a.hours || 0), 0));
  console.log('Total Volunteer Activities:', employeeActivities.length);
}

testBuildSmart()
  .then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
