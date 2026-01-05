import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertOrganizationSchema, insertOrganizationMemberSchema } from "@shared/schema";
import { handleValidationError } from "./utils";
import { cache, CACHE_TTL } from "../cache";

export const organizationsRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/organizations - List all organizations
organizationsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const organizations = await storage.listOrganizations();
    res.json(organizations);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch organizations" });
  }
});

// GET /api/organizations/public-stats - Get public stats for all organizations
// Cached for 2 minutes to avoid expensive aggregation queries
organizationsRouter.get("/public-stats", async (req: Request, res: Response) => {
  try {
    const orgStats = await cache.getOrSet('organizations:public-stats', async () => {
      // Fetch all data in parallel for better performance
      const [organizations, allProjects, allOpportunities, allProjectAssignments, allActivities, allImpacts, matchableOrgs, allTasks] = await Promise.all([
        storage.listOrganizations(),
        storage.listProjects(),
        storage.listOpportunities(),
        storage.listProjectAssignments(),
        storage.listVolunteerActivities(),
        storage.listProjectImpacts(),
        storage.listMatchableOrganizations(),
        storage.listTasks()
      ]);

      return organizations.map((org) => {
        const orgProjects = allProjects.filter((p) => p.organizationId === org.id);
        const orgProjectIds = new Set(orgProjects.map((p) => p.id));

        const orgAssignments = allProjectAssignments.filter((pa) => orgProjectIds.has(pa.projectId!));
        const uniqueVolunteerIds = new Set(orgAssignments.map((pa) => pa.volunteerId));

        const orgOpportunities = allOpportunities.filter((o) => o.organizationId === org.id);
        const activeOpportunities = orgOpportunities.filter((o) => o.status === 'open' || o.status === 'active');

        const completedProjects = orgProjects.filter((p) => p.status === 'completed' || p.completionPercentage === 100);

        const orgActivities = allActivities.filter((a) => a.projectId && orgProjectIds.has(a.projectId));
        const totalHours = orgActivities.reduce((sum, a) => sum + (a.hours || 0), 0);

        const orgImpacts = allImpacts.filter((i) => i.projectId && orgProjectIds.has(i.projectId));
        const totalPeopleImpacted = orgImpacts.reduce((sum, i) => sum + (i.value || 0), 0);

        const orgTasks = allTasks.filter((t) => t.projectId && orgProjectIds.has(t.projectId));
        const completedTasks = orgTasks.filter((t) => t.status?.toLowerCase() === 'completed').length;
        const totalTasks = orgTasks.length;

        const uniqueSDGs = new Set<number>();
        orgProjects.forEach((project) => {
          if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
            project.sdgGoals.forEach((goal: number) => uniqueSDGs.add(goal));
          }
        });

        const hoursScore = Math.min((totalHours / 100) * 100, 100);
        const peopleScore = Math.min((totalPeopleImpacted / 100) * 100, 100);
        const tasksScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const sdgScore = (uniqueSDGs.size / 17) * 100;
        const engagementScore = Math.min((uniqueVolunteerIds.size / 10) * 100, 100);

        const impactScore = Math.round(
          hoursScore * 0.35 +
          peopleScore * 0.30 +
          tasksScore * 0.20 +
          sdgScore * 0.10 +
          engagementScore * 0.05
        );

        const profile = matchableOrgs.find((m) =>
          m.id === String(org.id) ||
          m.name?.toLowerCase() === org.name?.toLowerCase() ||
          m.email === org.contactEmail
        );

        return {
          id: org.id,
          name: org.name,
          description: org.description,
          logo: org.logo,
          website: org.website,
          contactEmail: org.contactEmail,
          stats: {
            projectCount: orgProjects.length,
            volunteerCount: uniqueVolunteerIds.size,
            activeOpportunities: activeOpportunities.length,
            completedProjects: completedProjects.length,
            totalHours,
            totalPeopleImpacted,
            impactScore
          },
          profile: profile ? {
            location: profile.location,
            sdgFocus: profile.sdgFocus,
            mission: profile.mission
          } : null
        };
      });
    }, CACHE_TTL.OPPORTUNITIES); // 2 minute cache

    res.json(orgStats);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch organization stats" });
  }
});

// GET /api/organizations/:id - Get organization by ID
organizationsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const organization = await storage.getOrganization(orgId);

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    res.json(organization);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch organization" });
  }
});

// POST /api/organizations - Create new organization
organizationsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const orgData = insertOrganizationSchema.parse(req.body);

    // Check if the organization's contact email is pre-approved
    let approvalStatus = "pending";
    const contactEmail = orgData.contactEmail?.toLowerCase().trim();

    if (contactEmail) {
      // Get pre-approved emails from platform settings
      const preApprovedSetting = await storage.getPlatformSetting("pre_approved_org_emails");
      if (preApprovedSetting?.value) {
        const preApprovedEmails = preApprovedSetting.value.split(",").map((e: string) => e.toLowerCase().trim());
        if (preApprovedEmails.includes(contactEmail)) {
          approvalStatus = "approved";
        }
      }
    }

    const organization = await storage.createOrganization({
      ...orgData,
      approvalStatus,
    });

    broadcastUpdate("organization_created", organization);
    res.status(201).json(organization);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// PATCH /api/organizations/:id - Update organization
organizationsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const orgData = insertOrganizationSchema.partial().parse(req.body);

    const updatedOrg = await storage.updateOrganization(orgId, orgData);
    if (!updatedOrg) {
      return res.status(404).json({ message: "Organization not found" });
    }

    broadcastUpdate("organization_updated", updatedOrg);
    res.json(updatedOrg);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// ============================================
// Organization Member Management Routes
// ============================================

// GET /api/organizations/:id/members - List all members of an organization
organizationsRouter.get("/:id/members", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const organization = await storage.getOrganization(orgId);

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const members = await storage.listOrganizationMembers(orgId);

    // Enrich with user data
    const enrichedMembers = await Promise.all(members.map(async (member) => {
      const user = await storage.getUser(member.userId);
      return {
        ...member,
        user: user ? {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          username: user.username,
          avatar: user.avatar
        } : null
      };
    }));

    res.json(enrichedMembers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch organization members" });
  }
});

// GET /api/organizations/:id/members/:memberId - Get specific member
organizationsRouter.get("/:id/members/:memberId", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);

    const member = await storage.getOrganizationMember(memberId);

    if (!member || member.organizationId !== orgId) {
      return res.status(404).json({ message: "Member not found" });
    }

    const user = await storage.getUser(member.userId);
    res.json({
      ...member,
      user: user ? {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        avatar: user.avatar
      } : null
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch member" });
  }
});

// POST /api/organizations/:id/members - Add a new member to organization
organizationsRouter.post("/:id/members", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const organization = await storage.getOrganization(orgId);

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Check if user exists
    const userId = req.body.userId;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already a member
    const existingMember = await storage.getOrganizationMemberByUserAndOrg(userId, orgId);
    if (existingMember) {
      return res.status(409).json({ message: "User is already a member of this organization" });
    }

    const memberData = insertOrganizationMemberSchema.parse({
      ...req.body,
      organizationId: orgId
    });

    const member = await storage.createOrganizationMember(memberData);

    broadcastUpdate("organization_member_added", { organizationId: orgId, member });
    res.status(201).json(member);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// POST /api/organizations/:id/members/invite - Invite a new member by email
organizationsRouter.post("/:id/members/invite", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const { email, role, title, department, permissions, invitedBy, invitationMethod, customMessage } = req.body;

    // Verify that the inviting user belongs to this organization
    if (!invitedBy) {
      return res.status(401).json({ message: "Authentication required - invitedBy is missing" });
    }

    const invitingUser = await storage.getUser(parseInt(invitedBy));
    if (!invitingUser) {
      return res.status(401).json({ message: "Inviting user not found" });
    }

    // Verify user belongs to this organization
    if (invitingUser.organizationId !== orgId) {
      return res.status(403).json({ message: "You can only invite members to your own organization" });
    }

    // Verify user is organization type
    if (invitingUser.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization admins can invite members" });
    }

    const organization = await storage.getOrganization(orgId);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Find user by email (optional - user may not exist yet)
    const users = await storage.listUsers();
    const user = users.find(u => u.email === email);

    // Check if already a member (only if user exists)
    if (user) {
      const existingMember = await storage.getOrganizationMemberByUserAndOrg(user.id, orgId);
      if (existingMember) {
        return res.status(409).json({ message: "User is already a member of this organization" });
      }
    }

    // Set default permissions based on role
    const defaultPermissions = {
      admin: {
        canApproveHours: true,
        canApproveApplications: true,
        canManageProjects: true,
        canManageMembers: true,
        canViewReports: true,
        canEditOrganization: true
      },
      hr: {
        canApproveHours: true,
        canApproveApplications: true,
        canManageProjects: false,
        canManageMembers: false,
        canViewReports: true,
        canEditOrganization: false
      },
      manager: {
        canApproveHours: true,
        canApproveApplications: true,
        canManageProjects: true,
        canManageMembers: false,
        canViewReports: true,
        canEditOrganization: false
      },
      member: {
        canApproveHours: false,
        canApproveApplications: false,
        canManageProjects: false,
        canManageMembers: false,
        canViewReports: true,
        canEditOrganization: false
      }
    };

    const rolePermissions = defaultPermissions[role as keyof typeof defaultPermissions] || defaultPermissions.member;
    const finalPermissions = { ...rolePermissions, ...(permissions || {}) };

    // Generate invitation token
    const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    let member = null;

    // Only create organization member record if user exists
    if (user) {
      const memberData = {
        organizationId: orgId,
        userId: user.id,
        role: role || "member",
        title,
        department,
        ...finalPermissions,
        status: "invited",
        invitedBy,
        invitedAt: new Date()
      };
      member = await storage.createOrganizationMember(memberData);
    }

    // Get inviter info
    const inviter = invitedBy ? await storage.getUser(invitedBy) : null;
    const inviterName = inviter?.displayName || organization.name;

    // Build invitation message content
    const roleDisplay = (role || "member").charAt(0).toUpperCase() + (role || "member").slice(1);
    const defaultMessageContent = `You've been invited to join ${organization.name} as a ${roleDisplay}.${title ? ` Your role will be ${title}.` : ''}${department ? ` You'll be part of the ${department} team.` : ''}`;
    const messageContent = customMessage
      ? `${defaultMessageContent}\n\nPersonal message from ${inviterName}:\n${customMessage}`
      : defaultMessageContent;

    // Determine the actual invitation method to use
    const method = invitationMethod || 'email';
    const shouldSendEmail = method === 'email' || method === 'both';
    const shouldSendDM = method === 'direct_message' || method === 'both';

    let dmMessageId: number | undefined;

    // Send direct message if requested and user exists
    if (shouldSendDM && invitedBy && user) {
      const dmMessage = await storage.createMessage({
        senderId: invitedBy,
        receiverId: user.id,
        subject: `Team Invitation: Join ${organization.name}`,
        content: messageContent,
        messageType: "team_invite",
        read: false
      });
      dmMessageId = dmMessage.id;
    }

    // Create team invitation record for tracking
    await storage.createTeamInvitation({
      organizationMemberId: member?.id || 0, // 0 if user doesn't exist yet
      organizationId: orgId,
      inviterId: invitedBy,
      inviteeId: user?.id || null,
      inviteeEmail: email,
      invitationMethod: method,
      messageSubject: `Team Invitation: Join ${organization.name}`,
      messageContent,
      customMessage: customMessage || undefined,
      role: role || "member",
      title: title || undefined,
      department: department || undefined,
      emailStatus: "pending", // We don't send emails
      dmStatus: shouldSendDM && user ? "sent" : "pending",
      dmSentAt: shouldSendDM && user ? new Date() : undefined,
      dmMessageId: dmMessageId,
      status: "pending",
      invitationToken,
      tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    // Create notification for invited user (only if user exists)
    if (user) {
      const notificationMessage = `${inviterName} has invited you to join ${organization.name} as ${roleDisplay}. Check your messages for details.`;

      await storage.createNotification({
        userId: user.id,
        type: "organization_invite",
        title: "Team Invitation",
        message: notificationMessage,
        relatedEntityType: "organization_member",
        relatedEntityId: member?.id || 0
      });
    }

    broadcastUpdate("organization_member_invited", {
      organizationId: orgId,
      member,
      user,
      invitationMethod: method
    });

    // Return invitation token for generating shareable link
    res.status(201).json({
      member,
      user: user ? { id: user.id, email: user.email, displayName: user.displayName } : null,
      invitationMethod: method,
      dmSent: shouldSendDM && !!user,
      invitationToken,
      inviteLink: `/join-team?token=${invitationToken}`,
      userExists: !!user
    });
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// POST /api/organizations/:id/members/:memberId/accept - Accept invitation
organizationsRouter.post("/:id/members/:memberId/accept", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);

    const member = await storage.getOrganizationMember(memberId);

    if (!member || member.organizationId !== orgId) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (member.status !== "invited") {
      return res.status(400).json({ message: "Invitation already processed" });
    }

    const updatedMember = await storage.updateOrganizationMember(memberId, {
      status: "active",
      acceptedAt: new Date()
    });

    broadcastUpdate("organization_member_accepted", { organizationId: orgId, member: updatedMember });
    res.json(updatedMember);
  } catch (err) {
    res.status(500).json({ message: "Failed to accept invitation" });
  }
});

// GET /api/team-invitations/:token - Get invitation details by token
organizationsRouter.get("/team-invitations/by-token/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invitation = await storage.getTeamInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found or expired" });
    }

    if (invitation.status === "accepted") {
      return res.status(400).json({ message: "Invitation already accepted" });
    }

    if (invitation.status === "declined" || invitation.status === "cancelled") {
      return res.status(400).json({ message: "Invitation is no longer valid" });
    }

    if (invitation.tokenExpiresAt && new Date(invitation.tokenExpiresAt) < new Date()) {
      return res.status(400).json({ message: "Invitation has expired" });
    }

    // Get organization details
    const organization = await storage.getOrganization(invitation.organizationId);

    res.json({
      invitation,
      organization: organization ? {
        id: organization.id,
        name: organization.name,
        logo: organization.logo,
        description: organization.description
      } : null
    });
  } catch (err) {
    console.error("Error fetching invitation:", err);
    res.status(500).json({ message: "Failed to fetch invitation" });
  }
});

// POST /api/team-invitations/:token/accept - Accept invitation via token
organizationsRouter.post("/team-invitations/by-token/:token/accept", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const invitation = await storage.getTeamInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (invitation.status === "accepted") {
      return res.status(400).json({ message: "Invitation already accepted" });
    }

    if (invitation.tokenExpiresAt && new Date(invitation.tokenExpiresAt) < new Date()) {
      return res.status(400).json({ message: "Invitation has expired" });
    }

    const user = await storage.getUser(parseInt(userId));
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is already a member
    const existingMember = await storage.getOrganizationMemberByUserAndOrg(user.id, invitation.organizationId);
    if (existingMember) {
      return res.status(409).json({ message: "You are already a member of this organization" });
    }

    // Get default permissions based on role
    const defaultPermissions = {
      admin: { canApproveHours: true, canApproveApplications: true, canManageProjects: true, canManageMembers: true, canViewReports: true, canEditOrganization: true },
      hr: { canApproveHours: true, canApproveApplications: true, canManageProjects: false, canManageMembers: false, canViewReports: true, canEditOrganization: false },
      manager: { canApproveHours: true, canApproveApplications: true, canManageProjects: true, canManageMembers: false, canViewReports: true, canEditOrganization: false },
      member: { canApproveHours: false, canApproveApplications: false, canManageProjects: false, canManageMembers: false, canViewReports: true, canEditOrganization: false }
    };

    const role = (invitation.role || "member") as "admin" | "hr" | "manager" | "member";
    const permissions = defaultPermissions[role as keyof typeof defaultPermissions] || defaultPermissions.member;

    // Create organization member record
    const member = await storage.createOrganizationMember({
      organizationId: invitation.organizationId,
      userId: user.id,
      role,
      title: invitation.title || undefined,
      department: invitation.department || undefined,
      ...permissions,
      status: "active",
      invitedBy: invitation.inviterId,
      invitedAt: invitation.createdAt,
      acceptedAt: new Date()
    });

    // Update invitation status
    await storage.updateTeamInvitation(invitation.id, {
      status: "accepted",
      respondedAt: new Date(),
      inviteeId: user.id
    });

    // Update user's organizationId if they don't have one
    if (!user.organizationId) {
      await storage.updateUser(user.id, { organizationId: invitation.organizationId });
    }

    const organization = await storage.getOrganization(invitation.organizationId);

    broadcastUpdate("organization_member_accepted", {
      organizationId: invitation.organizationId,
      member
    });

    res.json({
      success: true,
      member,
      organization: organization ? { id: organization.id, name: organization.name } : null
    });
  } catch (err) {
    console.error("Error accepting invitation:", err);
    res.status(500).json({ message: "Failed to accept invitation" });
  }
});

// PATCH /api/organizations/:id/members/:memberId - Update member role/permissions
organizationsRouter.patch("/:id/members/:memberId", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);

    const member = await storage.getOrganizationMember(memberId);

    if (!member || member.organizationId !== orgId) {
      return res.status(404).json({ message: "Member not found" });
    }

    const updateData = insertOrganizationMemberSchema.partial().parse(req.body);
    const updatedMember = await storage.updateOrganizationMember(memberId, updateData);

    broadcastUpdate("organization_member_updated", { organizationId: orgId, member: updatedMember });
    res.json(updatedMember);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// DELETE /api/organizations/:id/members/:memberId - Remove member from organization
organizationsRouter.delete("/:id/members/:memberId", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);

    const member = await storage.getOrganizationMember(memberId);

    if (!member || member.organizationId !== orgId) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Prevent removing the last admin
    const allMembers = await storage.listOrganizationMembers(orgId);
    const adminCount = allMembers.filter(m => m.role === "admin" && m.status === "active").length;

    if (member.role === "admin" && adminCount <= 1) {
      return res.status(400).json({ message: "Cannot remove the last admin. Assign another admin first." });
    }

    await storage.deleteOrganizationMember(memberId);

    broadcastUpdate("organization_member_removed", { organizationId: orgId, memberId });
    res.json({ message: "Member removed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove member" });
  }
});

// GET /api/organizations/:id/my-permissions - Get current user's permissions for this org
organizationsRouter.get("/:id/my-permissions", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const userId = parseInt(req.query.userId as string);

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // First check if this user IS the organization (organization account owner)
    const user = await storage.getUser(userId);
    const organization = await storage.getOrganization(orgId);

    // Organization owners (user type = organization and their organizationId matches)
    // have full admin permissions
    const isOrganizationOwner = user && organization &&
      user.userType === 'organization' && user.organizationId === orgId;

    if (isOrganizationOwner) {
      return res.json({
        role: "admin",
        title: "Organization Owner",
        department: "Administration",
        permissions: {
          canApproveHours: true,
          canApproveApplications: true,
          canManageProjects: true,
          canManageMembers: true,
          canViewReports: true,
          canEditOrganization: true
        },
        status: "active",
        isOwner: true
      });
    }

    // Check organization_members table for team members
    const member = await storage.getOrganizationMemberByUserAndOrg(userId, orgId);

    if (!member) {
      return res.status(404).json({ message: "Not a member of this organization" });
    }

    res.json({
      role: member.role,
      title: member.title,
      department: member.department,
      permissions: {
        canApproveHours: member.canApproveHours,
        canApproveApplications: member.canApproveApplications,
        canManageProjects: member.canManageProjects,
        canManageMembers: member.canManageMembers,
        canViewReports: member.canViewReports,
        canEditOrganization: member.canEditOrganization
      },
      status: member.status
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch permissions" });
  }
});

// ============================================
// Invitation Template Routes
// ============================================

// Default invitation templates
const DEFAULT_TEMPLATES = [
  {
    name: "Standard Team Invitation",
    description: "A professional invitation for new team members",
    subject: "You're Invited to Join {{organization_name}}",
    content: `Hello{{invitee_name ? ', ' + invitee_name : ''}},

You've been invited to join {{organization_name}} as a {{role}}{{title ? ' (' + title + ')' : ''}}.

{{#department}}You'll be part of the {{department}} team.{{/department}}

{{#custom_message}}
Personal message from {{inviter_name}}:
{{custom_message}}
{{/custom_message}}

Please click the link below to accept your invitation and get started:
{{accept_link}}

We're excited to have you on the team!

Best regards,
{{inviter_name}}
{{organization_name}}`,
    templateType: "general",
    isDefault: true,
    isActive: true
  },
  {
    name: "Admin Role Invitation",
    description: "Invitation template for admin-level positions",
    subject: "Admin Access Invitation - {{organization_name}}",
    content: `Hello{{invitee_name ? ', ' + invitee_name : ''}},

You've been invited to join {{organization_name}} as an Administrator.

As an admin, you'll have full access to manage team members, projects, and organization settings.

{{#custom_message}}
Note from {{inviter_name}}:
{{custom_message}}
{{/custom_message}}

Click here to accept your invitation: {{accept_link}}

Welcome to the leadership team!

{{inviter_name}}
{{organization_name}}`,
    templateType: "role_specific",
    forRole: "admin",
    isDefault: false,
    isActive: true
  },
  {
    name: "HR Team Invitation",
    description: "Invitation for HR team members",
    subject: "Join the HR Team at {{organization_name}}",
    content: `Hello{{invitee_name ? ', ' + invitee_name : ''}},

Welcome to the Human Resources team at {{organization_name}}!

You've been invited to join us as {{role}}{{title ? ' - ' + title : ''}}.

As part of HR, you'll be able to:
- Approve volunteer hours
- Review and approve applications
- Access reports and analytics

{{#custom_message}}
{{inviter_name}} says:
{{custom_message}}
{{/custom_message}}

Accept your invitation here: {{accept_link}}

Looking forward to working with you!

{{inviter_name}}`,
    templateType: "role_specific",
    forRole: "hr",
    isDefault: false,
    isActive: true
  }
];

// GET /api/organizations/:id/invitation-templates - List invitation templates
organizationsRouter.get("/:id/invitation-templates", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);

    // Get templates for this organization (includes org-specific and system-wide templates)
    let templates = await storage.listInvitationTemplates(orgId);

    // If no templates exist, create the default ones
    if (templates.length === 0) {
      for (const template of DEFAULT_TEMPLATES) {
        await storage.createInvitationTemplate({
          ...template,
          organizationId: null // System-wide templates
        });
      }
      templates = await storage.listInvitationTemplates(orgId);
    }

    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch invitation templates" });
  }
});

// POST /api/organizations/:id/invitation-templates - Create a custom invitation template
organizationsRouter.post("/:id/invitation-templates", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const { name, description, subject, content, templateType, forRole, forDepartment, isDefault, createdBy } = req.body;

    if (!name || !subject || !content) {
      return res.status(400).json({ message: "Name, subject, and content are required" });
    }

    const template = await storage.createInvitationTemplate({
      organizationId: orgId,
      name,
      description,
      subject,
      content,
      templateType: templateType || "general",
      forRole,
      forDepartment,
      isDefault: isDefault || false,
      isActive: true,
      usageCount: 0,
      createdBy
    });

    broadcastUpdate("invitation_template_created", { organizationId: orgId, template });
    res.status(201).json(template);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// GET /api/organizations/:id/team-invitations - List team invitations for an organization
organizationsRouter.get("/:id/team-invitations", async (req: Request, res: Response) => {
  try {
    const orgId = parseInt(req.params.id);
    const invitations = await storage.listTeamInvitations(orgId);
    res.json(invitations);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch team invitations" });
  }
});
