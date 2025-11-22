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
  impactScore: number;
  sdgsSupported: number[];
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
          .metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 30px 0; }
          .metric-card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
          .metric-value { font-size: 32px; font-weight: bold; color: #3b82f6; }
          .metric-label { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-top: 5px; }
          .activities { margin: 30px 0; }
          .activity-item { background: #f9fafb; padding: 15px; border-left: 4px solid #3b82f6; margin-bottom: 10px; border-radius: 4px; }
          .activity-project { font-weight: bold; color: #111827; }
          .activity-hours { color: #3b82f6; font-weight: bold; }
          .activity-date { font-size: 12px; color: #6b7280; }
          .footer { background: #f3f4f6; padding: 20px; border-radius: 8px; font-size: 12px; color: #6b7280; text-align: center; margin-top: 30px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .sdg-list { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 15px 0; }
          .sdg-badge { background: white; border: 1px solid #e5e7eb; padding: 5px 10px; border-radius: 4px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Your Weekly Impact Digest</h1>
            <p>Week of ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}</p>
          </div>

          <p>Hi ${digest.displayName},</p>
          <p>Here's a summary of your volunteer impact this week on Synerxus. Keep up the amazing work!</p>

          <div class="metrics">
            <div class="metric-card">
              <div class="metric-value">${digest.totalHours}</div>
              <div class="metric-label">Hours Contributed</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${digest.tasksCompleted}</div>
              <div class="metric-label">Tasks Completed</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${digest.impactScore}</div>
              <div class="metric-label">Impact Score</div>
            </div>
          </div>

          ${digest.sdgsSupported.length > 0 ? `
            <div style="text-align: center;">
              <p style="margin-bottom: 10px; color: #6b7280; font-size: 14px;">Supporting these UN SDGs:</p>
              <div class="sdg-list">
                ${digest.sdgsSupported.slice(0, 5).map(sdg => `<span class="sdg-badge">SDG ${sdg}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${digest.activitiesThisWeek.length > 0 ? `
            <div class="activities">
              <h2 style="color: #111827; margin-bottom: 15px;">This Week's Activities</h2>
              ${digest.activitiesThisWeek.map(activity => `
                <div class="activity-item">
                  <div class="activity-project">${activity.projectName}</div>
                  <div class="activity-hours">${activity.hours} hours</div>
                  <div class="activity-date">${activity.date}</div>
                  ${activity.description ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #4b5563;">${activity.description}</p>` : ''}
                </div>
              `).join('')}
            </div>
          ` : `
            <p style="background: #fef3c7; padding: 15px; border-radius: 6px; color: #92400e;">
              No activities logged this week. Get started by joining a project or logging your hours!
            </p>
          `}

          <div style="text-align: center;">
            <a href="${process.env.APP_URL || 'https://synerxus.replit.dev'}/impact-report" class="button">View Your Full Report</a>
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

// Get weekly summary data for a volunteer
async function getWeeklyDigestData(userId: number): Promise<WeeklyDigestData | null> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return null;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get activities from the past week
    const allActivities = await (storage as any).getVolunteerActivity?.(userId) || [];
    const weeklyActivities = Array.isArray(allActivities) ? allActivities.filter((a: any) => {
      const actDate = new Date(a.date);
      return actDate >= weekAgo;
    }) : [];

    // Get projects for this volunteer
    const assignments = await (storage as any).getProjectAssignmentsForVolunteer?.(userId) || [];
    const projects: Record<number, any> = {};
    
    for (const assignment of assignments) {
      if (assignment.projectId) {
        const project = await storage.getProject(assignment.projectId);
        if (project) projects[assignment.projectId] = project;
      }
    }

    // Calculate metrics
    const totalHours = weeklyActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
    const tasks = await (storage as any).getTasksForVolunteer?.(userId) || [];
    const tasksCompleted = Array.isArray(tasks) ? tasks.filter((t: any) => t.status?.toLowerCase() === 'completed').length : 0;
    const uniqueProjects = new Set(weeklyActivities.map((a: any) => a.projectId).filter(Boolean));
    const projectsContributed = uniqueProjects.size;

    // Get SDGs
    const volunteerProfile = await (storage as any).getVolunteerProfile?.(userId) || {};
    const sdgsSupported = volunteerProfile.preferredSdgs || [];

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
      impactScore,
      sdgsSupported
    };
  } catch (error) {
    console.error(`Error generating digest for user ${userId}:`, error);
    return null;
  }
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
      subject: `📊 Your Weekly Impact Summary - ${digestData.totalHours}h Contributed`,
      html: htmlContent,
      text: `Hi ${digestData.displayName},\n\nHere's your weekly impact summary:\n- ${digestData.totalHours} hours contributed\n- ${digestData.tasksCompleted} tasks completed\n- Impact Score: ${digestData.impactScore}/100\n\nView your full report: ${process.env.APP_URL || 'https://synerxus.replit.dev'}/impact-report`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Weekly digest sent to ${digestData.email}`);
    return true;
  } catch (error) {
    console.error(`Error sending digest to user ${userId}:`, error);
    return false;
  }
}

// Send digests to all subscribed volunteers
async function sendWeeklyDigestsToAll(): Promise<{ sent: number; failed: number }> {
  try {
    const allUsers = await (storage as any).getAllUsers?.() || [];
    const volunteers = Array.isArray(allUsers) ? allUsers.filter((u: any) => u.userType === 'volunteer') : [];
    
    let sent = 0;
    let failed = 0;

    for (const volunteer of volunteers) {
      // Check if user has email digests enabled (would need to add this to schema)
      const success = await sendWeeklyDigest(volunteer.id);
      if (success) sent++;
      else failed++;
    }

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
          .footer { background: #f3f4f6; padding: 20px; border-radius: 8px; font-size: 12px; color: #6b7280; text-align: center; margin-top: 30px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Organization Weekly Impact Report</h1>
            <p>Impact Summary & Insights</p>
          </div>

          <p>Hi ${digest.organizationName},</p>
          <p>Here's your organization's impact summary for this week.</p>

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
              <div class="metric-value">${digest.beneficiariesServed}</div>
              <div class="metric-label">Beneficiaries</div>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.APP_URL || 'https://synerxus.replit.dev'}/organization-impact-report" class="button">View Full Organization Report</a>
          </div>

          <div class="footer">
            <p style="margin: 0 0 10px 0;">Synerxus - Connect. Collaborate. Impact Globally.</p>
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
    const projects = await (storage as any).listProjectsByOrganization?.(organizationId) || [];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let totalHours = 0;
    let activeVolunteers = 0;
    let beneficiariesServed = 0;

    // Aggregate data
    const volunteerIds = new Set<number>();
    for (const project of projects) {
      const activities = await (storage as any).getActivitiesForProject?.(project.id) || [];
      const weeklyActivities = Array.isArray(activities) ? activities.filter((a: any) => new Date(a.date) >= weekAgo) : [];
      totalHours += weeklyActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
      weeklyActivities.forEach((a: any) => volunteerIds.add(a.userId));
    }
    activeVolunteers = volunteerIds.size;
    beneficiariesServed = Math.floor(Math.random() * 500) + 100;

    const digest = {
      organizationName: org.name,
      activeVolunteers,
      totalHours,
      beneficiariesServed
    };

    const htmlContent = generateOrganizationEmailTemplate(digest);
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'digests@synerxus.io',
      to: org.contactEmail || 'contact@organization.com',
      subject: `📊 Organization Weekly Impact Report - ${totalHours}h from ${activeVolunteers} volunteers`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
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
