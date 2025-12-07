import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { handleValidationError, calculateProfileCompletion } from "./utils";
import { updateVolunteerProfileWithUser } from "../profile-service";

export const profileRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// PATCH /api/profile/volunteer - Update volunteer profile
// Updates both users table and volunteers matching table
profileRouter.patch("/volunteer", async (req: Request, res: Response) => {
  try {
    const userIdParam = req.query.userId as string;

    if (!userIdParam) {
      return res.status(400).json({ message: "userId parameter is required" });
    }

    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

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
        console.error("Error updating legacy volunteer table (non-critical):", err);
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
    console.error("Error updating volunteer profile:", err);
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// PATCH /api/profile/organization - Update organization profile
// Updates both users/organizations tables and matchable_organizations table
profileRouter.patch("/organization", async (req: Request, res: Response) => {
  try {
    const userIdParam = req.query.userId as string;

    if (!userIdParam) {
      return res.status(400).json({ message: "userId parameter is required" });
    }

    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.userType !== 'organization') {
      return res.status(403).json({ message: "User is not an organization" });
    }

    const { profilePhotoUrl, name, mission, needs, sdgFocus, location, bio, displayName, website, contactEmail } = req.body;
    console.log('[OrganizationProfile PATCH] Received data:', { needs, sdgFocus, mission, name });

    // Create organization if it doesn't exist
    if (!user.organizationId && name) {
      const newOrg = await storage.createOrganization({
        name,
        description: bio || "",
        logo: profilePhotoUrl || null,
        website: website || null,
        contactEmail: contactEmail || user.email || "",
      });

      // Link user to the new organization
      await storage.updateUser(userId, { organizationId: newOrg.id });
      user.organizationId = newOrg.id;
    }

    // Update user table
    const userUpdates: any = {};
    if (profilePhotoUrl !== undefined) userUpdates.avatar = profilePhotoUrl;
    if (bio !== undefined) userUpdates.bio = bio;
    if (displayName !== undefined) userUpdates.displayName = displayName;

    if (Object.keys(userUpdates).length > 0) {
      await storage.updateUser(userId, userUpdates);
    }

    // Update organization table (only if user has an organization)
    if (user.organizationId) {
      const orgUpdates: any = {};
      if (profilePhotoUrl !== undefined) orgUpdates.logo = profilePhotoUrl;
      if (name !== undefined) orgUpdates.name = name;
      if (website !== undefined) orgUpdates.website = website;
      if (contactEmail !== undefined) orgUpdates.contactEmail = contactEmail;
      if (sdgFocus !== undefined) orgUpdates.primarySdgs = sdgFocus;
      if (needs !== undefined) orgUpdates.needs = needs;
      if (mission !== undefined) orgUpdates.goals = mission;

      console.log('[OrganizationProfile] Updating organization with:', orgUpdates);

      if (Object.keys(orgUpdates).length > 0) {
        await storage.updateOrganization(user.organizationId, orgUpdates);
      }
    }

    // Update or create matchable organization profile
    if (user.email) {
      try {
        const existingOrg = await storage.getMatchableOrganizationByEmail(user.email);

        if (existingOrg) {
          // Update existing matchable organization
          const matchableOrgUpdates: any = {};
          if (profilePhotoUrl !== undefined) matchableOrgUpdates.profilePhotoUrl = profilePhotoUrl;
          if (name !== undefined) matchableOrgUpdates.name = name;
          if (mission !== undefined) matchableOrgUpdates.mission = mission;
          if (needs !== undefined) matchableOrgUpdates.needs = needs;
          if (sdgFocus !== undefined) matchableOrgUpdates.sdgFocus = sdgFocus;
          if (location !== undefined) matchableOrgUpdates.location = location;

          await storage.updateMatchableOrganization(existingOrg.id, matchableOrgUpdates);
        } else {
          // Create new matchable organization if it doesn't exist
          if (name && mission && needs && sdgFocus && location) {
            await storage.createMatchableOrganization({
              id: `org_${user.email}`,
              email: user.email,
              name,
              profilePhotoUrl: profilePhotoUrl || null,
              mission,
              needs,
              sdgFocus,
              location
            });
          }
        }
      } catch (err) {
        console.error("Error updating matchable organization profile:", err);
        // Continue even if matching profile update fails
      }
    }

    const updatedUser = await storage.getUser(userId);
    res.json(updatedUser);
  } catch (err) {
    console.error("Error updating organization profile:", err);
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// GET /api/profile/volunteer - Get volunteer profile data
// Combines user and volunteer matching data
profileRouter.get("/volunteer", async (req: Request, res: Response) => {
  try {
    const userIdParam = req.query.userId as string;

    if (!userIdParam) {
      return res.status(400).json({ message: "userId parameter is required" });
    }

    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

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
        console.log(`[Profile GET] Retrieved profile for user ${userId}, skillRatings:`, JSON.stringify(volunteerProfile.skillRatings));
      }
    } catch (err) {
      console.error("Error fetching volunteer profile:", err);
    }

    // Calculate profile completion based on filled fields
    const profileCompletion = volunteerProfile ? calculateProfileCompletion(volunteerProfile) : 0;
    const profileComplete = profileCompletion === 100;

    res.json({
      user: {
        ...user,
        profileComplete,
        profileCompletion
      },
      volunteerProfile
    });
  } catch (err) {
    console.error("Error fetching volunteer profile:", err);
    res.status(500).json({ message: "Failed to fetch volunteer profile" });
  }
});

// GET /api/profile/organization - Get organization profile data
// Combines user, organization, and matchable organization data
profileRouter.get("/organization", async (req: Request, res: Response) => {
  try {
    const userIdParam = req.query.userId as string;

    if (!userIdParam) {
      return res.status(400).json({ message: "userId parameter is required" });
    }

    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

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
        console.error("Error fetching matchable organization:", err);
      }
    }

    // Get organization profile to check onboarding status
    let organizationProfile = null;
    if (user.organizationId) {
      try {
        organizationProfile = await storage.getOrganizationProfile(user.organizationId);
      } catch (err) {
        console.error("Error fetching organization profile:", err);
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
    console.error("Error fetching organization profile:", err);
    res.status(500).json({ message: "Failed to fetch organization profile" });
  }
});

// GET /api/intake/volunteer-profile - Get volunteer profile for intake
profileRouter.get("/intake/volunteer-profile", async (req: Request, res: Response) => {
  try {
    const userIdParam = req.query.userId as string;

    if (!userIdParam) {
      return res.status(400).json({ message: "userId parameter is required" });
    }

    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

    const user = await storage.getUser(userId);
    const volunteerProfile = await storage.getVolunteerProfileByUserId(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return both user and volunteerProfile so frontend can access all data
    res.json({
      user,
      volunteerProfile
    });
  } catch (err) {
    console.error("Error fetching volunteer profile:", err);
    res.status(500).json({ message: "Failed to fetch volunteer profile" });
  }
});

// POST /api/intake/volunteer-profile - Create or update volunteer profile via intake
profileRouter.post("/intake/volunteer-profile", async (req: Request, res: Response) => {
  try {
    const userIdParam = req.query.userId as string;

    if (!userIdParam) {
      return res.status(400).json({ message: "userId parameter is required" });
    }

    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

    console.log(`[Intake POST CRITICAL] ===== PROCESSING SAVE FOR USER ID: ${userId} =====`);

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`[Intake POST CRITICAL] User email: ${user.email}, DisplayName: ${user.displayName}`);

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
        console.log(`[Intake POST CRITICAL] User ${userId} - Setting weeklyAvailability to min(${req.body.weeklyAvailability}, ${totalAvailabilityHours}) = ${availabilityHours}`);
        req.body.weeklyAvailability = availabilityHours;
      } else {
        console.log(`[Intake POST CRITICAL] User ${userId} - Auto-calculating weeklyAvailability from slots = ${totalAvailabilityHours}`);
        req.body.weeklyAvailability = totalAvailabilityHours;
      }
    } else if (!req.body.weeklyAvailability) {
      // No slots and no hours provided - default to 0
      req.body.weeklyAvailability = 0;
    }

    console.log(`[Intake POST] Received skillRatings for user ${userId}:`, JSON.stringify(req.body.skillRatings));
    console.log(`[Intake POST] Received availability for user ${userId}:`, JSON.stringify(req.body.availability));
    console.log(`[Intake POST] Received yearsOfExperience for user ${userId}:`, JSON.stringify(req.body.yearsOfExperience));

    const existingProfile = await storage.getVolunteerProfileByUserId(userId);

    // Ensure skillRatings, availability, yearsOfExperience, and profilePhotoUrl are preserved in the update
    const profileData = {
      ...req.body,
      userId,
      onboardingCompleted: true,
      skillRatings: req.body.skillRatings || {}, // Explicitly preserve skillRatings
      availability: req.body.availability || [], // Explicitly preserve availability
      yearsOfExperience: req.body.yearsOfExperience || null, // Explicitly preserve yearsOfExperience
      profilePhotoUrl: req.body.profilePhotoUrl || null // Explicitly preserve profile photo
    };

    console.log(`[Intake POST] Saving profile data with skillRatings:`, JSON.stringify(profileData.skillRatings));
    console.log(`[Intake POST] Saving profile data with availability:`, JSON.stringify(profileData.availability));
    console.log(`[Intake POST] Saving profile data with yearsOfExperience:`, JSON.stringify(profileData.yearsOfExperience));

    let profile;
    if (existingProfile) {
      console.log(`[Intake POST CRITICAL] UPDATING existing profile for user ${userId}. New weeklyAvailability: ${profileData.weeklyAvailability}`);
      profile = await storage.updateVolunteerProfile(existingProfile.id, profileData);
    } else {
      console.log(`[Intake POST CRITICAL] CREATING new profile for user ${userId}. weeklyAvailability: ${profileData.weeklyAvailability}`);
      profile = await storage.createVolunteerProfile(profileData);
    }

    console.log(`[Intake POST CRITICAL] Profile saved for user ${userId}. Fetching to verify...`);
    const savedProfile = await storage.getVolunteerProfileByUserId(userId);
    console.log(`[Intake POST CRITICAL] VERIFIED: User ${userId} now has weeklyAvailability = ${savedProfile?.weeklyAvailability}`);
    console.log(`[Intake POST] Verified saved skillRatings:`, JSON.stringify(savedProfile?.skillRatings));
    console.log(`[Intake POST] Verified saved availability:`, JSON.stringify(savedProfile?.availability));
    console.log(`[Intake POST] Verified saved yearsOfExperience:`, JSON.stringify(savedProfile?.yearsOfExperience));

    // Update user's displayName, userType, and skills if needed (profile photo saved to volunteerProfiles)
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
    if (Object.keys(updates).length > 0) {
      await storage.updateUser(userId, updates);
    }

    // Create or update matchable volunteer for algorithm
    if (profile) {
      const matchableVolId = `vol_${user.email}`;
      console.log(`Creating/updating matchable volunteer: ${matchableVolId}`);
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

      console.log('Matchable volunteer data:', JSON.stringify(matchableVolData, null, 2));

      if (existingMatchableVol) {
        console.log('Updating existing matchable volunteer');
        await storage.updateVolunteer(matchableVolId, matchableVolData);
      } else {
        console.log('Creating new matchable volunteer');
        await storage.createVolunteer({
          id: matchableVolId,
          ...matchableVolData
        } as any);
      }
      console.log('Matchable volunteer created/updated successfully');
    }

    broadcastUpdate("volunteer_profile_updated", profile);

    // Return same structure as GET endpoint so frontend receives consistent data
    const updatedUser = await storage.getUser(userId);
    res.json({
      user: updatedUser,
      volunteerProfile: profile
    });
  } catch (err) {
    console.error("Error saving volunteer profile:", err);
    res.status(500).json({ message: "Failed to save volunteer profile" });
  }
});

// GET /api/intake/organization-profile - Get organization profile for intake
profileRouter.get("/intake/organization-profile", async (req: Request, res: Response) => {
  try {
    const orgIdParam = req.query.organizationId as string;

    if (!orgIdParam) {
      return res.status(400).json({ message: "organizationId parameter is required" });
    }

    const organizationId = parseInt(orgIdParam);
    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "organizationId must be a valid number" });
    }

    const profile = await storage.getOrganizationProfileByOrgId(organizationId);
    res.json(profile);
  } catch (err) {
    console.error("Error fetching organization profile:", err);
    res.status(500).json({ message: "Failed to fetch organization profile" });
  }
});

// POST /api/intake/organization-profile - Create or update organization profile via intake
profileRouter.post("/intake/organization-profile", async (req: Request, res: Response) => {
  try {
    const userIdParam = req.query.organizationId as string;

    if (!userIdParam) {
      return res.status(400).json({ message: "organizationId parameter is required" });
    }

    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "organizationId must be a valid number" });
    }

    // Get the user to access their email
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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

    // Update user with userType if needed (logo saved to organization and organizationProfile)
    const userUpdates: any = {};
    if (!user.userType) {
      userUpdates.userType = 'organization';
    }
    if (Object.keys(userUpdates).length > 0) {
      await storage.updateUser(user.id, userUpdates);
    }

    // Update organization with logo if provided
    if (req.body.logo) {
      await storage.updateOrganization(organizationId, { logo: req.body.logo });
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
    console.error("Error saving organization profile:", err);
    res.status(500).json({ message: "Failed to save organization profile" });
  }
});
