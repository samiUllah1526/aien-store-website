import { Injectable } from '@nestjs/common';
import { PgbossService } from './pgboss.service';
import { QUEUE_NAMES } from './jobs.constants';

export interface QueueStatsDto {
  name: string;
  deferredCount: number;
  queuedCount: number;
  activeCount: number;
  totalCount: number;
  createdOn: string;
  updatedOn: string;
}

export interface JobDto {
  id: string;
  name: string;
  state: string;
  data: Record<string, unknown>;
  retryCount: number;
  retryLimit: number;
  createdOn: string;
  startedOn?: string;
  completedOn?: string;
}

@Injectable()
export class JobsAdminService {
  constructor(private readonly pgboss: PgbossService) {}

  async getQueueStats(): Promise<QueueStatsDto[]> {
    if (!this.pgboss.isStarted()) {
      return [];
    }
    const boss = this.pgboss.getBoss();
    const queues = await boss.getQueues([...QUEUE_NAMES]);
    return queues.map((q) => ({
      name: q.name,
      deferredCount: q.deferredCount ?? 0,
      queuedCount: q.queuedCount ?? 0,
      activeCount: q.activeCount ?? 0,
      totalCount: q.totalCount ?? 0,
      createdOn: (q.createdOn as Date)?.toISOString?.() ?? '',
      updatedOn: (q.updatedOn as Date)?.toISOString?.() ?? '',
    }));
  }

  async findJobs(params: {
    queue?: string;
    state?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: JobDto[]; total: number }> {
    if (!this.pgboss.isStarted()) {
      return { data: [], total: 0 };
    }
    const boss = this.pgboss.getBoss();
    const queues = params.queue ? [params.queue] : [...QUEUE_NAMES];
    const limit = Math.min(100, params.limit ?? 50);
    const allJobs: JobDto[] = [];

    for (const queueName of queues) {
      try {
        const jobs = await boss.findJobs(queueName, {
          queued: params.state === 'created' || params.state === 'retry' ? true : undefined,
        });
        for (const j of jobs) {
          const job = j as {
            id: string;
            name: string;
            state: string;
            data: Record<string, unknown>;
            retryCount: number;
            retryLimit: number;
            createdOn: Date;
            startedOn?: Date;
            completedOn?: Date;
          };
          if (params.state && job.state !== params.state) continue;
          allJobs.push({
            id: job.id,
            name: job.name,
            state: job.state,
            data: (job.data as Record<string, unknown>) ?? {},
            retryCount: job.retryCount ?? 0,
            retryLimit: job.retryLimit ?? 0,
            createdOn: job.createdOn?.toISOString?.() ?? '',
            startedOn: job.startedOn?.toISOString?.(),
            completedOn: job.completedOn?.toISOString?.(),
          });
        }
      } catch {
        // Queue might not exist yet
      }
    }

    allJobs.sort((a, b) => (b.createdOn > a.createdOn ? 1 : -1));
    const total = allJobs.length;
    const page = Math.max(1, params.page ?? 1);
    const start = (page - 1) * limit;
    const data = allJobs.slice(start, start + limit);

    return { data, total };
  }

  async retryJob(queue: string, id: string): Promise<{ success: boolean; message: string }> {
    if (!this.pgboss.isStarted()) {
      return { success: false, message: 'pg-boss not started' };
    }
    const boss = this.pgboss.getBoss();
    await boss.retry(queue, [id]);
    return { success: true, message: 'Job retry requested' };
  }

  async cancelJob(queue: string, id: string): Promise<{ success: boolean; message: string }> {
    if (!this.pgboss.isStarted()) {
      return { success: false, message: 'pg-boss not started' };
    }
    const boss = this.pgboss.getBoss();
    await boss.cancel(queue, [id]);
    return { success: true, message: 'Job cancelled' };
  }
}
