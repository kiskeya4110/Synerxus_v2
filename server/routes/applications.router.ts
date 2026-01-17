import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertApplicationSchema } from "@shared/schema";
import { handleValidationError } from "./utils";
import { calculateMatchScore, calculateMatchScoreAsync } from "../matching-algorithm";
import { notifyApplicationStatusChange, notifyNewAssignment, notifyNewApplication, sendNewApplicationEmail } from "../notification-service";
import OpenAI from "openai";

export const applicationsRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/applications - List applications
applicationsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { opportunityId, volunteerId, organizationId } = req.query;

    let applications;
    if (opportunityId) {
      applications = await storage.listApplicationsByOpportunity(parseInt(opportunityId as string));
    } else if (volunteerId) {
      applications = await storage.listApplicationsByVolunteer(parseInt(volunteerId as string));
    } else if (organizationId) {
      applications = await storage.listApplicationsByOrganization(parseInt(organizationId as string));
    } else {
      applications = await storage.listApplications();
    }

    // Enrich applications with volunteer and opportunity data
    const enrichedApplications = await Promise.all(
      applications.map(async (app: any) => {
        try {
          const [volunteer, opportunity] = await Promise.all([
            storage.getUser(app.volunteerId),
            storage.getOpportunity(app.opportunityId)
          ]);

          return {
            ...app,
            volunteer: volunteer ? {
              id: volunteer.id,
              displayName: volunteer.displayName || volunteer.username,
              username: volunteer.username,
              email: volunteer.email,
              avatar: volunteer.avatar
            } : null,
            opportunity: opportunity ? {
              id: opportunity.id,
              title: opportunity.title,
              description: opportunity.description,
              organizationId: opportunity.organizationId,
              sdgGoals: opportunity.sdgGoals,
              skills: opportunity.skills
            } : null
          };
        } catch (enrichError) {
          console.error(`Error enriching application ${app.id}:`, enrichError);
          return {
            ...app,
            volunteer: null,
            opportunity: null
          };
        }
      })
    );

    res.json(enrichedApplications);
  } catch (err) {
    console.error("Error fetching applications:", err);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
});

// GET /api/applications/my-engagements - Get accepted applications with project context for a volunteer
applicationsRouter.get("/my-engagements", async (req: Request, res: Response) => {
  try {
    const { volunteerId } = req.query;

    if (!volunteerId) {
      return res.status(400).json({ error: "volunteerId required" });
    }

    const applications = await storage.listApplicationsByVolunteer(parseInt(volunteerId as string));
    const acceptedApps = applications.filter(a => a.status === 'accepted');

    const engagements = await Promise.all(acceptedApps.map(async (app) => {
      const opportunity = await storage.getOpportunity(app.opportunityId);
      const project = opportunity?.projectId ? await storage.getProject(opportunity.projectId) : null;
      const organization = opportunity?.organizationId ? await storage.getOrganization(opportunity.organizationId) : null;

      // Get hours logged for this project by this volunteer
      let hoursLogged = 0;
      let hoursApproved = 0;
      if (project) {
        const activities = await storage.listVolunteerActivitiesByProject(project.id);
        const volunteerActivities = activities.filter(a => a.userId === parseInt(volunteerId as string));
        hoursLogged = volunteerActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
        hoursApproved = volunteerActivities
          .filter(a => a.verificationStatus === 'approved')
          .reduce((sum, a) => sum + (a.hours || 0), 0);
      }

      // Get assignment info
      let assignment = null;
      if (project) {
        const assignments = await storage.listProjectAssignmentsByProject(project.id);
        assignment = assignments.find(a => a.volunteerId === parseInt(volunteerId as string));
      }

      return {
        applicationId: app.id,
        opportunityId: app.opportunityId,
        opportunityTitle: opportunity?.title,
        projectId: project?.id,
        projectName: project?.name,
        organizationId: opportunity?.organizationId,
        organizationName: organization?.name,
        hoursCommitted: assignment?.hoursCommitted || opportunity?.ongoingHoursPerWeek || 0,
        hoursLogged,
        hoursApproved,
        sdgGoals: opportunity?.sdgGoals || project?.sdgGoals,
        acceptedAt: app.reviewedAt,
        status: assignment?.status || 'active'
      };
    }));

    res.json(engagements);
  } catch (err) {
    console.error("Error fetching engagements:", err);
    res.status(500).json({ message: "Failed to fetch engagements" });
  }
});

// GET /api/applications/:id - Get application by ID
applicationsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.id);
    const application = await storage.getApplication(applicationId);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json(application);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch application" });
  }
});

// POST /api/applications - Create new application
applicationsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = insertApplicationSchema.parse(req.body);
    const { opportunityId, volunteerId } = validatedData;

    // Verify the user is a volunteer (organizations and corporations cannot apply)
    const applicant = await storage.getUser(volunteerId);
    if (!applicant) {
      return res.status(404).json({ message: "User not found" });
    }
    if (applicant.userType && applicant.userType !== 'volunteer') {
      return res.status(403).json({
        message: "Only volunteers can apply for opportunities. Organizations and corporations cannot apply."
      });
    }

    const existingApplication = await storage.findApplicationByVolunteerAndOpportunity(
      volunteerId,
      opportunityId
    );

    if (existingApplication) {
      return res.status(409).json({
        message: "You have already applied to this opportunity",
        existingStatus: existingApplication.status
      });
    }

    // Fetch opportunity to get organizationId and projectId for direct linking
    const opportunity = await storage.getOpportunity(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    let matchScore = null;
    try {
      const volunteer = await storage.getUser(volunteerId);

      if (volunteer && opportunity) {
        let volunteerProfile = null;
        if (volunteer.email) {
          volunteerProfile = await storage.getVolunteerProfileByUserId(volunteerId);
        }

        const volunteerWithProfile = {
          ...volunteer,
          profile: volunteerProfile || undefined
        } as any;

        const matchResult = calculateMatchScore(volunteerWithProfile, opportunity);
        matchScore = Math.round(matchResult.score || 0);
      }
    } catch (err) {
      // Continue with application creation even if match score calculation fails
    }

    // Create application with direct organization and project links
    const application = await storage.createApplication({
      ...validatedData,
      organizationId: opportunity.organizationId, // Direct link to organization
      projectId: opportunity.projectId || null, // Direct link to project if applicable
      matchScore
    });

    // Create or update volunteer-organization relationship
    try {
      await storage.upsertVolunteerOrganizationRelationship(
        volunteerId,
        opportunity.organizationId,
        {
          relationshipType: 'applied',
          isActive: true
        }
      );
    } catch (relationshipError) {
      // Log but don't fail the application if relationship creation fails
      console.warn("Failed to create volunteer-organization relationship:", relationshipError);
    }

    // Auto-assign volunteer to project immediately upon application
    // This creates a pending assignment that links them to the project
    try {
      if (opportunity.projectId) {
        const existingAssignments = await storage.listProjectAssignmentsByProject(opportunity.projectId);
        const alreadyAssigned = existingAssignments.some(
          (assignment: any) => assignment.volunteerId === volunteerId
        );

        if (!alreadyAssigned) {
          await storage.createProjectAssignment({
            projectId: opportunity.projectId,
            volunteerId: volunteerId,
            role: "Applicant",
            status: "pending", // Will be updated to 'active' when application is accepted
            assignedAt: new Date(),
            hoursCommitted: 0,
          });
        }
      }
    } catch (assignError) {
      // Log but don't fail the application if assignment fails
      console.warn("Auto-assignment on application failed:", assignError);
    }

    // Notify organization users about the new application
    try {
      await notifyNewApplication(
        opportunityId,
        volunteerId,
        application.id,
        matchScore
      );
    } catch (notifyError) {
      // Log but don't fail the application if notification fails
      console.warn("Failed to send application notification:", notifyError);
    }

    // Send instant email to organization (non-blocking)
    sendNewApplicationEmail(opportunityId, volunteerId, application.id, matchScore).catch(err =>
      console.warn("Failed to send application email:", err)
    );

    broadcastUpdate("application_created", application);
    res.status(201).json(application);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// PATCH /api/applications/:id - Update application
applicationsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.id);
    const applicationData = req.body;

    const updatedApplication = await storage.updateApplication(applicationId, applicationData);
    if (!updatedApplication) {
      return res.status(404).json({ message: "Application not found" });
    }

    broadcastUpdate("application_updated", updatedApplication);
    res.json(updatedApplication);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// POST /api/applications/:id/review - Accept/Reject application
applicationsRouter.post("/:id/review", async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { status, notes, reviewerId } = req.body;

    if (!status || !["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'accepted' or 'rejected'" });
    }

    const application = await storage.getApplication(applicationId);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const opportunity = await storage.getOpportunity(application.opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    const updatedApplication = await storage.updateApplication(applicationId, {
      status,
      reviewedAt: new Date(),
      reviewedBy: reviewerId || null,
      notes: notes || null
    });

    if (!updatedApplication) {
      return res.status(500).json({ message: "Failed to update application" });
    }

    if (status === "accepted") {
      // Update volunteer-organization relationship to accepted/active status
      try {
        await storage.upsertVolunteerOrganizationRelationship(
          application.volunteerId,
          opportunity.organizationId,
          {
            relationshipType: 'accepted',
            isActive: true
          }
        );
      } catch (relationshipError) {
        console.warn("Failed to update volunteer-organization relationship:", relationshipError);
      }

      // Ensure we have a projectId - create project from opportunity if none exists
      let projectId = opportunity.projectId;

      if (!projectId) {
        // Auto-create a project from the opportunity so volunteers can log time/impact
        try {
          console.log(`[Application Review] Opportunity ${opportunity.id} has no projectId, creating project from opportunity data`);

          const newProject = await storage.createProject({
            name: opportunity.title,
            description: opportunity.description || `Project created from opportunity: ${opportunity.title}`,
            organizationId: opportunity.organizationId,
            status: "active",
            requiredSkills: opportunity.requiredSkills || [],
            optionalSkills: opportunity.optionalSkills || [],
            sdgGoals: opportunity.sdgGoals || [],
            primarySdg: opportunity.primarySdg || null,
            location: opportunity.location || null,
            engagementType: (opportunity.engagementType as "remote" | "in-person" | "hybrid" | null) || null,
            commitmentType: (opportunity.commitmentType as "event" | "ongoing" | "project-based" | null) || "project-based",
            ongoingHoursPerWeek: opportunity.ongoingHoursPerWeek || null,
            projectTotalHours: opportunity.projectTotalHours || null,
            startDate: opportunity.startDate || null,
            endDate: opportunity.endDate || null,
            impactMetricName: opportunity.impactMetricName || null,
            impactMetricUnit: opportunity.impactMetricUnit || null,
          });

          projectId = newProject.id;
          console.log(`[Application Review] Created project ${projectId} from opportunity ${opportunity.id}`);

          // Update the opportunity to link to the new project
          await storage.updateOpportunity(opportunity.id, { projectId: newProject.id });
          console.log(`[Application Review] Linked opportunity ${opportunity.id} to project ${projectId}`);
        } catch (projectError) {
          console.error(`[Application Review] Failed to create project from opportunity ${opportunity.id}:`, projectError);
          // Don't fail the entire acceptance - volunteer is still accepted, just might not have a project yet
        }
      }

      if (projectId) {
        const existingAssignments = await storage.listProjectAssignmentsByProject(projectId);
        const existingAssignment = existingAssignments.find(
          (assignment: any) => assignment.volunteerId === application.volunteerId
        );

        if (existingAssignment) {
          // Update existing pending assignment to active
          await storage.updateProjectAssignment(existingAssignment.id, {
            status: "active",
            role: "Volunteer",
            assignedAt: new Date(),
            respondedAt: new Date(),
            hoursCommitted: opportunity.ongoingHoursPerWeek || 0
          });
          console.log(`[Application Review] Updated assignment ${existingAssignment.id} to active for volunteer ${application.volunteerId}`);
        } else {
          // Create new assignment if none exists
          try {
            await storage.createProjectAssignment({
              projectId: projectId,
              volunteerId: application.volunteerId,
              role: "Volunteer",
              status: "active",
              assignedAt: new Date(),
              respondedAt: new Date(),
              hoursCommitted: opportunity.ongoingHoursPerWeek || 0
            });
            console.log(`[Application Review] Created new assignment for volunteer ${application.volunteerId} on project ${projectId}`);
          } catch (assignmentError: any) {
            // Handle duplicate assignment error gracefully
            if (assignmentError.message?.includes('already assigned')) {
              console.log(`[Application Review] Volunteer ${application.volunteerId} already has an assignment on project ${projectId}`);
            } else {
              console.error(`[Application Review] Failed to create assignment:`, assignmentError);
            }
          }
        }

        const project = await storage.getProject(projectId);
        if (project && project.organizationId) {
          await notifyNewAssignment(
            application.volunteerId,
            projectId,
            project.organizationId
          );
        }

        await storage.createVolunteerActivity({
          userId: application.volunteerId,
          projectId: projectId,
          description: `Accepted application for ${opportunity.title}`,
          date: new Date(),
          hours: 0
        });
      } else {
        console.warn(`[Application Review] No project available for accepted application ${applicationId}. Volunteer may not be able to log time.`);
      }
    }

    // Handle rejection - update relationship and remove pending assignment if exists
    if (status === "rejected") {
      // Update volunteer-organization relationship to rejected status
      try {
        await storage.upsertVolunteerOrganizationRelationship(
          application.volunteerId,
          opportunity.organizationId,
          {
            relationshipType: 'rejected',
            isActive: false
          }
        );
      } catch (relationshipError) {
        console.warn("Failed to update volunteer-organization relationship:", relationshipError);
      }

      if (opportunity.projectId) {
        const existingAssignments = await storage.listProjectAssignmentsByProject(opportunity.projectId);
        const pendingAssignment = existingAssignments.find(
          (assignment: any) => assignment.volunteerId === application.volunteerId && assignment.status === "pending"
        );

        if (pendingAssignment) {
          await storage.deleteProjectAssignment(pendingAssignment.id);
        }
      }
    }

    await notifyApplicationStatusChange(
      application.volunteerId,
      application.opportunityId,
      status,
      opportunity.title
    );

    broadcastUpdate("application_reviewed", updatedApplication);
    res.json(updatedApplication);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// GET /api/applications/:id/volunteer-insights - Get AI-powered volunteer insights for review
applicationsRouter.get("/:id/volunteer-insights", async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.id);
    const application = await storage.getApplication(applicationId);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const opportunity = await storage.getOpportunity(application.opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    // Fetch volunteer data
    const volunteer = await storage.getUser(application.volunteerId);
    const volunteerProfile = await storage.getVolunteerProfileByUserId(application.volunteerId);

    if (!volunteer) {
      return res.status(404).json({ message: "Volunteer not found" });
    }

    // Fetch volunteer's past project assignments and activities
    const volunteerAssignments = await storage.listProjectAssignmentsByVolunteer(application.volunteerId);
    const volunteerActivities = await storage.listVolunteerActivitiesByUser(application.volunteerId);

    // Enrich assignments with project details
    const pastProjects = await Promise.all(
      volunteerAssignments
        .filter(a => a.status === "active" || a.status === "completed")
        .map(async (assignment) => {
          const project = await storage.getProject(assignment.projectId);
          const projectActivities = volunteerActivities.filter(a => a.projectId === assignment.projectId);
          const totalHours = projectActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
          return {
            projectName: project?.name || "Unknown Project",
            projectDescription: project?.description || "",
            role: assignment.role,
            status: assignment.status,
            sdgGoals: project?.sdgGoals || [],
            hoursContributed: totalHours,
            startDate: assignment.assignedAt,
            endDate: assignment.status === "completed" ? assignment.respondedAt : null
          };
        })
    );

    // Fetch organization's past volunteers for comparison
    const organization = await storage.getOrganization(opportunity.organizationId);
    const orgProjects = await storage.listProjectsByOrganization(opportunity.organizationId);
    const orgProjectIds = orgProjects.map(p => p.id);

    // Get all assignments for this organization's projects
    const allOrgAssignments = await storage.listProjectAssignmentsByProjectIds(orgProjectIds);
    const activeOrCompletedAssignments = allOrgAssignments.filter(
      a => (a.status === "active" || a.status === "completed") && a.volunteerId !== application.volunteerId
    );

    // Get unique past volunteers and their profiles
    const pastVolunteerIds = Array.from(new Set(activeOrCompletedAssignments.map(a => a.volunteerId)));
    const pastVolunteersData = await Promise.all(
      pastVolunteerIds.slice(0, 20).map(async (volunteerId) => {
        const user = await storage.getUser(volunteerId);
        const profile = await storage.getVolunteerProfileByUserId(volunteerId);
        const assignments = activeOrCompletedAssignments.filter(a => a.volunteerId === volunteerId);
        const activities = await storage.listVolunteerActivitiesByUser(volunteerId);
        const totalHours = activities.reduce((sum, a) => sum + (a.hours || 0), 0);
        return {
          name: user?.displayName || "Unknown",
          skills: profile?.skills || [],
          completedProjects: assignments.filter(a => a.status === "completed").length,
          totalHours,
          sdgGoals: profile?.preferredSdgs || []
        };
      })
    );

    // Calculate skill overlap with past successful volunteers
    const volunteerSkills = volunteerProfile?.skills || [];
    const allPastSkills = pastVolunteersData.flatMap(v => v.skills);
    const skillFrequency: Record<string, number> = {};
    allPastSkills.forEach(skill => {
      skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
    });

    const commonSkillsInOrg = Object.entries(skillFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill]) => skill);

    const matchingSkills = volunteerSkills.filter(s =>
      commonSkillsInOrg.some(cs => cs.toLowerCase() === s.toLowerCase())
    );

    // Build context for AI analysis
    const volunteerContext = {
      name: volunteer.displayName || volunteer.username,
      skills: volunteerSkills,
      interests: volunteerProfile?.interests || [],
      sdgGoals: volunteerProfile?.preferredSdgs || [],
      location: volunteerProfile?.location,
      availability: volunteerProfile?.weeklyAvailability,
      motivations: volunteerProfile?.motivations,
      languages: volunteerProfile?.languages || [],
      workStyle: volunteerProfile?.preferredWorkStyle,
      linkedinUrl: volunteerProfile?.linkedinProfile,
      pastProjectsCount: pastProjects.length,
      totalHoursVolunteered: volunteerActivities.reduce((sum, a) => sum + (a.hours || 0), 0),
      pastProjects: pastProjects.slice(0, 5)
    };

    const opportunityContext = {
      title: opportunity.title,
      description: opportunity.description,
      requiredSkills: opportunity.requiredSkills || [],
      sdgGoals: opportunity.sdgGoals || [],
      location: opportunity.location,
      timeCommitment: opportunity.timeCommitment
    };

    const orgContext = {
      name: organization?.name,
      totalPastVolunteers: pastVolunteerIds.length,
      commonSkills: commonSkillsInOrg,
      avgHoursPerVolunteer: pastVolunteersData.length > 0
        ? Math.round(pastVolunteersData.reduce((sum, v) => sum + v.totalHours, 0) / pastVolunteersData.length)
        : 0
    };

    // Generate AI insights
    let aiInsights = null;

    try {
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const prompt = `You are an expert HR advisor helping an organization review a volunteer application. Analyze the volunteer's background and provide actionable insights.

VOLUNTEER PROFILE:
- Name: ${volunteerContext.name}
- Skills: ${volunteerContext.skills.join(", ") || "Not specified"}
- Interests: ${volunteerContext.interests.join(", ") || "Not specified"}
- SDG Goals: ${volunteerContext.sdgGoals.map((g: number) => `SDG ${g}`).join(", ") || "Not specified"}
- Location: ${volunteerContext.location || "Not specified"}
- Weekly Availability: ${volunteerContext.availability ? `${volunteerContext.availability} hours` : "Not specified"}
- Work Style: ${volunteerContext.workStyle || "Not specified"}
- Languages: ${volunteerContext.languages.join(", ") || "Not specified"}
- Motivations: ${volunteerContext.motivations || "Not specified"}
- LinkedIn: ${volunteerContext.linkedinUrl ? "Profile available" : "Not provided"}

VOLUNTEER EXPERIENCE:
- Past Projects: ${volunteerContext.pastProjectsCount}
- Total Hours Volunteered: ${volunteerContext.totalHoursVolunteered}
${volunteerContext.pastProjects.length > 0 ? `- Recent Projects:\n${volunteerContext.pastProjects.map(p => `  • ${p.projectName} (${p.role}, ${p.hoursContributed} hours, SDGs: ${p.sdgGoals.join(", ")})`).join("\n")}` : "- No prior volunteer experience on this platform"}

OPPORTUNITY DETAILS:
- Position: ${opportunityContext.title}
- Description: ${opportunityContext.description}
- Required Skills: ${opportunityContext.requiredSkills.join(", ") || "Not specified"}
- SDG Alignment: ${opportunityContext.sdgGoals.map(g => `SDG ${g}`).join(", ") || "Not specified"}
- Location: ${opportunityContext.location || "Remote/Flexible"}
- Time Commitment: ${opportunityContext.timeCommitment || "Not specified"}

ORGANIZATION CONTEXT:
- Organization: ${orgContext.name}
- Past Volunteers: ${orgContext.totalPastVolunteers}
- Common Skills Among Past Volunteers: ${orgContext.commonSkills.slice(0, 5).join(", ") || "Not enough data"}
- Average Hours per Volunteer: ${orgContext.avgHoursPerVolunteer}

SKILL MATCH WITH ORGANIZATION'S PAST VOLUNTEERS:
- Matching Skills: ${matchingSkills.length > 0 ? matchingSkills.join(", ") : "No direct matches"}

Provide your analysis in the following JSON format:
{
  "overallAssessment": "A 2-3 sentence summary of the volunteer's fit for this opportunity",
  "strengthsInsights": [
    "Insight about a specific strength (be specific and actionable)",
    "Another strength insight"
  ],
  "experienceInsights": [
    "Insight about their past experience and how it relates to this opportunity",
    "Another experience insight if applicable"
  ],
  "comparisonWithPastVolunteers": "A sentence comparing this volunteer to successful past volunteers",
  "potentialConcerns": [
    "Any potential concern or gap (if applicable, otherwise empty array)"
  ],
  "recommendedQuestions": [
    "A specific question to ask during interview",
    "Another relevant question"
  ],
  "predictedSuccessScore": 85,
  "keyTakeaway": "One sentence key insight for the reviewer"
}

Focus on INSIGHTS, not just restating facts. Compare, analyze, and predict. Be balanced but constructive.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert HR advisor. Respond only with valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (aiResponse) {
        try {
          // Extract JSON from response (handle markdown code blocks)
          const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                           aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                           [null, aiResponse];
          const jsonStr = jsonMatch[1] || aiResponse;
          aiInsights = JSON.parse(jsonStr.trim());
        } catch (parseErr) {
          console.error("Failed to parse AI insights:", parseErr);
        }
      }
    } catch (aiErr) {
      console.error("AI insights generation failed:", aiErr);
    }

    // Build fallback insights if AI fails
    const fallbackInsights = {
      overallAssessment: `${volunteerContext.name} has ${volunteerContext.pastProjectsCount > 0 ? `${volunteerContext.pastProjectsCount} past projects and ${volunteerContext.totalHoursVolunteered} hours of volunteer experience` : "no prior experience on this platform"}. ${matchingSkills.length > 0 ? `They have ${matchingSkills.length} skills matching your organization's common volunteer skills.` : "Consider exploring their transferable skills during the interview."}`,
      strengthsInsights: [
        volunteerSkills.length > 3 ? `Diverse skill set with ${volunteerSkills.length} listed skills` : null,
        volunteerContext.availability && volunteerContext.availability >= 5 ? `Good availability (${volunteerContext.availability} hrs/week)` : null,
        volunteerContext.pastProjectsCount > 0 ? `Proven track record with ${volunteerContext.totalHoursVolunteered} volunteer hours` : null,
        volunteerContext.sdgGoals.some((g: number) => opportunityContext.sdgGoals.includes(g)) ? "SDG goals align with this opportunity" : null
      ].filter(Boolean),
      experienceInsights: pastProjects.length > 0 ? [
        `Previously worked on: ${pastProjects.slice(0, 2).map(p => p.projectName).join(", ")}`,
        `Most experienced in roles: ${Array.from(new Set(pastProjects.map(p => p.role))).join(", ")}`
      ] : ["First-time applicant on this platform - consider their external experience"],
      comparisonWithPastVolunteers: orgContext.totalPastVolunteers > 0
        ? `Your organization's past volunteers average ${orgContext.avgHoursPerVolunteer} hours. ${matchingSkills.length > 0 ? `This volunteer shares ${matchingSkills.length} skills with past successful volunteers.` : "This volunteer brings unique skills to your team."}`
        : "No historical data available for comparison.",
      potentialConcerns: [
        !volunteerContext.availability ? "Weekly availability not specified" : null,
        volunteerSkills.length === 0 ? "No skills listed in profile" : null,
        pastProjects.length === 0 && !volunteerContext.linkedinUrl ? "No verifiable experience - consider requesting references" : null
      ].filter(Boolean),
      recommendedQuestions: [
        "Can you describe a challenging volunteer or work project and how you handled it?",
        matchingSkills.length > 0 ? `Tell us about your experience with ${matchingSkills[0]}` : "What skills do you hope to develop through this opportunity?"
      ],
      predictedSuccessScore: Math.round(
        (application.matchScore || 50) * 0.4 +
        (matchingSkills.length > 0 ? 20 : 0) +
        (pastProjects.length > 0 ? Math.min(pastProjects.length * 10, 30) : 10) +
        (volunteerContext.availability && volunteerContext.availability >= 5 ? 10 : 0)
      ),
      keyTakeaway: matchingSkills.length > 0
        ? `Strong skill alignment with your team's needs, particularly in ${matchingSkills.slice(0, 2).join(" and ")}`
        : pastProjects.length > 0
        ? `Experienced volunteer with proven commitment (${volunteerContext.totalHoursVolunteered} hours)`
        : "New volunteer - evaluate based on motivation and potential"
    };

    res.json({
      applicationId,
      volunteerId: application.volunteerId,
      volunteerName: volunteer.displayName || volunteer.username,
      matchScore: application.matchScore,
      insights: aiInsights || fallbackInsights,
      volunteerSummary: {
        totalProjects: pastProjects.length,
        totalHours: volunteerContext.totalHoursVolunteered,
        skills: volunteerSkills,
        sdgAlignment: volunteerContext.sdgGoals.filter((g: number) => opportunityContext.sdgGoals.includes(g)),
        hasLinkedIn: !!volunteerContext.linkedinUrl,
        recentProjects: pastProjects.slice(0, 3)
      },
      organizationComparison: {
        commonSkillsMatch: matchingSkills,
        avgVolunteerHours: orgContext.avgHoursPerVolunteer,
        totalPastVolunteers: orgContext.totalPastVolunteers,
        topOrgSkills: orgContext.commonSkills.slice(0, 5)
      }
    });
  } catch (err) {
    console.error("Error generating volunteer insights:", err);
    res.status(500).json({ message: "Failed to generate volunteer insights" });
  }
});

// GET /api/applications/:id/match-analysis - Get AI match analysis for an application
applicationsRouter.get("/:id/match-analysis", async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.id);

    // Get application details
    const application = await storage.getApplication(applicationId);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Get opportunity and volunteer details
    const opportunity = await storage.getOpportunity(application.opportunityId);
    const volunteer = await storage.getUser(application.volunteerId);

    if (!opportunity || !volunteer) {
      return res.status(404).json({ message: "Opportunity or volunteer not found" });
    }

    // Get volunteer profile
    let volunteerProfile = null;
    if (volunteer.email) {
      volunteerProfile = await storage.getVolunteerByEmail(volunteer.email);
    }

    // Calculate match score with breakdown using async version for consistency
    const volunteerWithProfile = {
      ...volunteer,
      profile: volunteerProfile || undefined
    } as any;

    const matchResult = await calculateMatchScoreAsync(volunteerWithProfile, opportunity);

    // Normalize breakdown values to percentages (0-100) and ensure all keys exist
    const breakdown = matchResult.breakdown || {};
    const normalizedBreakdown = {
      skillMatch: (breakdown.skillMatch || 0),
      locationMatch: (breakdown.locationMatch || 0),
      sdgMatch: (breakdown.sdgMatch || 0),
      interestMatch: (breakdown.interestMatch || 0),
    };

    res.json({
      score: Math.round(matchResult.score || 0),
      breakdown: normalizedBreakdown,
      reasons: matchResult.reasons || [],
      volunteer: {
        id: volunteer.id,
        name: volunteer.displayName || volunteer.username,
        skills: volunteer.skills || [],
        location: volunteerProfile?.location || null
      },
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        requiredSkills: opportunity.requiredSkills || [],
        optionalSkills: opportunity.optionalSkills || [],
        location: opportunity.location || null,
        isRemote: opportunity.isRemote || false
      }
    });
  } catch (err) {
    console.error("Error getting match analysis:", err);
    res.status(500).json({ message: "Failed to get match analysis" });
  }
});

// POST /api/applications/:id/repair-assignment - Fix missing project assignment for accepted application
// This is useful for volunteers who were accepted before the auto-project-creation fix
applicationsRouter.post("/:id/repair-assignment", async (req: Request, res: Response) => {
  try {
    const applicationId = parseInt(req.params.id);

    const application = await storage.getApplication(applicationId);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.status !== 'accepted') {
      return res.status(400).json({ message: "Only accepted applications can be repaired" });
    }

    const opportunity = await storage.getOpportunity(application.opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    // Check if volunteer already has an active assignment
    let projectId = opportunity.projectId;

    if (projectId) {
      const existingAssignments = await storage.listProjectAssignmentsByProject(projectId);
      const existingAssignment = existingAssignments.find(
        (a: any) => a.volunteerId === application.volunteerId && (a.status === 'active' || a.status === 'pending')
      );

      if (existingAssignment) {
        return res.json({
          message: "Volunteer already has an assignment",
          assignment: existingAssignment,
          repaired: false
        });
      }
    }

    // If no projectId on opportunity, create a project
    if (!projectId) {
      console.log(`[Repair Assignment] Creating project for opportunity ${opportunity.id}`);

      const newProject = await storage.createProject({
        name: opportunity.title,
        description: opportunity.description || `Project created from opportunity: ${opportunity.title}`,
        organizationId: opportunity.organizationId,
        status: "active",
        requiredSkills: opportunity.requiredSkills || [],
        optionalSkills: opportunity.optionalSkills || [],
        sdgGoals: opportunity.sdgGoals || [],
        primarySdg: opportunity.primarySdg || null,
        location: opportunity.location || null,
        engagementType: (opportunity.engagementType as "remote" | "in-person" | "hybrid" | null) || null,
        commitmentType: (opportunity.commitmentType as "event" | "ongoing" | "project-based" | null) || "project-based",
        ongoingHoursPerWeek: opportunity.ongoingHoursPerWeek || null,
        projectTotalHours: opportunity.projectTotalHours || null,
        startDate: opportunity.startDate || null,
        endDate: opportunity.endDate || null,
        impactMetricName: opportunity.impactMetricName || null,
        impactMetricUnit: opportunity.impactMetricUnit || null,
      });

      projectId = newProject.id;

      // Link opportunity to new project
      await storage.updateOpportunity(opportunity.id, { projectId: newProject.id });
      console.log(`[Repair Assignment] Created and linked project ${projectId} to opportunity ${opportunity.id}`);
    }

    // Create the assignment
    try {
      const newAssignment = await storage.createProjectAssignment({
        projectId: projectId,
        volunteerId: application.volunteerId,
        role: "Volunteer",
        status: "active",
        assignedAt: new Date(),
        respondedAt: new Date(),
        hoursCommitted: opportunity.ongoingHoursPerWeek || 0
      });

      // Update volunteer-organization relationship if needed
      await storage.upsertVolunteerOrganizationRelationship(
        application.volunteerId,
        opportunity.organizationId,
        {
          relationshipType: 'accepted',
          isActive: true
        }
      );

      console.log(`[Repair Assignment] Created assignment ${newAssignment.id} for volunteer ${application.volunteerId}`);

      res.json({
        message: "Assignment repaired successfully",
        assignment: newAssignment,
        projectId: projectId,
        repaired: true
      });
    } catch (assignmentError: any) {
      if (assignmentError.message?.includes('already assigned')) {
        return res.json({
          message: "Volunteer already has an assignment (possibly with different status)",
          repaired: false
        });
      }
      throw assignmentError;
    }
  } catch (err) {
    console.error("Error repairing assignment:", err);
    res.status(500).json({ message: "Failed to repair assignment" });
  }
});

// POST /api/applications/repair-all - Fix all accepted applications missing project assignments
applicationsRouter.post("/repair-all", async (req: Request, res: Response) => {
  try {
    const applications = await storage.listApplications();
    const acceptedApplications = applications.filter(a => a.status === 'accepted');

    const results = {
      total: acceptedApplications.length,
      repaired: 0,
      alreadyOk: 0,
      failed: 0,
      details: [] as any[]
    };

    for (const application of acceptedApplications) {
      try {
        const opportunity = await storage.getOpportunity(application.opportunityId);
        if (!opportunity) {
          results.failed++;
          results.details.push({
            applicationId: application.id,
            volunteerId: application.volunteerId,
            status: 'failed',
            reason: 'Opportunity not found'
          });
          continue;
        }

        let projectId = opportunity.projectId;

        // Check if volunteer already has an active assignment
        if (projectId) {
          const assignments = await storage.listProjectAssignmentsByProject(projectId);
          const hasActiveAssignment = assignments.some(
            (a: any) => a.volunteerId === application.volunteerId && (a.status === 'active' || a.status === 'pending')
          );

          if (hasActiveAssignment) {
            results.alreadyOk++;
            results.details.push({
              applicationId: application.id,
              volunteerId: application.volunteerId,
              status: 'ok',
              reason: 'Already has assignment'
            });
            continue;
          }
        }

        // Need to create project and/or assignment
        if (!projectId) {
          const newProject = await storage.createProject({
            name: opportunity.title,
            description: opportunity.description || `Project created from opportunity: ${opportunity.title}`,
            organizationId: opportunity.organizationId,
            status: "active",
            requiredSkills: opportunity.requiredSkills || [],
            optionalSkills: opportunity.optionalSkills || [],
            sdgGoals: opportunity.sdgGoals || [],
            primarySdg: opportunity.primarySdg || null,
            location: opportunity.location || null,
            engagementType: (opportunity.engagementType as "remote" | "in-person" | "hybrid" | null) || null,
            commitmentType: (opportunity.commitmentType as "event" | "ongoing" | "project-based" | null) || "project-based",
            ongoingHoursPerWeek: opportunity.ongoingHoursPerWeek || null,
            projectTotalHours: opportunity.projectTotalHours || null,
            startDate: opportunity.startDate || null,
            endDate: opportunity.endDate || null,
            impactMetricName: opportunity.impactMetricName || null,
            impactMetricUnit: opportunity.impactMetricUnit || null,
          });

          projectId = newProject.id;
          await storage.updateOpportunity(opportunity.id, { projectId: newProject.id });
        }

        // Create assignment
        await storage.createProjectAssignment({
          projectId: projectId!,
          volunteerId: application.volunteerId,
          role: "Volunteer",
          status: "active",
          assignedAt: new Date(),
          respondedAt: new Date(),
          hoursCommitted: opportunity.ongoingHoursPerWeek || 0
        });

        // Update volunteer-organization relationship
        await storage.upsertVolunteerOrganizationRelationship(
          application.volunteerId,
          opportunity.organizationId,
          {
            relationshipType: 'accepted',
            isActive: true
          }
        );

        results.repaired++;
        results.details.push({
          applicationId: application.id,
          volunteerId: application.volunteerId,
          status: 'repaired',
          projectId: projectId
        });
      } catch (appError: any) {
        if (appError.message?.includes('already assigned')) {
          results.alreadyOk++;
          results.details.push({
            applicationId: application.id,
            volunteerId: application.volunteerId,
            status: 'ok',
            reason: 'Already assigned (different status)'
          });
        } else {
          results.failed++;
          results.details.push({
            applicationId: application.id,
            volunteerId: application.volunteerId,
            status: 'failed',
            reason: appError.message
          });
        }
      }
    }

    console.log(`[Repair All] Completed: ${results.repaired} repaired, ${results.alreadyOk} already ok, ${results.failed} failed out of ${results.total} accepted applications`);

    res.json(results);
  } catch (err) {
    console.error("Error repairing all applications:", err);
    res.status(500).json({ message: "Failed to repair applications" });
  }
});
