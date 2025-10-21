import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { Volunteer, MatchableOrganization } from '@shared/schema';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

export interface MatchmakerResponse {
  success: boolean;
  matches?: MatchResult[];
  stats?: {
    total_volunteers: number;
    total_organizations: number;
    matches_found: number;
    threshold: number;
  };
  error?: string;
  error_type?: string;
}

export interface MatchmakerInput {
  volunteers: Volunteer[];
  organizations: MatchableOrganization[];
  threshold?: number;
}

/**
 * Call the Python matchmaker script to compute volunteer-organization matches
 * 
 * @param volunteers - Array of volunteer profiles
 * @param organizations - Array of organization profiles
 * @param threshold - Minimum match score threshold (default: 40.0)
 * @returns Promise with match results
 */
export function runMatchmaker(
  volunteers: Volunteer[],
  organizations: MatchableOrganization[],
  threshold: number = 40.0
): Promise<MatchmakerResponse> {
  return new Promise((resolve, reject) => {
    // Get absolute path to Python script
    const scriptPath = path.join(__dirname, 'matchmaker.py');
    
    // Spawn Python process with unbuffered output (-u flag)
    const python = spawn('python3', ['-u', scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Prepare input data
    const inputData: MatchmakerInput = {
      volunteers,
      organizations,
      threshold
    };
    
    // Buffers to collect output
    let stdoutData: Buffer[] = [];
    let stderrData: Buffer[] = [];
    
    // Set timeout (30 seconds)
    const timeout = setTimeout(() => {
      python.kill('SIGTERM');
      reject(new Error('Matchmaker process timed out after 30 seconds'));
    }, 30000);
    
    // Collect stdout data
    python.stdout.on('data', (data) => {
      stdoutData.push(data);
    });
    
    // Collect stderr data (for debugging)
    python.stderr.on('data', (data) => {
      stderrData.push(data);
    });
    
    // Handle process completion
    python.on('close', (code) => {
      clearTimeout(timeout);
      
      const stdout = Buffer.concat(stdoutData).toString();
      const stderr = Buffer.concat(stderrData).toString();
      
      // Log stderr if present (warnings, debug info)
      if (stderr) {
        console.error('Python matchmaker stderr:', stderr);
      }
      
      if (code !== 0) {
        reject(new Error(`Matchmaker exited with code ${code}: ${stderr || stdout}`));
        return;
      }
      
      try {
        // Parse JSON output from Python
        const result: MatchmakerResponse = JSON.parse(stdout);
        
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error || 'Unknown matchmaker error'));
        }
      } catch (parseError) {
        reject(new Error(`Failed to parse matchmaker output: ${stdout}`));
      }
    });
    
    // Handle spawn errors
    python.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
    
    // Send input data to Python via stdin
    try {
      python.stdin.write(JSON.stringify(inputData));
      python.stdin.end();
    } catch (error) {
      clearTimeout(timeout);
      reject(new Error(`Failed to send data to Python: ${error}`));
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
  limit: number = 10,
  threshold: number = 40.0
): Promise<MatchResult[]> {
  // Find the specific volunteer
  const volunteer = volunteers.find(v => v.id === volunteerId);
  
  if (!volunteer) {
    throw new Error(`Volunteer with id ${volunteerId} not found`);
  }
  
  // Run matchmaker with just this volunteer
  const result = await runMatchmaker([volunteer], organizations, threshold);
  
  if (!result.success || !result.matches) {
    throw new Error(result.error || 'Matchmaker failed');
  }
  
  // Return top matches (already sorted by score)
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
  limit: number = 10,
  threshold: number = 40.0
): Promise<MatchResult[]> {
  // Find the specific organization
  const organization = organizations.find(o => o.id === organizationId);
  
  if (!organization) {
    throw new Error(`Organization with id ${organizationId} not found`);
  }
  
  // Run matchmaker with just this organization
  const result = await runMatchmaker(volunteers, [organization], threshold);
  
  if (!result.success || !result.matches) {
    throw new Error(result.error || 'Matchmaker failed');
  }
  
  // Return top matches (already sorted by score)
  return result.matches.slice(0, limit);
}
