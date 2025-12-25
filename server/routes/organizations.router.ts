import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertOrganizationSchema, insertOrganizationMemberSchema } from "@shared/schema";
import { handleValidationError } from "./utils";

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
organizationsRouter.get("/public-stats", async (req: Request, res: Response) => {
  try {
    const organizations = await storage.listOrganizations();
    const allProjects = await storage.listProjects();
    const allOpportunities = await storage.listOpportunities();
    const allProjectAssignments = await storage.listProjectAssignments();
    const allActivities = await storage.listVolunteerActivities();
    const allImpacts = await storage.listProjectImpacts();
    const matchableOrgs = await storage.listMatchableOrganizations();
    const allTasks = await storage.listTasks();

    const orgStats = organizations.map((org) => {
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
    const organization = await storage.createOrganization(orgData);

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
    const { email, role, title, department, permissions, invitedBy } = req.body;

    const organization = await storage.getOrganization(orgId);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Find user by email
    const users = await storage.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({
        message: "User not found. They need to register first.",
        code: "USER_NOT_FOUND"
      });
    }

    // Check if already a member
    const existingMember = await storage.getOrganizationMemberByUserAndOrg(user.id, orgId);
    if (existingMember) {
      return res.status(409).json({ message: "User is already a member of this organization" });
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

    const member = await storage.createOrganizationMember(memberData);

    // Create notification for invited user
    await storage.createNotification({
      userId: user.id,
      type: "organization_invite",
      title: "Organization Invitation",
      message: `You've been invited to join ${organization.name} as ${role || "a member"}`,
      relatedEntityType: "organization_member",
      relatedEntityId: member.id
    });

    broadcastUpdate("organization_member_invited", { organizationId: orgId, member, user });
    res.status(201).json({ member, user: { id: user.id, email: user.email, displayName: user.displayName } });
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
