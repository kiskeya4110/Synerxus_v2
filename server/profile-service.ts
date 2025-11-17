import { db } from "./db";
import { users, volunteerProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { VolunteerProfile, InsertVolunteerProfile } from "@shared/schema";

interface ProfileUpdateData {
  // User table fields
  avatar?: string;
  bio?: string;
  displayName?: string;
  skills?: string[];
  
  // Volunteer profile fields
  location?: string;
  interests?: string[];
  preferredSdgs?: number[];
  skillRatings?: Record<string, number>;
}

/**
 * Atomically updates both users and volunteer_profiles tables in a single transaction.
 * Ensures data consistency by rolling back all changes if any update fails.
 * 
 * @param userId - The ID of the user to update
 * @param profileData - Object containing fields to update across both tables
 * @returns The updated volunteer profile
 * @throws Error if either update fails (triggers automatic rollback)
 */
export async function updateVolunteerProfileWithUser(
  userId: number,
  profileData: ProfileUpdateData
): Promise<VolunteerProfile> {
  return await db.transaction(async (tx) => {
    // 1. Update user table
    const userUpdates: any = {};
    if (profileData.avatar !== undefined) userUpdates.avatar = profileData.avatar;
    if (profileData.bio !== undefined) userUpdates.bio = profileData.bio;
    if (profileData.displayName !== undefined) userUpdates.displayName = profileData.displayName;
    if (profileData.skills !== undefined) userUpdates.skills = profileData.skills;
    
    if (Object.keys(userUpdates).length > 0) {
      const [updatedUser] = await tx
        .update(users)
        .set(userUpdates)
        .where(eq(users.id, userId))
        .returning();
      
      if (!updatedUser) {
        throw new Error(`User ${userId} not found`);
      }
    }
    
    // 2. Update or create volunteer_profiles entry
    const [existingProfile] = await tx
      .select()
      .from(volunteerProfiles)
      .where(eq(volunteerProfiles.userId, userId));
    
    const profileUpdates: Partial<InsertVolunteerProfile> = {};
    // volunteer_profiles stores skills, interests, location, preferredSdgs, and skillRatings
    // Keep skills in both tables for consistency with intake form
    if (profileData.skills !== undefined) {
      profileUpdates.skills = profileData.skills || [];
    }
    if (profileData.interests !== undefined) {
      profileUpdates.interests = profileData.interests || [];
    }
    if (profileData.location !== undefined) {
      profileUpdates.location = profileData.location || null;
    }
    if (profileData.preferredSdgs !== undefined) {
      profileUpdates.preferredSdgs = profileData.preferredSdgs || [];
    }
    if (profileData.skillRatings !== undefined) {
      profileUpdates.skillRatings = profileData.skillRatings;
    }
    
    let updatedProfile: VolunteerProfile;
    
    if (existingProfile) {
      // Update existing profile
      if (Object.keys(profileUpdates).length > 0) {
        const [result] = await tx
          .update(volunteerProfiles)
          .set(profileUpdates)
          .where(eq(volunteerProfiles.id, existingProfile.id))
          .returning();
        
        if (!result) {
          throw new Error(`Failed to update volunteer_profiles for user ${userId}`);
        }
        updatedProfile = result;
      } else {
        updatedProfile = existingProfile;
      }
    } else {
      // Create new profile with all volunteer data (matching intake form structure)
      const newProfileData: InsertVolunteerProfile = {
        userId,
        skills: profileData.skills || [],
        interests: profileData.interests || [],
        location: profileData.location || null,
        preferredSdgs: profileData.preferredSdgs || [],
        skillRatings: profileData.skillRatings || {},
        onboardingCompleted: false
      };
      
      const [result] = await tx
        .insert(volunteerProfiles)
        .values(newProfileData)
        .returning();
      
      if (!result) {
        throw new Error(`Failed to create volunteer_profiles for user ${userId}`);
      }
      updatedProfile = result;
    }
    
    return updatedProfile;
  });
}
