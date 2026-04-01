import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { handleValidationError, calculateProfileCompletion, getAuthenticatedUser } from "./utils";
import { updateVolunteerProfileWithUser, updateOrganizationProfileWithUser } from "../profile-service";
import { withTransaction } from "../db";
import { db } from "../db";
import { users, organizations, matchableOrganizations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { logger } from "../logger";

export const profileRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// PATCH /api/profile/volunteer - Update volunteer profile
// Updates both users table and volunteers matching table
profileRouter.patch("/volunteer", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Use authenticated user ID from session - users can only update their own profile
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const userId = authUser.id;

    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.userType !== 'volunteer') {
      return res.status(403).json({ message: "User is not a volunteer" });
    }

    const { profilePhotoUrl, skills, interests, location, sdgGoals, bio, displayName, skillRatings, weeklyAvailability, availability, preferredWorkStyle, volunteerName, professionalTitle, yearsOfExperience, linkedinProfile, timezone, preferredCommitment, matchingPriorities, employerId, departmentName, jobTitleAtCompany } = req.body;

    // Use profile service to atomically update both users and volunteer_profiles tables
    const profileUpdate = await updateVolunteerProfileWithUser(userId, {
      avatar: profilePhotoUrl,
      bio,
      displayName,
      skills,
      interests,
      location,
      preferredSdgs: sdgGoals,
      skillRatings,
      weeklyAvailability,
      availability,
      preferredWorkStyle,
      volunteerName,
      professionalTitle,
      yearsOfExperience,
      linkedinProfile,
      timezone,
      preferredCommitment,
      matchingPriorities,
      employerId,
      departmentName,
      jobTitleAtCompany
    });

    // Note: employerId is stored in the profile but NOT automatically linked to employee engagement.
    // Employees must manually assign work to their corporation via the dashboard/work assignment feature.

    // Update legacy volunteer matching profile (best effort, outside transaction)
    if (user.email) {
      try {
        const existingVolunteer = await storage.getVolunteerByEmail(user.email);

        if (existingVolunteer) {
          // Update existing volunteer profile
          const volunteerUpdates: any = {};
          if (profilePhotoUrl !== undefined) volunteerUpdates.profilePhotoUrl = profilePhotoUrl;
          if (skills !== undefined) volunteerUpdates.skills = skills;
          if (interests !== undefined) volunteerUpdates.interests = interests;
          if (location !== undefined) volunteerUpdates.location = location;
          if (sdgGoals !== undefined) volunteerUpdates.sdgGoals = sdgGoals;
          if (displayName !== undefined) volunteerUpdates.name = displayName;

          await storage.updateVolunteer(existingVolunteer.id, volunteerUpdates);
        } else {
          // Create new volunteer profile if it doesn't exist
          if (skills && interests && location && sdgGoals && displayName) {
            await storage.createVolunteer({
              id: `vol_${user.email}`,
              email: user.email,
              name: displayName,
              profilePhotoUrl: profilePhotoUrl || null,
              skills,
              interests,
              location,
              sdgGoals
            });
          }
        }
      } catch (err) {
        logger.warn("[Profile] Error updating legacy volunteer table (non-critical)", { error: err });
        // This is legacy data, don't fail the request if it errors
      }
    }

    // Return both user and volunteer profile (matching GET endpoint structure)
    const updatedUser = await storage.getUser(userId);
    const volunteerProfile = await storage.getVolunteerProfileByUserId(userId);

    res.json({
      user: updatedUser,
      volunteerProfile
    });
  } catch (err) {
    logger.error("[Profile] Error updating volunteer profile", { error: err });
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// PATCH /api/profile/organization - Update organization profile
// Updates users, organizations, and matchable_organizations tables atomically
profileRouter.patch("/organization", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Use authenticated user ID from session - users can only update their own organization profile
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const userId = authUser.id;

    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.userType !== 'organization') {
      return res.status(403).json({ message: "User is not an organization" });
    }

    const { profilePhotoUrl, name, mission, needs, sdgFocus, location, city, country, bio, displayName, website, contactEmail } = req.body;
    logger.debug('[Profile] Organization PATCH received', { needs, sdgFocus, mission, name, city, country, location });

    // Create organization if it doesn't exist (outside transaction - one-time setup)
    let organizationId = user.organizationId;
    if (!organizationId && name) {
      const newOrg = await storage.createOrganization({
        name,
        description: bio || "",
        logo: profilePhotoUrl || null,
        website: website || null,
        contactEmail: contactEmail || user.email || "",
        city: city || null,
        country: country || null,
        address: location || null,
      });
      organizationId = newOrg.id;
      // Link user to the new organization
      await storage.updateUser(userId, { organizationId: newOrg.id });
    }

    // Use transaction for atomic updates to all profile-related tables
    await withTransaction(async (tx) => {
      // 1. Update user table
      const userUpdates: any = {};
      if (profilePhotoUrl !== undefined) userUpdates.avatar = profilePhotoUrl;
      if (bio !== undefined) userUpdates.bio = bio;
      if (displayName !== undefined) userUpdates.displayName = displayName;

      if (Object.keys(userUpdates).length > 0) {
        await tx.update(users).set(userUpdates).where(eq(users.id, userId));
      }

      // 2. Update organization table (only if user has an organization)
      if (organizationId) {
        const orgUpdates: any = {};
        if (profilePhotoUrl !== undefined) orgUpdates.logo = profilePhotoUrl;
        if (name !== undefined) orgUpdates.name = name;
        if (website !== undefined) orgUpdates.website = website;
        if (contactEmail !== undefined) orgUpdates.contactEmail = contactEmail;
        if (sdgFocus !== undefined) orgUpdates.primarySdgs = sdgFocus;
        if (needs !== undefined) orgUpdates.needs = needs;
        if (mission !== undefined) orgUpdates.goals = mission;
        if (city !== undefined) orgUpdates.city = city;
        if (country !== undefined) orgUpdates.country = country;

        logger.debug('[Profile] Updating organization', { orgUpdates });

        if (Object.keys(orgUpdates).length > 0) {
          await tx.update(organizations).set(orgUpdates).where(eq(organizations.id, organizationId));
        }
      }

      // 3. Update or create matchable organization profile
      if (user.email) {
        const [existingOrg] = await tx
          .select()
          .from(matchableOrganizations)
          .where(eq(matchableOrganizations.email, user.email));

        if (existingOrg) {
          // Update existing matchable organization
          const matchableOrgUpdates: any = {};
          if (profilePhotoUrl !== undefined) matchableOrgUpdates.profilePhotoUrl = profilePhotoUrl;
          if (name !== undefined) matchableOrgUpdates.name = name;
          if (mission !== undefined) matchableOrgUpdates.mission = mission;
          if (needs !== undefined) matchableOrgUpdates.needs = needs;
          if (sdgFocus !== undefined) matchableOrgUpdates.sdgFocus = sdgFocus;
          if (location !== undefined) matchableOrgUpdates.location = location;
          if (city !== undefined) matchableOrgUpdates.city = city;
          if (country !== undefined) matchableOrgUpdates.country = country;

          if (Object.keys(matchableOrgUpdates).length > 0) {
            await tx.update(matchableOrganizations).set(matchableOrgUpdates).where(eq(matchableOrganizations.id, existingOrg.id));
          }
        } else {
          // Create new matchable organization if all required fields are present
          if (name && mission && needs && sdgFocus && location) {
            await tx.insert(matchableOrganizations).values({
              id: `org_${user.email?.replace(/[@.]/g, '_') || Date.now()}`,
              email: user.email,
              name,
              profilePhotoUrl: profilePhotoUrl || null,
              mission,
              needs,
              sdgFocus,
              location,
              city: city || null,
              country: country || null
            });
          }
        }
      }
    });

    const updatedUser = await storage.getUser(userId);
    res.json(updatedUser);
  } catch (err) {
    logger.error("[Profile] Error updating organization profile", { error: err });
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// GET /api/profile/volunteer - Get volunteer profile data
// Combines user and volunteer matching data
profileRouter.get("/volunteer", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Use authenticated user ID from session - users can only view their own profile
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const userId = authUser.id;

    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.userType !== 'volunteer') {
      return res.status(403).json({ message: "User is not a volunteer" });
    }

    // Get volunteer profile from volunteer_profiles table (where intake form saves)
    let volunteerProfile = null;
    try {
      volunteerProfile = await storage.getVolunteerProfileByUserId(userId);
      if (volunteerProfile) {
        logger.debug(`[Profile] Retrieved profile for user ${userId}`, { skillRatings: volunteerProfile.skillRatings });
      }
    } catch (err) {
      logger.error("[Profile] Error fetching volunteer profile", { error: err });
    }

    // Merge user.avatar into volunteerProfile.profilePhotoUrl if missing
    // This ensures profile photos are displayed even when only stored in users.avatar
    const mergedProfile = volunteerProfile ? {
      ...volunteerProfile,
      profilePhotoUrl: volunteerProfile.profilePhotoUrl || user.avatar || null
    } : null;

    // Calculate profile completion based on filled fields
    const profileCompletion = mergedProfile ? calculateProfileCompletion(mergedProfile) : 0;
    const profileComplete = profileCompletion === 100;

    res.json({
      user: {
        ...user,
        profileComplete,
        profileCompletion
      },
      volunteerProfile: mergedProfile
    });
  } catch (err) {
    logger.error("[Profile] Error fetching volunteer profile", { error: err });
    res.status(500).json({ message: "Failed to fetch volunteer profile" });
  }
});

// GET /api/profile/organization - Get organization profile data
// Combines user, organization, and matchable organization data
profileRouter.get("/organization", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Use authenticated user ID from session - users can only view their own organization profile
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const userId = authUser.id;

    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.userType !== 'organization') {
      return res.status(403).json({ message: "User is not an organization" });
    }

    let organization = null;
    if (user.organizationId) {
      organization = await storage.getOrganization(user.organizationId);
    }

    let matchableOrganization = null;
    if (user.email) {
      try {
        matchableOrganization = await storage.getMatchableOrganizationByEmail(user.email);
      } catch (err) {
        logger.error("[Profile] Error fetching matchable organization", { error: err });
      }
    }

    // Get organization profile to check onboarding status
    let organizationProfile = null;
    if (user.organizationId) {
      try {
        organizationProfile = await storage.getOrganizationProfileByOrgId(user.organizationId);
      } catch (err) {
        logger.error("[Profile] Error fetching organization profile", { error: err });
      }
    }

    // Add profileComplete field to user based on onboardingCompleted status
    const profileComplete = organizationProfile?.onboardingCompleted || false;

    res.json({
      user: {
        ...user,
        profileComplete
      },
      organization,
      organizationProfile,
      matchableOrganization
    });
  } catch (err) {
    logger.error("[Profile] Error fetching organization profile", { error: err });
    res.status(500).json({ message: "Failed to fetch organization profile" });
  }
});

// GET /api/intake/volunteer-profile - Get volunteer profile for intake
profileRouter.get("/intake/volunteer-profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Use authenticated user ID from session - users can only view their own intake profile
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const userId = authUser.id;

    const user = await storage.getUser(userId);
    const volunteerProfile = await storage.getVolunteerProfileByUserId(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Merge user.avatar into volunteerProfile.profilePhotoUrl if missing
    // This ensures profile photos are displayed even when only stored in users.avatar
    const mergedProfile = volunteerProfile ? {
      ...volunteerProfile,
      profilePhotoUrl: volunteerProfile.profilePhotoUrl || user.avatar || null
    } : null;

    // Return both user and volunteerProfile so frontend can access all data
    res.json({
      user,
      volunteerProfile: mergedProfile
    });
  } catch (err) {
    logger.error("[Profile] Error fetching volunteer profile", { error: err });
    res.status(500).json({ message: "Failed to fetch volunteer profile" });
  }
});

// POST /api/intake/volunteer-profile - Create or update volunteer profile via intake
profileRouter.post("/intake/volunteer-profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Use authenticated user ID from session - users can only update their own intake profile
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const userId = authUser.id;


    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    // Always calculate total hours from availability slots
    if (req.body.availability && Array.isArray(req.body.availability) && req.body.availability.length > 0) {
      const totalAvailabilityHours = (req.body.availability as any[]).reduce((sum, slot) => {
        const start = parseInt(slot.startTime?.split(':')[0] || 0);
        const end = parseInt(slot.endTime?.split(':')[0] || 0);
        return sum + Math.max(0, end - start);
      }, 0);

      // If weeklyAvailability is provided, use the lesser of input vs calculated hours
      // If not provided, use the calculated hours from slots
      if (req.body.weeklyAvailability) {
        const availabilityHours = Math.min(req.body.weeklyAvailability, totalAvailabilityHours);
        logger.debug(`[Profile] User ${userId} - Setting weeklyAvailability`, { weeklyAvailability: availabilityHours });
        req.body.weeklyAvailability = availabilityHours;
      } else {
        logger.debug(`[Profile] User ${userId} - Auto-calculating weeklyAvailability`, { totalAvailabilityHours });
        req.body.weeklyAvailability = totalAvailabilityHours;
      }
    } else if (!req.body.weeklyAvailability) {
      // No slots and no hours provided - default to 0
      req.body.weeklyAvailability = 0;
    }


    const existingProfile = await storage.getVolunteerProfileByUserId(userId);

    // Ensure skillRatings, availability, yearsOfExperience, and profilePhotoUrl are preserved in the update
    const profileData = {
      ...req.body,
      userId,
      onboardingCompleted: true,
      skillRatings: req.body.skillRatings || {}, // Explicitly preserve skillRatings
      availability: req.body.availability || [], // Explicitly preserve availability
      yearsOfExperience: req.body.yearsOfExperience || null, // Explicitly preserve yearsOfExperience
      profilePhotoUrl: req.body.profilePhotoUrl || existingProfile?.profilePhotoUrl || null // Preserve existing photo if no new one provided
    };


    let profile;
    if (existingProfile) {
      logger.debug(`[Profile] Updating existing profile for user ${userId}`, { weeklyAvailability: profileData.weeklyAvailability });
      profile = await storage.updateVolunteerProfile(existingProfile.id, profileData);
    } else {
      logger.debug(`[Profile] Creating new profile for user ${userId}`, { weeklyAvailability: profileData.weeklyAvailability });
      profile = await storage.createVolunteerProfile(profileData);
    }

    const savedProfile = await storage.getVolunteerProfileByUserId(userId);

    // Update user's displayName, userType, skills, and avatar if needed
    const updates: any = {};
    if (!user.userType) {
      updates.userType = 'volunteer';
    }
    if (req.body.volunteerName && req.body.volunteerName !== user.displayName) {
      updates.displayName = req.body.volunteerName;
    }
    // Update skills in users table to match volunteer_profiles (for matching algorithm)
    if (req.body.skills) {
      updates.skills = req.body.skills;
    }
    // Update avatar in users table to match profilePhotoUrl
    if (req.body.profilePhotoUrl) {
      updates.avatar = req.body.profilePhotoUrl;
    }
    if (Object.keys(updates).length > 0) {
      await storage.updateUser(userId, updates);
    }

    // Create or update matchable volunteer for algorithm
    if (profile) {
      const matchableVolId = `vol_${user.email}`;
      const existingMatchableVol = await storage.getVolunteer(matchableVolId);

      // Use the updated name from request body, not the stale user object
      const volunteerName = req.body.volunteerName || user.displayName || user.email || 'Volunteer';

      const matchableVolData = {
        email: user.email || '',
        name: volunteerName,
        profilePhotoUrl: profile.profilePhotoUrl || user.avatar || null,
        skills: profile.skills || [],
        interests: profile.interests || [],
        location: profile.location || profile.city || '',
        sdgGoals: profile.preferredSdgs || []
      };


      if (existingMatchableVol) {
        await storage.updateVolunteer(matchableVolId, matchableVolData);
      } else {
        await storage.createVolunteer({
          id: matchableVolId,
          ...matchableVolData
        } as any);
      }
    }

    broadcastUpdate("volunteer_profile_updated", profile);

    // Return same structure as GET endpoint so frontend receives consistent data
    const updatedUser = await storage.getUser(userId);
    res.json({
      user: updatedUser,
      volunteerProfile: profile
    });
  } catch (err) {
    logger.error("[Profile] Error saving volunteer profile", { error: err });
    res.status(500).json({ message: "Failed to save volunteer profile" });
  }
});

// GET /api/intake/organization-profile - Get organization profile for intake
profileRouter.get("/intake/organization-profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Use authenticated user's organization, not query parameter
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const organizationId = authUser.organizationId;

    if (!organizationId) {
      return res.status(400).json({ message: "User does not belong to an organization" });
    }

    const profile = await storage.getOrganizationProfileByOrgId(organizationId);
    res.json(profile);
  } catch (err) {
    logger.error("[Profile] Error fetching organization profile", { error: err });
    res.status(500).json({ message: "Failed to fetch organization profile" });
  }
});

// POST /api/intake/organization-profile - Create or update organization profile via intake
profileRouter.post("/intake/organization-profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Use authenticated user ID from session - users can only update their own organization profile
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const userId = authUser.id;

    // Get the user to access their email and validate user type
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate user type - only organization or unset users can use this endpoint
    if (user.userType && user.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization users can update organization profiles" });
    }

    // Get or create organization
    let organization;
    let organizationId: number;

    if (user.organizationId) {
      // User already has an organization
      organization = await storage.getOrganization(user.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      organizationId = user.organizationId;
    } else {
      // Create new organization for this user
      const { organizationName, organizationLocation } = req.body;
      if (!organizationName) {
        return res.status(400).json({ message: "organizationName is required for new organizations" });
      }

      organization = await storage.createOrganization({
        name: organizationName,
        contactEmail: user.email || '',
        description: req.body.missionStatement || '',
        address: organizationLocation || ''
      });
      organizationId = organization.id;

      // Update user with organizationId
      await storage.updateUser(userId, { organizationId: organization.id });
    }

    const existingProfile = await storage.getOrganizationProfileByOrgId(organizationId);

    let profile;
    if (existingProfile) {
      profile = await storage.updateOrganizationProfile(existingProfile.id, {
        ...req.body,
        organizationId
      });
    } else {
      profile = await storage.createOrganizationProfile({
        ...req.body,
        organizationId
      });
    }

    // Update user with userType and avatar if needed
    const userUpdates: any = {};
    if (!user.userType) {
      userUpdates.userType = 'organization';
    }
    // Sync organization logo to user's avatar for consistent profile display
    if (req.body.logo) {
      userUpdates.avatar = req.body.logo;
    }
    if (Object.keys(userUpdates).length > 0) {
      await storage.updateUser(user.id, userUpdates);
    }

    // Update organization with logo and volunteer needs if provided
    const orgUpdates: any = {};
    if (req.body.logo) {
      orgUpdates.logo = req.body.logo;
    }
    if (req.body.volunteerNeeds) {
      orgUpdates.needs = req.body.volunteerNeeds;
    }
    if (req.body.primarySdgs) {
      orgUpdates.primarySdgs = req.body.primarySdgs;
    }
    if (req.body.missionStatement) {
      orgUpdates.goals = req.body.missionStatement;
    }
    if (Object.keys(orgUpdates).length > 0) {
      await storage.updateOrganization(organizationId, orgUpdates);
    }

    // Create or update matchable organization for algorithm
    if (profile) {
      const matchableOrgId = `org_${organization.contactEmail || organizationId}`;
      const existingMatchableOrg = await storage.getMatchableOrganization(matchableOrgId);

      const matchableOrgData = {
        email: organization.contactEmail || '',
        name: organization.name || 'Organization',
        logo: req.body.logo || organization.logo || null,
        mission: profile.missionStatement || '',
        needs: profile.volunteerNeeds || [],
        sdgFocus: profile.primarySdgs || [],
        location: organization.address || ''
      };

      if (existingMatchableOrg) {
        await storage.updateMatchableOrganization(matchableOrgId, matchableOrgData);
      } else {
        await storage.createMatchableOrganization({
          id: matchableOrgId,
          ...matchableOrgData
        } as any);
      }
    }

    broadcastUpdate("organization_profile_updated", profile);
    res.json(profile);
  } catch (err) {
    logger.error("[Profile] Error saving organization profile", { error: err });
    res.status(500).json({ message: "Failed to save organization profile" });
  }
});
