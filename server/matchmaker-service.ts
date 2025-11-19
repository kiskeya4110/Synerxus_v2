import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import type { Volunteer, MatchableOrganization } from "@shared/schema";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the structure of match results
export interface MatchResult {
  volunteer_id: string;
  organization_id: string;
  score: number;
  breakdown: {
    skillMatch: number;
    locationMatch: number;
    interestMatch: number;
    sdgMatch: number;
  };
  reasons: string[];
}

// Response structure for the matchmaker
export interface MatchmakerResponse {
  success: boolean;
  matches?: MatchResult[]; // Array of match results
  stats?: {
    total_volunteers: number; // Total number of volunteers considered
    total_organizations: number; // Total number of organizations considered
    matches_found: number; // Number of successful matches
    threshold: number; // Match score threshold used
  };
  error?: string; // Error message if any
  error_type?: string; // Type of error encountered
}

// Input structure for the matchmaker
export interface MatchmakerInput {
  volunteers: Volunteer[];
  organizations: MatchableOrganization[];
  threshold?: number; // Minimum match score threshold
}

// Centralized error handling function
const handleError = (error: Error, reject: (reason?: any) => void) => {
  console.error(error.message); // Log the error message to the console
  reject(error); // Reject the promise with the error
};

/**
 * Call the Python matchmaker script to compute volunteer-organization matches
 *
 * @param volunteers - Array of volunteer profiles
 * @param organizations - Array of organization profiles
 * @param threshold - Minimum match score threshold (default: 40.0)
 * @param timeoutDuration - Time allowed for the process to complete (default: 30 seconds)
 * @returns Promise with match results
 */
export function runMatchmaker(
  volunteers: Volunteer[],
  organizations: MatchableOrganization[],
  threshold: number = 40.0, // Default match threshold
  timeoutDuration: number = 30000, // Default timeout in milliseconds
): Promise<MatchmakerResponse> {
  return new Promise((resolve, reject) => {
    // Get absolute path to the Python script
    const scriptPath = path.join(__dirname, "matchmaker.py");

    // Spawn a new Python process to run the matchmaker script
    const python = spawn("python3", ["-u", scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Prepare input data for the Python script
    const inputData: MatchmakerInput = { volunteers, organizations, threshold };
    let stdoutData: Buffer[] = []; // Buffer to collect standard output
    let stderrData: Buffer[] = []; // Buffer to collect standard error

    // Set a timeout to avoid long-running processes
    const timeout = setTimeout(() => {
      python.kill("SIGTERM"); // Terminate the process
      handleError(new Error("Matchmaker process timed out"), reject); // Reject with timeout error
    }, timeoutDuration);

    // Collect data from standard output
    python.stdout.on("data", (data) => stdoutData.push(data));
    // Collect data from standard error (for debugging)
    python.stderr.on("data", (data) => stderrData.push(data));

    // Handle the process completion
    python.on("close", (code) => {
      clearTimeout(timeout); // Clear the timeout once process is complete
      const stdout = Buffer.concat(stdoutData).toString(); // Combine stdout into a single string

      // If the process exited with a non-zero code, handle the error
      if (code !== 0) {
        handleError(
          new Error(
            `Matchmaker exited with code ${code}: ${stderrData.join("") || stdout}`,
          ),
          reject,
        );
        return;
      }

      try {
        // Parse the JSON output received from the Python script
        const result: MatchmakerResponse = JSON.parse(stdout);
        if (result.success) {
          resolve(result); // Resolve the promise with the match results
        } else {
          handleError(
            new Error(result.error || "Unknown matchmaker error"),
            reject,
          );
        }
      } catch (parseError) {
        handleError(
          new Error(`Failed to parse matchmaker output: ${stdout}`),
          reject,
        ); // Handle JSON parse errors
      }
    });

    // Handle any errors that occur while spawning the Python process
    python.on("error", (error) => {
      clearTimeout(timeout);
      handleError(
        new Error(`Failed to start Python process: ${error.message}`),
        reject,
      );
    });

    // Send input data to Python via stdin
    try {
      python.stdin.write(JSON.stringify(inputData)); // Convert input data to JSON and write to stdin
      python.stdin.end(); // End the stdin stream
    } catch (error) {
      clearTimeout(timeout);
      handleError(new Error(`Failed to send data to Python: ${error}`), reject); // Handle errors during writing
    }
  });
}

/**
 * Get top matches for a specific volunteer
 *
 * @param volunteerId - ID of the volunteer
 * @param volunteers - Array of all volunteers
 * @param organizations - Array of all organizations
 * @param limit - Maximum number of matches to return (default: 10)
 * @param threshold - Minimum match score threshold (default: 40.0)
 * @returns Promise with top matches for the volunteer
 */
export async function getVolunteerMatches(
  volunteerId: string,
  volunteers: Volunteer[],
  organizations: MatchableOrganization[],
  limit: number = 10, // Default limit on matches
  threshold: number = 40.0, // Default threshold
): Promise<MatchResult[]> {
  // Find the specific volunteer by ID
  const volunteer = volunteers.find((v) => v.id === volunteerId);

  if (!volunteer) {
    throw new Error(`Volunteer with id ${volunteerId} not found`); // Handle case where volunteer isn't found
  }

  // Run the matchmaker with the specified volunteer and organization list
  const result = await runMatchmaker([volunteer], organizations, threshold);

  if (!result.success || !result.matches) {
    throw new Error(result.error || "Matchmaker failed"); // Handle matchmaker failure
  }

  // Return top matches based on the limit
  return result.matches.slice(0, limit);
}

/**
 * Get top volunteers for a specific organization
 *
 * @param organizationId - ID of the organization
 * @param volunteers - Array of all volunteers
 * @param organizations - Array of all organizations
 * @param limit - Maximum number of matches to return (default: 10)
 * @param threshold - Minimum match score threshold (default: 40.0)
 * @returns Promise with top volunteer matches for the organization
 */
export async function getOrganizationMatches(
  organizationId: string,
  volunteers: Volunteer[],
  organizations: MatchableOrganization[],
  limit: number = 10, // Default limit on matches
  threshold: number = 40.0, // Default threshold
): Promise<MatchResult[]> {
  // Find the specific organization by ID
  const organization = organizations.find((o) => o.id === organizationId);

  if (!organization) {
    throw new Error(`Organization with id ${organizationId} not found`); // Handle case where organization isn't found
  }

  // Run the matchmaker with the specified organization and volunteer list
  const result = await runMatchmaker(volunteers, [organization], threshold);

  if (!result.success || !result.matches) {
    throw new Error(result.error || "Matchmaker failed"); // Handle matchmaker failure
  }

  // Return top matches based on the limit
  return result.matches.slice(0, limit);
}
