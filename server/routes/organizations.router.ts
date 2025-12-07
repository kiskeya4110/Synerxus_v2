import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertOrganizationSchema } from "@shared/schema";
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
