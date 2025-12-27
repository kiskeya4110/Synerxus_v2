import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';

// Create mock storage - must be declared before mocking
const mockStorage = {
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
  getAIUSetting: vi.fn(),
  updateAIUSetting: vi.fn(),
};

// Mock the storage module - hoisted to top
vi.mock('../storage', () => ({
  storage: mockStorage,
}));

// Mock the utils module
vi.mock('../routes/utils', () => ({
  handleValidationError: vi.fn((err) => ({ status: 400, message: err.message || 'Validation error' })),
  calculateProjectProgress: vi.fn().mockResolvedValue(50),
  detectDuplicateImpact: vi.fn().mockResolvedValue({ isDuplicate: false, dedupGroupId: null }),
  applyRoleBasedAttribution: vi.fn((value) => value),
  updateAiuKpiFromImpacts: vi.fn().mockResolvedValue(undefined),
}));

// Mock auth middleware
vi.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => next(),
  optionalAuthMiddleware: (req: any, res: any, next: any) => next(),
}));

// Create Express app for testing
async function createTestApp() {
  // Dynamic import after mocks are set up
  const { activitiesRouter } = await import('../routes/activities.router');
  const app = express();
  app.use(express.json());
  app.use('/api', activitiesRouter);
  return app;
}

describe('Activities Router', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/volunteer-activities/:id/approve', () => {
    it('should approve a volunteer activity and update status', async () => {
      const mockActivity = {
        id: 1,
        userId: 100,
        projectId: 50,
        hours: 5,
        description: 'Test activity',
        verificationStatus: 'pending',
      };

      const mockUpdatedActivity = {
        ...mockActivity,
        verificationStatus: 'approved',
      };

      const mockUser = {
        id: 100,
        email: 'volunteer@example.com',
        displayName: 'Test Volunteer',
      };

      const mockProfile = {
        userId: 100,
        employerId: 10,
        volunteerName: 'Test Volunteer',
      };

      mockStorage.getVolunteerActivity.mockResolvedValue(mockActivity);
      mockStorage.updateVolunteerActivity.mockResolvedValue(mockUpdatedActivity);
      mockStorage.getUser.mockResolvedValue(mockUser);
      mockStorage.getVolunteerProfileByUserId.mockResolvedValue(mockProfile);
      mockStorage.listEmployeeEngagement.mockResolvedValue([]);
      mockStorage.createEmployeeEngagement.mockResolvedValue({ id: 1 });
      mockStorage.createVerifiedOutput.mockResolvedValue({ id: 1 });
      mockStorage.getProject.mockResolvedValue({ id: 50, sdgGoals: [13] });
      mockStorage.listCSRChallenges.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/volunteer-activities/1/approve')
        .send({ reviewerId: 200 });

      expect(response.status).toBe(200);
      expect(response.body.verificationStatus).toBe('approved');
      expect(mockStorage.updateVolunteerActivity).toHaveBeenCalledWith(1, {
        verificationStatus: 'approved',
      });
    });

    it('should return 404 for non-existent activity', async () => {
      mockStorage.getVolunteerActivity.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/volunteer-activities/999/approve')
        .send({ reviewerId: 200 });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Volunteer activity not found');
    });

    it('should create employee engagement record when volunteer has employer', async () => {
      const mockActivity = {
        id: 1,
        userId: 100,
        projectId: 50,
        hours: 5,
        verificationStatus: 'pending',
      };

      const mockUser = {
        id: 100,
        email: 'volunteer@example.com',
        displayName: 'Test Volunteer',
      };

      const mockProfile = {
        userId: 100,
        employerId: 10,
        volunteerName: 'Test Volunteer',
      };

      mockStorage.getVolunteerActivity.mockResolvedValue(mockActivity);
      mockStorage.updateVolunteerActivity.mockResolvedValue({
        ...mockActivity,
        verificationStatus: 'approved',
      });
      mockStorage.getUser.mockResolvedValue(mockUser);
      mockStorage.getVolunteerProfileByUserId.mockResolvedValue(mockProfile);
      mockStorage.listEmployeeEngagement.mockResolvedValue([]);
      mockStorage.createEmployeeEngagement.mockResolvedValue({ id: 1 });
      mockStorage.createVerifiedOutput.mockResolvedValue({ id: 1 });
      mockStorage.getProject.mockResolvedValue({ id: 50, sdgGoals: [] });
      mockStorage.listCSRChallenges.mockResolvedValue([]);

      await request(app)
        .post('/api/volunteer-activities/1/approve')
        .send({ reviewerId: 200 });

      expect(mockStorage.createEmployeeEngagement).toHaveBeenCalledWith({
        partnerId: 10,
        employeeEmail: 'volunteer@example.com',
        employeeName: 'Test Volunteer',
        projectId: 50,
        hoursVolunteered: 5,
        engagementType: 'vto',
      });
    });

    it('should update existing employee engagement when record exists', async () => {
      const mockActivity = {
        id: 1,
        userId: 100,
        projectId: 50,
        hours: 3,
        verificationStatus: 'pending',
      };

      const existingEngagement = {
        id: 5,
        partnerId: 10,
        employeeEmail: 'volunteer@example.com',
        hoursVolunteered: 5,
      };

      const mockUser = {
        id: 100,
        email: 'volunteer@example.com',
        displayName: 'Test Volunteer',
      };

      const mockProfile = {
        userId: 100,
        employerId: 10,
      };

      mockStorage.getVolunteerActivity.mockResolvedValue(mockActivity);
      mockStorage.updateVolunteerActivity.mockResolvedValue({
        ...mockActivity,
        verificationStatus: 'approved',
      });
      mockStorage.getUser.mockResolvedValue(mockUser);
      mockStorage.getVolunteerProfileByUserId.mockResolvedValue(mockProfile);
      mockStorage.listEmployeeEngagement.mockResolvedValue([existingEngagement]);
      mockStorage.updateEmployeeEngagement.mockResolvedValue({ id: 5, hoursVolunteered: 8 });
      mockStorage.createVerifiedOutput.mockResolvedValue({ id: 1 });
      mockStorage.getProject.mockResolvedValue({ id: 50, sdgGoals: [] });
      mockStorage.listCSRChallenges.mockResolvedValue([]);

      await request(app)
        .post('/api/volunteer-activities/1/approve')
        .send({ reviewerId: 200 });

      expect(mockStorage.updateEmployeeEngagement).toHaveBeenCalledWith(5, {
        hoursVolunteered: 8, // 5 existing + 3 new
        projectId: 50,
      });
    });

    it('should create verified output audit record on approval', async () => {
      const mockActivity = {
        id: 1,
        userId: 100,
        projectId: 50,
        hours: 5,
        verificationStatus: 'pending',
      };

      const mockUser = {
        id: 100,
        email: 'volunteer@example.com',
        displayName: 'Test Volunteer',
      };

      const mockProfile = {
        userId: 100,
        employerId: 10,
      };

      mockStorage.getVolunteerActivity.mockResolvedValue(mockActivity);
      mockStorage.updateVolunteerActivity.mockResolvedValue({
        ...mockActivity,
        verificationStatus: 'approved',
      });
      mockStorage.getUser.mockResolvedValue(mockUser);
      mockStorage.getVolunteerProfileByUserId.mockResolvedValue(mockProfile);
      mockStorage.listEmployeeEngagement.mockResolvedValue([]);
      mockStorage.createEmployeeEngagement.mockResolvedValue({ id: 1 });
      mockStorage.createVerifiedOutput.mockResolvedValue({ id: 1 });
      mockStorage.getProject.mockResolvedValue({ id: 50, sdgGoals: [] });
      mockStorage.listCSRChallenges.mockResolvedValue([]);

      await request(app)
        .post('/api/volunteer-activities/1/approve')
        .send({ reviewerId: 200 });

      expect(mockStorage.createVerifiedOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          activityId: 1,
          partnerId: 10,
          projectId: 50,
          outputType: 'hours',
          outputValue: 5,
          verificationStatus: 'verified',
          verifiedBy: 200,
        })
      );
    });
  });

  describe('POST /api/volunteer-activities/:id/reject', () => {
    it('should reject a volunteer activity', async () => {
      const mockActivity = {
        id: 1,
        userId: 100,
        verificationStatus: 'pending',
      };

      mockStorage.getVolunteerActivity.mockResolvedValue(mockActivity);
      mockStorage.updateVolunteerActivity.mockResolvedValue({
        ...mockActivity,
        verificationStatus: 'rejected',
      });

      const response = await request(app)
        .post('/api/volunteer-activities/1/reject')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.verificationStatus).toBe('rejected');
    });

    it('should return 404 for non-existent activity', async () => {
      mockStorage.getVolunteerActivity.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/volunteer-activities/999/reject')
        .send();

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/project-impacts/:id/approve', () => {
    it('should approve a project impact', async () => {
      const mockImpact = {
        id: 1,
        projectId: 50,
        userId: 100,
        metricId: 5,
        value: 100,
        verificationStatus: 'pending',
      };

      mockStorage.getProjectImpact.mockResolvedValue(mockImpact);
      mockStorage.updateProjectImpact.mockResolvedValue({
        ...mockImpact,
        verificationStatus: 'approved',
      });
      mockStorage.getVolunteerProfileByUserId.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/project-impacts/1/approve')
        .send({ reviewerId: 200 });

      expect(response.status).toBe(200);
      expect(response.body.verificationStatus).toBe('approved');
    });

    it('should return 404 for non-existent impact', async () => {
      mockStorage.getProjectImpact.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/project-impacts/999/approve')
        .send({ reviewerId: 200 });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Project impact not found');
    });

    it('should create verified output for CSR when volunteer has employer', async () => {
      const mockImpact = {
        id: 1,
        projectId: 50,
        userId: 100,
        metricId: 5,
        value: 100,
        verificationStatus: 'pending',
      };

      const mockProfile = {
        userId: 100,
        employerId: 10,
      };

      mockStorage.getProjectImpact.mockResolvedValue(mockImpact);
      mockStorage.updateProjectImpact.mockResolvedValue({
        ...mockImpact,
        verificationStatus: 'approved',
      });
      mockStorage.getVolunteerProfileByUserId.mockResolvedValue(mockProfile);
      mockStorage.createVerifiedOutput.mockResolvedValue({ id: 1 });

      await request(app)
        .post('/api/project-impacts/1/approve')
        .send({ reviewerId: 200 });

      expect(mockStorage.createVerifiedOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          activityId: null,
          partnerId: 10,
          projectId: 50,
          outputType: 'outcomes_achieved',
          outputValue: 100,
          verificationStatus: 'verified',
        })
      );
    });
  });

  describe('POST /api/project-impacts/:id/reject', () => {
    it('should reject a project impact', async () => {
      const mockImpact = {
        id: 1,
        projectId: 50,
        verificationStatus: 'pending',
      };

      mockStorage.getProjectImpact.mockResolvedValue(mockImpact);
      mockStorage.updateProjectImpact.mockResolvedValue({
        ...mockImpact,
        verificationStatus: 'rejected',
      });

      const response = await request(app)
        .post('/api/project-impacts/1/reject')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.verificationStatus).toBe('rejected');
    });
  });

  describe('GET /api/pending-approvals', () => {
    it('should return pending activities and impacts for an organization', async () => {
      const mockProjects = [{ id: 50 }, { id: 51 }];
      const mockActivities = [
        { id: 1, projectId: 50, userId: 100, verificationStatus: 'pending' },
        { id: 2, projectId: 50, userId: 101, verificationStatus: 'approved' },
      ];
      const mockImpacts = [
        { id: 1, projectId: 50, userId: 100, verificationStatus: 'pending' },
      ];

      mockStorage.listProjectsByOrganization.mockResolvedValue(mockProjects);
      mockStorage.listVolunteerActivities.mockResolvedValue(mockActivities);
      mockStorage.listProjectImpacts.mockResolvedValue(mockImpacts);
      mockStorage.getUser.mockResolvedValue({ id: 100, email: 'test@example.com', displayName: 'Test' });
      mockStorage.getProject.mockResolvedValue({ id: 50, name: 'Test Project' });
      mockStorage.getImpactMetric.mockResolvedValue({ id: 1, name: 'Test Metric' });

      const response = await request(app)
        .get('/api/pending-approvals')
        .query({ organizationId: 10 });

      expect(response.status).toBe(200);
      expect(response.body.pendingActivities).toHaveLength(1);
      expect(response.body.pendingImpacts).toHaveLength(1);
      expect(response.body.totalPending).toBe(2);
    });

    it('should return 400 when no organizationId or userId provided', async () => {
      const response = await request(app)
        .get('/api/pending-approvals');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('organizationId or userId is required');
    });

    it('should filter activities by organization projects', async () => {
      const mockProjects = [{ id: 50 }];
      const mockActivities = [
        { id: 1, projectId: 50, verificationStatus: 'pending' },
        { id: 2, projectId: 99, verificationStatus: 'pending' }, // Different project
      ];

      mockStorage.listProjectsByOrganization.mockResolvedValue(mockProjects);
      mockStorage.listVolunteerActivities.mockResolvedValue(mockActivities);
      mockStorage.listProjectImpacts.mockResolvedValue([]);
      mockStorage.getUser.mockResolvedValue({ id: 100, email: 'test@example.com' });
      mockStorage.getProject.mockResolvedValue({ id: 50, name: 'Test Project' });

      const response = await request(app)
        .get('/api/pending-approvals')
        .query({ organizationId: 10 });

      expect(response.body.pendingActivities).toHaveLength(1);
      expect(response.body.pendingActivities[0].id).toBe(1);
    });
  });

  describe('GET /api/volunteer-activities', () => {
    it('should return activities for a specific user', async () => {
      const mockActivities = [
        { id: 1, userId: 100, hours: 5 },
        { id: 2, userId: 100, hours: 3 },
      ];

      mockStorage.listVolunteerActivitiesByUser.mockResolvedValue(mockActivities);

      const response = await request(app)
        .get('/api/volunteer-activities')
        .query({ userId: 100 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should return activities for a specific project', async () => {
      const mockActivities = [
        { id: 1, projectId: 50, hours: 5 },
      ];

      mockStorage.listVolunteerActivitiesByProject.mockResolvedValue(mockActivities);
      mockStorage.getProject.mockResolvedValue({ id: 50, organizationId: 10 });

      const response = await request(app)
        .get('/api/volunteer-activities')
        .query({ projectId: 50 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('GET /api/volunteer-activities/:id', () => {
    it('should return a specific activity', async () => {
      const mockActivity = {
        id: 1,
        userId: 100,
        projectId: 50,
        hours: 5,
      };

      mockStorage.getVolunteerActivity.mockResolvedValue(mockActivity);

      const response = await request(app)
        .get('/api/volunteer-activities/1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
    });

    it('should return 404 for non-existent activity', async () => {
      mockStorage.getVolunteerActivity.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/volunteer-activities/999');

      expect(response.status).toBe(404);
    });
  });
});
