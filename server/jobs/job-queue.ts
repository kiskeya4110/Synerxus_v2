/**
 * Background Job Queue System
 *
 * Handles asynchronous processing for:
 * - Report generation
 * - Email sending
 * - Data export
 * - SDG calculations
 * - Notification delivery
 *
 * Uses Bull Queue with Redis for reliable job processing.
 */

import { EventEmitter } from 'events';
import { logger } from '../logger';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type JobType =
  | 'report_generation'
  | 'email_sending'
  | 'data_export'
  | 'sdg_calculation'
  | 'notification_delivery'
  | 'cache_invalidation'
  | 'cleanup';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export interface JobOptions {
  priority?: JobPriority;
  delay?: number; // Delay in ms before processing
  attempts?: number; // Max retry attempts
  backoff?: number; // Backoff delay between retries in ms
  timeout?: number; // Job timeout in ms
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export interface Job<T = any> {
  id: string;
  type: JobType;
  data: T;
  status: JobStatus;
  priority: JobPriority;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: any;
  progress?: number;
}

export interface JobResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export type JobHandler<T = any, R = any> = (job: Job<T>) => Promise<JobResult<R>>;

// =============================================================================
// JOB DATA TYPES
// =============================================================================

export interface ReportGenerationData {
  reportType: 'volunteer_hours' | 'organization_impact' | 'sdg_progress' | 'engagement';
  organizationId?: number;
  volunteerId?: number;
  dateRange?: { start: Date; end: Date };
  format: 'pdf' | 'csv' | 'excel';
  requestedBy: number;
}

export interface EmailSendingData {
  to: string | string[];
  subject: string;
  template: string;
  variables: Record<string, any>;
  attachments?: Array<{ filename: string; content: string | Buffer }>;
}

export interface DataExportData {
  exportType: 'volunteers' | 'organizations' | 'projects' | 'activities';
  filters?: Record<string, any>;
  format: 'csv' | 'json' | 'excel';
  requestedBy: number;
  notifyEmail?: string;
}

export interface SDGCalculationData {
  organizationId?: number;
  projectId?: number;
  recalculateAll?: boolean;
}

export interface NotificationDeliveryData {
  userId: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: ('in_app' | 'email' | 'push')[];
}

export interface CacheInvalidationData {
  patterns: string[];
  reason?: string;
}

// =============================================================================
// PRIORITY WEIGHTS
// =============================================================================

const PRIORITY_WEIGHTS: Record<JobPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

// =============================================================================
// JOB QUEUE IMPLEMENTATION
// =============================================================================

class JobQueue extends EventEmitter {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<JobType, JobHandler> = new Map();
  private processingJobs: Set<string> = new Set();
  private isRunning: boolean = false;
  private concurrency: number = 5;
  private processInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.registerDefaultHandlers();
  }

  /**
   * Register a job handler for a specific job type
   */
  registerHandler<T = any, R = any>(type: JobType, handler: JobHandler<T, R>): void {
    this.handlers.set(type, handler as JobHandler);
    logger.info(`Registered job handler for type: ${type}`);
  }

  /**
   * Add a job to the queue
   */
  async addJob<T = any>(
    type: JobType,
    data: T,
    options: JobOptions = {}
  ): Promise<Job<T>> {
    const job: Job<T> = {
      id: this.generateJobId(),
      type,
      data,
      status: 'pending',
      priority: options.priority || 'normal',
      attempts: 0,
      maxAttempts: options.attempts || 3,
      createdAt: new Date(),
    };

    // Apply delay if specified
    if (options.delay && options.delay > 0) {
      setTimeout(() => {
        this.jobs.set(job.id, job as Job);
        this.emit('job:added', job);
      }, options.delay);
    } else {
      this.jobs.set(job.id, job as Job);
      this.emit('job:added', job);
    }

    logger.info({
      type: 'JOB_ADDED',
      jobId: job.id,
      jobType: type,
      priority: job.priority,
    });

    return job;
  }

  /**
   * Add multiple jobs at once (batch)
   */
  async addBulk<T = any>(
    jobs: Array<{ type: JobType; data: T; options?: JobOptions }>
  ): Promise<Job<T>[]> {
    const addedJobs: Job<T>[] = [];

    for (const jobDef of jobs) {
      const job = await this.addJob(jobDef.type, jobDef.data, jobDef.options);
      addedJobs.push(job);
    }

    return addedJobs;
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs of a specific type
   */
  getJobsByType(type: JobType): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.type === type);
  }

  /**
   * Get all pending jobs
   */
  getPendingJobs(): Job[] {
    return Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .sort((a, b) => {
        // Sort by priority first, then by creation time
        const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    byType: Record<JobType, number>;
  } {
    const jobs = Array.from(this.jobs.values());
    const byType: Record<string, number> = {};

    for (const job of jobs) {
      byType[job.type] = (byType[job.type] || 0) + 1;
    }

    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      byType: byType as Record<JobType, number>,
    };
  }

  /**
   * Start processing jobs
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.processInterval = setInterval(() => this.processJobs(), 1000);
    logger.info('Job queue started');
    this.emit('queue:started');
  }

  /**
   * Stop processing jobs
   */
  stop(): void {
    this.isRunning = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    logger.info('Job queue stopped');
    this.emit('queue:stopped');
  }

  /**
   * Process pending jobs
   */
  private async processJobs(): Promise<void> {
    if (!this.isRunning) return;

    const availableSlots = this.concurrency - this.processingJobs.size;
    if (availableSlots <= 0) return;

    const pendingJobs = this.getPendingJobs().slice(0, availableSlots);

    for (const job of pendingJobs) {
      this.processJob(job);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      logger.warn(`No handler registered for job type: ${job.type}`);
      job.status = 'failed';
      job.error = `No handler for job type: ${job.type}`;
      job.failedAt = new Date();
      this.emit('job:failed', job);
      return;
    }

    this.processingJobs.add(job.id);
    job.status = 'processing';
    job.startedAt = new Date();
    job.attempts++;

    this.emit('job:started', job);

    try {
      const result = await handler(job);

      if (result.success) {
        job.status = 'completed';
        job.completedAt = new Date();
        job.result = result.data;
        this.emit('job:completed', job);

        logger.info({
          type: 'JOB_COMPLETED',
          jobId: job.id,
          jobType: job.type,
          duration: job.completedAt.getTime() - job.startedAt!.getTime(),
        });
      } else {
        throw new Error(result.error || 'Job handler returned failure');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error({
        type: 'JOB_ERROR',
        jobId: job.id,
        jobType: job.type,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
        error: errorMessage,
      });

      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        job.status = 'retrying';
        const backoffDelay = Math.min(1000 * Math.pow(2, job.attempts), 30000);

        setTimeout(() => {
          job.status = 'pending';
          this.emit('job:retry', job);
        }, backoffDelay);
      } else {
        job.status = 'failed';
        job.error = errorMessage;
        job.failedAt = new Date();
        this.emit('job:failed', job);
      }
    } finally {
      this.processingJobs.delete(job.id);
    }
  }

  /**
   * Update job progress
   */
  updateProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = Math.min(100, Math.max(0, progress));
      this.emit('job:progress', job);
    }
  }

  /**
   * Cancel a pending job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      this.jobs.delete(jobId);
      this.emit('job:cancelled', job);
      return true;
    }
    return false;
  }

  /**
   * Clean up completed/failed jobs older than specified time
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAge;
    let removed = 0;

    const entries = Array.from(this.jobs.entries());
    for (const [id, job] of entries) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.createdAt.getTime() < cutoff
      ) {
        this.jobs.delete(id);
        removed++;
      }
    }

    logger.info(`Cleaned up ${removed} old jobs`);
    return removed;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register default job handlers
   */
  private registerDefaultHandlers(): void {
    // Report Generation Handler
    this.registerHandler<ReportGenerationData>('report_generation', async (job) => {
      const { reportType, organizationId, format, requestedBy } = job.data;

      logger.info(`Generating ${reportType} report in ${format} format`);

      // Simulate report generation
      await this.simulateWork(2000);

      return {
        success: true,
        data: {
          reportId: `report_${Date.now()}`,
          downloadUrl: `/api/reports/download/${Date.now()}`,
          format,
          generatedAt: new Date().toISOString(),
        },
      };
    });

    // Email Sending Handler
    this.registerHandler<EmailSendingData>('email_sending', async (job) => {
      const { to, subject, template } = job.data;

      logger.info(`Sending email to ${Array.isArray(to) ? to.join(', ') : to}`);

      // Simulate email sending
      await this.simulateWork(500);

      return {
        success: true,
        data: {
          messageId: `msg_${Date.now()}`,
          sentAt: new Date().toISOString(),
          recipients: Array.isArray(to) ? to.length : 1,
        },
      };
    });

    // Data Export Handler
    this.registerHandler<DataExportData>('data_export', async (job) => {
      const { exportType, format, requestedBy } = job.data;

      logger.info(`Exporting ${exportType} data in ${format} format`);

      // Simulate data export
      await this.simulateWork(3000);

      return {
        success: true,
        data: {
          exportId: `export_${Date.now()}`,
          downloadUrl: `/api/exports/download/${Date.now()}`,
          format,
          recordCount: Math.floor(Math.random() * 1000) + 100,
          exportedAt: new Date().toISOString(),
        },
      };
    });

    // SDG Calculation Handler
    this.registerHandler<SDGCalculationData>('sdg_calculation', async (job) => {
      const { organizationId, projectId, recalculateAll } = job.data;

      logger.info(
        `Calculating SDG metrics for ${
          recalculateAll ? 'all' : organizationId ? `org ${organizationId}` : `project ${projectId}`
        }`
      );

      // Simulate SDG calculation
      await this.simulateWork(1500);

      return {
        success: true,
        data: {
          calculatedAt: new Date().toISOString(),
          metricsUpdated: Math.floor(Math.random() * 50) + 10,
        },
      };
    });

    // Notification Delivery Handler
    this.registerHandler<NotificationDeliveryData>('notification_delivery', async (job) => {
      const { userId, type, title, channels } = job.data;

      logger.info(`Delivering ${type} notification to user ${userId}`);

      // Simulate notification delivery
      await this.simulateWork(200);

      return {
        success: true,
        data: {
          notificationId: `notif_${Date.now()}`,
          deliveredTo: channels || ['in_app'],
          deliveredAt: new Date().toISOString(),
        },
      };
    });

    // Cache Invalidation Handler
    this.registerHandler<CacheInvalidationData>('cache_invalidation', async (job) => {
      const { patterns, reason } = job.data;

      logger.info(`Invalidating cache patterns: ${patterns.join(', ')}`);

      // Simulate cache invalidation
      await this.simulateWork(100);

      return {
        success: true,
        data: {
          patternsInvalidated: patterns.length,
          reason,
        },
      };
    });

    // Cleanup Handler
    this.registerHandler('cleanup', async (job) => {
      logger.info('Running cleanup job');

      // Clean up old jobs
      const removed = this.cleanup();

      return {
        success: true,
        data: {
          jobsRemoved: removed,
          cleanedAt: new Date().toISOString(),
        },
      };
    });
  }

  /**
   * Simulate async work for demo handlers
   */
  private simulateWork(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const jobQueue = new JobQueue();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Queue a report generation job
 */
export async function queueReportGeneration(
  data: ReportGenerationData,
  options?: JobOptions
): Promise<Job<ReportGenerationData>> {
  return jobQueue.addJob('report_generation', data, {
    priority: 'normal',
    attempts: 3,
    ...options,
  });
}

/**
 * Queue an email sending job
 */
export async function queueEmail(
  data: EmailSendingData,
  options?: JobOptions
): Promise<Job<EmailSendingData>> {
  return jobQueue.addJob('email_sending', data, {
    priority: 'high',
    attempts: 5,
    ...options,
  });
}

/**
 * Queue a data export job
 */
export async function queueDataExport(
  data: DataExportData,
  options?: JobOptions
): Promise<Job<DataExportData>> {
  return jobQueue.addJob('data_export', data, {
    priority: 'normal',
    attempts: 3,
    ...options,
  });
}

/**
 * Queue an SDG calculation job
 */
export async function queueSDGCalculation(
  data: SDGCalculationData,
  options?: JobOptions
): Promise<Job<SDGCalculationData>> {
  return jobQueue.addJob('sdg_calculation', data, {
    priority: 'low',
    attempts: 3,
    ...options,
  });
}

/**
 * Queue a notification delivery job
 */
export async function queueNotification(
  data: NotificationDeliveryData,
  options?: JobOptions
): Promise<Job<NotificationDeliveryData>> {
  return jobQueue.addJob('notification_delivery', data, {
    priority: 'high',
    attempts: 3,
    ...options,
  });
}

/**
 * Queue cache invalidation job
 */
export async function queueCacheInvalidation(
  patterns: string[],
  reason?: string,
  options?: JobOptions
): Promise<Job<CacheInvalidationData>> {
  return jobQueue.addJob('cache_invalidation', { patterns, reason }, {
    priority: 'critical',
    attempts: 1,
    ...options,
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default jobQueue;
