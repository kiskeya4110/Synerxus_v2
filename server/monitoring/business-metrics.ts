/**
 * Business Metrics Tracking Service
 *
 * Tracks business-level metrics:
 * - Active volunteers
 * - Hours logged (daily/weekly/monthly)
 * - Organizations onboarded
 * - SDG goals impacted
 * - User engagement score
 */

import { EventEmitter } from 'events';
import { logger } from '../logger';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface VolunteerMetrics {
  totalVolunteers: number;
  activeVolunteers: number; // Active in last 30 days
  newVolunteersThisMonth: number;
  retentionRate: number; // Percentage
}

export interface HoursMetrics {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
  averagePerVolunteer: number;
}

export interface OrganizationMetrics {
  totalOrganizations: number;
  activeOrganizations: number;
  newThisMonth: number;
  averageProjectsPerOrg: number;
}

export interface SDGMetrics {
  goalsImpacted: number[];
  hoursPerGoal: Record<number, number>;
  volunteersPerGoal: Record<number, number>;
  topGoals: Array<{ goal: number; hours: number; volunteers: number }>;
}

export interface EngagementMetrics {
  overallScore: number; // 0-100
  loginFrequency: number; // Average logins per week
  taskCompletionRate: number;
  applicationSuccessRate: number;
  messageResponseRate: number;
}

export interface BusinessMetricsSummary {
  timestamp: string;
  period: string;
  volunteers: VolunteerMetrics;
  hours: HoursMetrics;
  organizations: OrganizationMetrics;
  sdg: SDGMetrics;
  engagement: EngagementMetrics;
}

export interface BusinessEvent {
  type: BusinessEventType;
  timestamp: number;
  data: Record<string, any>;
}

export type BusinessEventType =
  | 'volunteer_registered'
  | 'volunteer_active'
  | 'hours_logged'
  | 'organization_created'
  | 'project_created'
  | 'task_completed'
  | 'application_submitted'
  | 'application_accepted'
  | 'application_rejected'
  | 'sdg_activity'
  | 'message_sent'
  | 'login';

// =============================================================================
// CONFIGURATION
// =============================================================================

const METRICS_CACHE_TTL_MS = 300000; // 5 minutes cache for computed metrics
const EVENT_RETENTION_MS = 86400000 * 30; // 30 days retention for events

// =============================================================================
// BUSINESS METRICS SERVICE
// =============================================================================

class BusinessMetricsService extends EventEmitter {
  private events: BusinessEvent[] = [];
  private cachedMetrics: BusinessMetricsSummary | null = null;
  private cacheTimestamp: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Counters for real-time tracking
  private counters = {
    volunteersRegisteredToday: 0,
    hoursLoggedToday: 0,
    tasksCompletedToday: 0,
    applicationsToday: 0,
    loginsToday: 0,
    messagestoday: 0,
    lastDayReset: this.getStartOfDay(),
  };

  constructor() {
    super();
    this.startCleanup();
    this.resetDailyCounters();
  }

  // ===========================================================================
  // EVENT TRACKING
  // ===========================================================================

  /**
   * Track a business event
   */
  trackEvent(type: BusinessEventType, data: Record<string, any> = {}): void {
    const event: BusinessEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    this.events.push(event);
    this.updateRealTimeCounters(event);
    this.emit('event', event);

    // Invalidate cache when new events come in
    this.cachedMetrics = null;

    logger.debug(`Business event tracked: ${type}`, data);
  }

  /**
   * Track volunteer registration
   */
  trackVolunteerRegistration(volunteerId: number, referralSource?: string): void {
    this.trackEvent('volunteer_registered', {
      volunteerId,
      referralSource,
    });
  }

  /**
   * Track volunteer activity (any action)
   */
  trackVolunteerActive(volunteerId: number): void {
    this.trackEvent('volunteer_active', { volunteerId });
  }

  /**
   * Track hours logged
   */
  trackHoursLogged(
    volunteerId: number,
    hours: number,
    projectId?: number,
    sdgGoals?: number[]
  ): void {
    this.trackEvent('hours_logged', {
      volunteerId,
      hours,
      projectId,
      sdgGoals,
    });

    // Also track SDG activity if goals are provided
    if (sdgGoals && sdgGoals.length > 0) {
      for (const goal of sdgGoals) {
        this.trackEvent('sdg_activity', {
          goal,
          hours,
          volunteerId,
          projectId,
        });
      }
    }
  }

  /**
   * Track organization creation
   */
  trackOrganizationCreated(organizationId: number, organizationName: string): void {
    this.trackEvent('organization_created', {
      organizationId,
      organizationName,
    });
  }

  /**
   * Track project creation
   */
  trackProjectCreated(
    projectId: number,
    organizationId: number,
    sdgGoals?: number[]
  ): void {
    this.trackEvent('project_created', {
      projectId,
      organizationId,
      sdgGoals,
    });
  }

  /**
   * Track task completion
   */
  trackTaskCompleted(
    taskId: number,
    volunteerId: number,
    projectId?: number
  ): void {
    this.trackEvent('task_completed', {
      taskId,
      volunteerId,
      projectId,
    });
  }

  /**
   * Track application submission
   */
  trackApplicationSubmitted(
    applicationId: number,
    volunteerId: number,
    opportunityId: number
  ): void {
    this.trackEvent('application_submitted', {
      applicationId,
      volunteerId,
      opportunityId,
    });
  }

  /**
   * Track application outcome
   */
  trackApplicationOutcome(
    applicationId: number,
    outcome: 'accepted' | 'rejected'
  ): void {
    this.trackEvent(
      outcome === 'accepted' ? 'application_accepted' : 'application_rejected',
      { applicationId }
    );
  }

  /**
   * Track user login
   */
  trackLogin(userId: number, userType: string): void {
    this.trackEvent('login', { userId, userType });
  }

  /**
   * Track message sent
   */
  trackMessageSent(userId: number, threadId?: number): void {
    this.trackEvent('message_sent', { userId, threadId });
  }

  // ===========================================================================
  // METRICS COMPUTATION
  // ===========================================================================

  /**
   * Get computed business metrics summary
   * Uses caching for performance
   */
  async getMetrics(forceRefresh: boolean = false): Promise<BusinessMetricsSummary> {
    const now = Date.now();

    // Return cached metrics if still valid
    if (
      !forceRefresh &&
      this.cachedMetrics &&
      now - this.cacheTimestamp < METRICS_CACHE_TTL_MS
    ) {
      return this.cachedMetrics;
    }

    const metrics = await this.computeMetrics();
    this.cachedMetrics = metrics;
    this.cacheTimestamp = now;

    return metrics;
  }

  /**
   * Compute all business metrics from events
   */
  private async computeMetrics(): Promise<BusinessMetricsSummary> {
    const now = Date.now();
    const dayStart = this.getStartOfDay();
    const weekStart = this.getStartOfWeek();
    const monthStart = this.getStartOfMonth();

    // Filter events by time periods
    const todayEvents = this.events.filter(e => e.timestamp >= dayStart);
    const weekEvents = this.events.filter(e => e.timestamp >= weekStart);
    const monthEvents = this.events.filter(e => e.timestamp >= monthStart);

    return {
      timestamp: new Date().toISOString(),
      period: 'current',
      volunteers: this.computeVolunteerMetrics(monthEvents),
      hours: this.computeHoursMetrics(todayEvents, weekEvents, monthEvents),
      organizations: this.computeOrganizationMetrics(monthEvents),
      sdg: this.computeSDGMetrics(monthEvents),
      engagement: this.computeEngagementMetrics(weekEvents),
    };
  }

  /**
   * Compute volunteer metrics
   */
  private computeVolunteerMetrics(monthEvents: BusinessEvent[]): VolunteerMetrics {
    const registrations = monthEvents.filter(e => e.type === 'volunteer_registered');
    const activeVolunteers = new Set(
      monthEvents
        .filter(e => e.data.volunteerId)
        .map(e => e.data.volunteerId)
    );

    // For retention, we'd need historical data - using placeholder
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const activeLastMonth = this.events
      .filter(e => e.timestamp >= thirtyDaysAgo && e.data.volunteerId)
      .reduce((set, e) => set.add(e.data.volunteerId), new Set());

    return {
      totalVolunteers: activeLastMonth.size, // Would come from DB in production
      activeVolunteers: activeVolunteers.size,
      newVolunteersThisMonth: registrations.length,
      retentionRate: activeLastMonth.size > 0
        ? Math.round((activeVolunteers.size / activeLastMonth.size) * 100)
        : 0,
    };
  }

  /**
   * Compute hours metrics
   */
  private computeHoursMetrics(
    todayEvents: BusinessEvent[],
    weekEvents: BusinessEvent[],
    monthEvents: BusinessEvent[]
  ): HoursMetrics {
    const sumHours = (events: BusinessEvent[]): number =>
      events
        .filter(e => e.type === 'hours_logged')
        .reduce((sum, e) => sum + (e.data.hours || 0), 0);

    const allTimeHours = sumHours(this.events);
    const uniqueVolunteers = new Set(
      this.events
        .filter(e => e.type === 'hours_logged')
        .map(e => e.data.volunteerId)
    );

    return {
      today: Math.round(sumHours(todayEvents) * 10) / 10,
      thisWeek: Math.round(sumHours(weekEvents) * 10) / 10,
      thisMonth: Math.round(sumHours(monthEvents) * 10) / 10,
      allTime: Math.round(allTimeHours * 10) / 10,
      averagePerVolunteer: uniqueVolunteers.size > 0
        ? Math.round((allTimeHours / uniqueVolunteers.size) * 10) / 10
        : 0,
    };
  }

  /**
   * Compute organization metrics
   */
  private computeOrganizationMetrics(monthEvents: BusinessEvent[]): OrganizationMetrics {
    const newOrgs = monthEvents.filter(e => e.type === 'organization_created');
    const activeOrgs = new Set(
      monthEvents
        .filter(e => e.data.organizationId)
        .map(e => e.data.organizationId)
    );

    const projects = this.events.filter(e => e.type === 'project_created');
    const projectsByOrg = projects.reduce((acc, e) => {
      const orgId = e.data.organizationId;
      acc[orgId] = (acc[orgId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const orgCount = Object.keys(projectsByOrg).length;

    return {
      totalOrganizations: orgCount,
      activeOrganizations: activeOrgs.size,
      newThisMonth: newOrgs.length,
      averageProjectsPerOrg: orgCount > 0
        ? Math.round((projects.length / orgCount) * 10) / 10
        : 0,
    };
  }

  /**
   * Compute SDG metrics
   */
  private computeSDGMetrics(monthEvents: BusinessEvent[]): SDGMetrics {
    const sdgActivities = monthEvents.filter(e => e.type === 'sdg_activity');
    const hoursPerGoal: Record<number, number> = {};
    const volunteersPerGoal: Record<number, Set<number>> = {};

    for (const event of sdgActivities) {
      const goal = event.data.goal;
      const hours = event.data.hours || 0;
      const volunteerId = event.data.volunteerId;

      hoursPerGoal[goal] = (hoursPerGoal[goal] || 0) + hours;

      if (!volunteersPerGoal[goal]) {
        volunteersPerGoal[goal] = new Set();
      }
      if (volunteerId) {
        volunteersPerGoal[goal].add(volunteerId);
      }
    }

    const goalsImpacted = Object.keys(hoursPerGoal).map(Number);

    // Get top goals by hours
    const topGoals = goalsImpacted
      .map(goal => ({
        goal,
        hours: Math.round(hoursPerGoal[goal] * 10) / 10,
        volunteers: volunteersPerGoal[goal]?.size || 0,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    return {
      goalsImpacted,
      hoursPerGoal: Object.fromEntries(
        Object.entries(hoursPerGoal).map(([k, v]) => [k, Math.round(v * 10) / 10])
      ),
      volunteersPerGoal: Object.fromEntries(
        Object.entries(volunteersPerGoal).map(([k, v]) => [k, v.size])
      ),
      topGoals,
    };
  }

  /**
   * Compute engagement metrics
   */
  private computeEngagementMetrics(weekEvents: BusinessEvent[]): EngagementMetrics {
    const logins = weekEvents.filter(e => e.type === 'login');
    const tasksCompleted = weekEvents.filter(e => e.type === 'task_completed');
    const applicationsSubmitted = weekEvents.filter(e => e.type === 'application_submitted');
    const applicationsAccepted = weekEvents.filter(e => e.type === 'application_accepted');
    const messages = weekEvents.filter(e => e.type === 'message_sent');

    const uniqueUsers = new Set(logins.map(e => e.data.userId));
    const loginFrequency = uniqueUsers.size > 0
      ? Math.round((logins.length / uniqueUsers.size) * 10) / 10
      : 0;

    // Task completion rate based on completed vs active users
    const activeUsers = new Set(weekEvents.filter(e => e.data.userId).map(e => e.data.userId));
    const taskCompletionRate = activeUsers.size > 0
      ? Math.min(100, Math.round((tasksCompleted.length / activeUsers.size) * 100))
      : 0;

    // Application success rate
    const applicationSuccessRate = applicationsSubmitted.length > 0
      ? Math.round((applicationsAccepted.length / applicationsSubmitted.length) * 100)
      : 0;

    // Message response rate (simplified - would need thread analysis in production)
    const messageResponseRate = Math.min(100, Math.round(messages.length * 5)); // Placeholder

    // Overall engagement score
    const overallScore = Math.round(
      (loginFrequency * 10 +
        taskCompletionRate * 0.4 +
        applicationSuccessRate * 0.3 +
        messageResponseRate * 0.2) / 2
    );

    return {
      overallScore: Math.min(100, overallScore),
      loginFrequency,
      taskCompletionRate,
      applicationSuccessRate,
      messageResponseRate,
    };
  }

  // ===========================================================================
  // REAL-TIME COUNTERS
  // ===========================================================================

  /**
   * Update real-time counters
   */
  private updateRealTimeCounters(event: BusinessEvent): void {
    this.checkDayReset();

    switch (event.type) {
      case 'volunteer_registered':
        this.counters.volunteersRegisteredToday++;
        break;
      case 'hours_logged':
        this.counters.hoursLoggedToday += event.data.hours || 0;
        break;
      case 'task_completed':
        this.counters.tasksCompletedToday++;
        break;
      case 'application_submitted':
        this.counters.applicationsToday++;
        break;
      case 'login':
        this.counters.loginsToday++;
        break;
      case 'message_sent':
        this.counters.messagestoday++;
        break;
    }
  }

  /**
   * Get real-time counters
   */
  getRealTimeCounters(): typeof this.counters {
    this.checkDayReset();
    return { ...this.counters };
  }

  /**
   * Check and reset daily counters if needed
   */
  private checkDayReset(): void {
    const today = this.getStartOfDay();
    if (today > this.counters.lastDayReset) {
      this.resetDailyCounters();
    }
  }

  /**
   * Reset daily counters
   */
  private resetDailyCounters(): void {
    this.counters = {
      volunteersRegisteredToday: 0,
      hoursLoggedToday: 0,
      tasksCompletedToday: 0,
      applicationsToday: 0,
      loginsToday: 0,
      messagestoday: 0,
      lastDayReset: this.getStartOfDay(),
    };
  }

  // ===========================================================================
  // HELPER FUNCTIONS
  // ===========================================================================

  private getStartOfDay(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  private getStartOfWeek(): number {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff).getTime();
  }

  private getStartOfMonth(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }

  /**
   * Cleanup old events
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - EVENT_RETENTION_MS;
      this.events = this.events.filter(e => e.timestamp > cutoff);
    }, 3600000); // Run hourly
  }

  /**
   * Stop the service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const businessMetrics = new BusinessMetricsService();

export default businessMetrics;
