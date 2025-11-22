import { storage } from "./storage";

// Simple email transporter (can be replaced with actual email service)
const transporter = {
  sendMail: async (options: any) => {
    console.log(`[EMAIL] To: ${options.to}, Subject: ${options.subject}`);
    // In production, use actual email service like SendGrid, Mailgun, or nodemailer
    return { response: "Email queued (mock)" };
  }
};

interface WeeklyDigestData {
  userId: number;
  displayName: string;
  email: string;
  totalHours: number;
  tasksCompleted: number;
  projectsContributed: number;
  activitiesThisWeek: Array<{
    projectName: string;
    hours: number;
    date: string;
    description?: string;
  }>;
  impactMetrics: Array<{
    metricName: string;
    value: number;
    unit: string;
    outcomeType: string;
    role: string;
  }>;
  impactScore: number;
  sdgsSupported: number[];
  weeklyStreak?: number; // Consecutive weeks with activity
}

// Get weekly summary data for a volunteer
async function getWeeklyDigestData(userId: number): Promise<WeeklyDigestData | null> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return null;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get activities from the past week
    const allActivities = await storage.listVolunteerActivities();
    const weeklyActivities = allActivities.filter((a: any) => {
      const actDate = new Date(a.date);
      return actDate >= weekAgo && a.userId === userId;
    });

    // Get impact metrics logged this week
    const allImpacts = await storage.listProjectImpacts();
    const weeklyImpacts = allImpacts.filter((i: any) => {
      const impactDate = new Date(i.date);
      return impactDate >= weekAgo && i.userId === userId && !i.isDuplicated;
    });

    // Get impact metric definitions
    const impactMetrics = await storage.listImpactMetrics();
    const metricMap = new Map(impactMetrics.map((m: any) => [m.id, m]));

    // Get projects for this volunteer
    const assignments = await storage.listProjectAssignmentsByVolunteer(userId);
    const projects: Record<number, any> = {};
    
    for (const assignment of assignments) {
      if (assignment.projectId) {
        const project = await storage.getProject(assignment.projectId);
        if (project) projects[assignment.projectId] = project;
      }
    }

    // Calculate metrics
    const totalHours = weeklyActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
    const tasks = await storage.listTasks();
    const userTasks = tasks.filter((t: any) => {
      // Check if any assignment for this task belongs to this user
      return t.projectId && assignments.some(a => a.projectId === t.projectId);
    });
    const tasksCompleted = userTasks.filter((t: any) => t.status?.toLowerCase() === 'completed').length;
    const uniqueProjects = new Set(weeklyActivities.map((a: any) => a.projectId).filter(Boolean));
    const projectsContributed = uniqueProjects.size;

    // Get SDGs
    const volunteerProfile = await storage.getVolunteerProfile(userId);
    const sdgsSupported = volunteerProfile?.preferredSdgs || [];

    // Format impact metrics with role-based attribution
    const formattedImpacts = weeklyImpacts.map((impact: any) => {
      const metric = metricMap.get(impact.metricId);
      return {
        metricName: metric?.name || 'Unknown Metric',
        value: impact.value,
        unit: metric?.unit || '',
        outcomeType: impact.outcomeType || 'individual',
        role: impact.role || 'support'
      };
    });

    // Calculate weekly streak (consecutive weeks with activity)
    let weeklyStreak = 0;
    const checkDate = new Date(weekAgo);
    while (true) {
      const weekStart = new Date(checkDate);
      const weekEnd = new Date(checkDate);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const hasActivity = allActivities.some((a: any) => {
        const actDate = new Date(a.date);
        return actDate >= weekStart && actDate < weekEnd && a.userId === userId;
      });

      if (!hasActivity) break;
      weeklyStreak++;
      checkDate.setDate(checkDate.getDate() - 7);
    }

    // Calculate impact score (0-100)
    const impactScore = Math.min(
      Math.round(
        (totalHours / 10) * 20 +
        (tasksCompleted / 10) * 30 +
        (projectsContributed / 3) * 20 +
        (sdgsSupported.length / 5) * 20 +
        (weeklyActivities.length / 5) * 10
      ),
      100
    );

    // Format activities
    const activitiesThisWeek = weeklyActivities.slice(0, 10).map((activity: any) => ({
      projectName: projects[activity.projectId]?.name || 'Unknown Project',
      hours: activity.hours || 0,
      date: new Date(activity.date).toLocaleDateString(),
      description: activity.description || undefined
    }));

    return {
      userId,
      displayName: user.displayName || user.username || 'Volunteer',
      email: user.email,
      totalHours,
      tasksCompleted,
      projectsContributed,
      activitiesThisWeek,
      impactMetrics: formattedImpacts,
      impactScore,
      sdgsSupported,
      weeklyStreak
    };
  } catch (error) {
    console.error(`Error generating digest for user ${userId}:`, error);
    return null;
  }
}

// Generate HTML email template for digest
function generateEmailTemplate(digest: WeeklyDigestData): string {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekEnd = new Date();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; }
          .streak-badge { display: inline-block; background: #fbbf24; color: #78350f; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 12px; margin-top: 10px; }
          .metrics { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin: 30px 0; }
          .metric-card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
          .metric-value { font-size: 28px; font-weight: bold; color: #3b82f6; }
          .metric-label { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-top: 5px; }
          .activities { margin: 30px 0; }
          .activity-item { background: #f9fafb; padding: 15px; border-left: 4px solid #3b82f6; margin-bottom: 10px; border-radius: 4px; }
          .activity-project { font-weight: bold; color: #111827; }
          .activity-hours { color: #3b82f6; font-weight: bold; }
          .activity-date { font-size: 12px; color: #6b7280; }
          .impact-section { margin: 30px 0; }
          .impact-item { background: #ecfdf5; padding: 12px; border-left: 4px solid #10b981; margin-bottom: 8px; border-radius: 4px; font-size: 13px; }
          .impact-value { font-weight: bold; color: #047857; }
          .impact-meta { font-size: 11px; color: #6b7280; margin-top: 4px; }
          .footer { background: #f3f4f6; padding: 20px; border-radius: 8px; font-size: 12px; color: #6b7280; text-align: center; margin-top: 30px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .sdg-list { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 15px 0; }
          .sdg-badge { background: white; border: 1px solid #e5e7eb; padding: 5px 10px; border-radius: 4px; font-size: 12px; }
          .section-title { color: #111827; font-size: 18px; font-weight: bold; margin-top: 25px; margin-bottom: 15px; }
          .no-data { background: #fef3c7; padding: 15px; border-radius: 6px; color: #92400e; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Your Weekly Impact Digest</h1>
            <p>Week of ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}</p>
            ${digest.weeklyStreak && digest.weeklyStreak > 1 ? `<span class="streak-badge">🔥 ${digest.weeklyStreak} Week Streak!</span>` : ''}
          </div>

          <p>Hi ${digest.displayName},</p>
          <p>Here's a personalized summary of your volunteer impact this week on Synerxus. You're making a real difference!</p>

          <div class="metrics">
            <div class="metric-card">
              <div class="metric-value">${digest.totalHours}</div>
              <div class="metric-label">Hours</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${digest.tasksCompleted}</div>
              <div class="metric-label">Tasks Done</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${digest.projectsContributed}</div>
              <div class="metric-label">Projects</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${digest.impactScore}</div>
              <div class="metric-label">Impact Score</div>
            </div>
          </div>

          ${digest.sdgsSupported.length > 0 ? `
            <div style="text-align: center;">
              <p style="margin-bottom: 10px; color: #6b7280; font-size: 14px;">Supporting these UN Sustainable Development Goals:</p>
              <div class="sdg-list">
                ${digest.sdgsSupported.slice(0, 5).map(sdg => `<span class="sdg-badge">SDG ${sdg}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${digest.activitiesThisWeek.length > 0 ? `
            <div class="activities">
              <h2 class="section-title">📋 This Week's Activities</h2>
              ${digest.activitiesThisWeek.map(activity => `
                <div class="activity-item">
                  <div class="activity-project">${activity.projectName}</div>
                  <div class="activity-hours">${activity.hours} hours logged</div>
                  <div class="activity-date">${activity.date}</div>
                  ${activity.description ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #4b5563;">${activity.description}</p>` : ''}
                </div>
              `).join('')}
            </div>
          ` : `
            <p class="no-data">
              ℹ️ No activities logged this week. Get started by joining a project or logging your hours!
            </p>
          `}

          ${digest.impactMetrics.length > 0 ? `
            <div class="impact-section">
              <h2 class="section-title">🎯 Measured Impact</h2>
              ${digest.impactMetrics.map(impact => `
                <div class="impact-item">
                  <span class="impact-value">${impact.value} ${impact.unit}</span> - ${impact.metricName}
                  <div class="impact-meta">
                    Classification: ${impact.outcomeType} | Your Role: ${impact.role} (${impact.role === 'lead' ? '100%' : impact.role === 'support' ? '50%' : 'Participant'} credit)
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div style="text-align: center;">
            <a href="${process.env.APP_URL || 'https://synerxus.replit.dev'}/impact-report" class="button">View Your Full Impact Report</a>
          </div>

          <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0284c7;">
            <p style="margin: 0; font-size: 13px; color: #0c4a6e;">
              <strong>💡 Tip:</strong> Enable email digests in your profile settings to receive these personalized summaries every week!
            </p>
          </div>

          <div class="footer">
            <p style="margin: 0 0 10px 0;">Synerxus - Connect. Collaborate. Impact Globally.</p>
            <p style="margin: 0;">This email was sent because you have email digests enabled in your account settings.</p>
            <p style="margin: 10px 0 0 0;"><a href="${process.env.APP_URL || 'https://synerxus.replit.dev'}/volunteer-profile-settings" style="color: #3b82f6; text-decoration: none;">Manage Notification Settings</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Send email digest to a user
async function sendWeeklyDigest(userId: number): Promise<boolean> {
  try {
    const digestData = await getWeeklyDigestData(userId);
    if (!digestData) {
      console.warn(`Could not generate digest data for user ${userId}`);
      return false;
    }

    const htmlContent = generateEmailTemplate(digestData);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'digests@synerxus.io',
      to: digestData.email,
      subject: `📊 Your Weekly Impact Summary - ${digestData.totalHours}h Contributed${digestData.weeklyStreak && digestData.weeklyStreak > 1 ? ` (${digestData.weeklyStreak}🔥)` : ''}`,
      html: htmlContent,
      text: `Hi ${digestData.displayName},\n\nHere's your weekly impact summary:\n- ${digestData.totalHours} hours contributed\n- ${digestData.tasksCompleted} tasks completed\n- ${digestData.impactMetrics.length} impact metrics logged\n- Impact Score: ${digestData.impactScore}/100\n\nView your full report: ${process.env.APP_URL || 'https://synerxus.replit.dev'}/impact-report`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Digest] Weekly digest sent to ${digestData.email} (${digestData.totalHours}h, ${digestData.impactMetrics.length} impacts)`);
    return true;
  } catch (error) {
    console.error(`Error sending digest to user ${userId}:`, error);
    return false;
  }
}

// Send digests to all subscribed volunteers
async function sendWeeklyDigestsToAll(): Promise<{ sent: number; failed: number }> {
  try {
    const allUsers = await storage.listUsers();
    const volunteers = allUsers.filter((u: any) => u.userType === 'volunteer');
    
    let sent = 0;
    let failed = 0;

    console.log(`[Digest] Starting weekly digest send to ${volunteers.length} volunteers...`);

    for (const volunteer of volunteers) {
      // Send digest to all volunteers (email preference can be added to schema later)
      const success = await sendWeeklyDigest(volunteer.id);
      if (success) sent++;
      else failed++;
    }

    console.log(`[Digest] Weekly digests completed - Sent: ${sent}, Failed: ${failed}`);
    return { sent, failed };
  } catch (error) {
    console.error('Error sending weekly digests:', error);
    return { sent: 0, failed: 0 };
  }
}

// Organization digest
function generateOrganizationEmailTemplate(digest: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 30px 0; }
          .metric-card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
          .metric-value { font-size: 32px; font-weight: bold; color: #10b981; }
          .metric-label { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-top: 5px; }
          .insight-box { background: #ecfdf5; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0; border-radius: 4px; }
          .insight-box p { margin: 0; font-size: 13px; color: #047857; }
          .footer { background: #f3f4f6; padding: 20px; border-radius: 8px; font-size: 12px; color: #6b7280; text-align: center; margin-top: 30px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Organization Weekly Impact Report</h1>
            <p>Your Team's Collective Impact</p>
          </div>

          <p>Hi ${digest.organizationName},</p>
          <p>Here's your organization's comprehensive impact summary for this week on Synerxus.</p>

          <div class="metrics">
            <div class="metric-card">
              <div class="metric-value">${digest.activeVolunteers}</div>
              <div class="metric-label">Active Volunteers</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${digest.totalHours}</div>
              <div class="metric-label">Hours Logged</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${digest.impactRecorded}</div>
              <div class="metric-label">Impacts Recorded</div>
            </div>
          </div>

          ${digest.weeklyInsights && digest.weeklyInsights.length > 0 ? `
            <div>
              <h3 style="color: #111827; margin: 20px 0 10px 0;">📈 Weekly Insights</h3>
              ${digest.weeklyInsights.map((insight: string) => `
                <div class="insight-box">
                  <p>${insight}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div style="text-align: center;">
            <a href="${process.env.APP_URL || 'https://synerxus.replit.dev'}/organization-impact-report" class="button">View Full Organization Report</a>
          </div>

          <div class="footer">
            <p style="margin: 0 0 10px 0;">Synerxus - Connect. Collaborate. Impact Globally.</p>
            <p style="margin: 0;">This email was sent to ${digest.managerEmail}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function sendOrganizationWeeklyDigest(organizationId: number): Promise<boolean> {
  try {
    const org = await storage.getOrganization(organizationId);
    if (!org) return false;

    // Get organization metrics for the week
    const projects = await storage.listProjects();
    const orgProjects = projects.filter((p: any) => p.organizationId === organizationId);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let totalHours = 0;
    let activeVolunteers = 0;
    let impactRecorded = 0;
    const volunteerIds = new Set<number>();
    
    // Aggregate data
    for (const project of orgProjects) {
      const activities = await storage.listVolunteerActivities();
      const projectActivities = activities.filter((a: any) => 
        a.projectId === project.id && new Date(a.date) >= weekAgo
      );
      totalHours += projectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
      projectActivities.forEach((a: any) => volunteerIds.add(a.userId || 0));

      const impacts = await storage.listProjectImpactsByProject(project.id);
      const projectImpacts = impacts.filter((i: any) => 
        new Date(i.date) >= weekAgo && !i.isDuplicated
      );
      impactRecorded += projectImpacts.length;
    }
    
    activeVolunteers = volunteerIds.size;

    // Generate insights
    const weeklyInsights = [];
    if (totalHours > 0) {
      weeklyInsights.push(`Your volunteers logged ${totalHours} hours of service this week across ${orgProjects.length} projects.`);
    }
    if (activeVolunteers > 0) {
      weeklyInsights.push(`${activeVolunteers} volunteers contributed to your organization's mission this week.`);
    }
    if (impactRecorded > 0) {
      weeklyInsights.push(`${impactRecorded} impact metrics were recorded and verified by your team.`);
    }
    if (activeVolunteers === 0 && totalHours === 0) {
      weeklyInsights.push('No activities were logged this week. Consider reaching out to volunteers to encourage participation.');
    }

    const digest = {
      organizationName: org.name,
      managerEmail: org.contactEmail || 'contact@organization.com',
      activeVolunteers,
      totalHours,
      impactRecorded,
      weeklyInsights
    };

    const htmlContent = generateOrganizationEmailTemplate(digest);
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'digests@synerxus.io',
      to: org.contactEmail || 'contact@organization.com',
      subject: `📊 ${org.name} - Weekly Impact Report (${totalHours}h, ${activeVolunteers} volunteers)`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Digest] Organization digest sent to ${org.contactEmail}`);
    return true;
  } catch (error) {
    console.error(`Error sending org digest for ${organizationId}:`, error);
    return false;
  }
}

export {
  sendWeeklyDigest,
  sendWeeklyDigestsToAll,
  sendOrganizationWeeklyDigest,
  getWeeklyDigestData,
  generateEmailTemplate
};
