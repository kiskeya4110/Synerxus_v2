import { vi, beforeEach, afterEach } from 'vitest';

// Mock storage module
export const mockStorage = {
  getVolunteerActivity: vi.fn(),
  updateVolunteerActivity: vi.fn(),
  createVolunteerActivity: vi.fn(),
  listVolunteerActivities: vi.fn(),
  listVolunteerActivitiesByUser: vi.fn(),
  listVolunteerActivitiesByProject: vi.fn(),
  getProjectImpact: vi.fn(),
  updateProjectImpact: vi.fn(),
  createProjectImpact: vi.fn(),
  listProjectImpacts: vi.fn(),
  listProjectImpactsByProject: vi.fn(),
  listProjectImpactsByMetric: vi.fn(),
  getUser: vi.fn(),
  getVolunteerProfileByUserId: vi.fn(),
  listEmployeeEngagement: vi.fn(),
  createEmployeeEngagement: vi.fn(),
  updateEmployeeEngagement: vi.fn(),
  createVerifiedOutput: vi.fn(),
  getProject: vi.fn(),
  updateProject: vi.fn(),
  listProjectsByOrganization: vi.fn(),
  listProjectAssignmentsByProject: vi.fn(),
  listProjectAssignmentsByVolunteer: vi.fn(),
  updateProjectAssignment: vi.fn(),
  listCSRChallenges: vi.fn(),
  updateCSRChallenge: vi.fn(),
  getImpactMetric: vi.fn(),
  listImpactMetrics: vi.fn(),
  listImpactMetricsByCategory: vi.fn(),
  listImpactMetricsBySDG: vi.fn(),
  createImpactMetric: vi.fn(),
  updateImpactMetric: vi.fn(),
};

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
