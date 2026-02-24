/**
 * Queue names for pg-boss.
 * Separate queues allow different concurrency and priority handling.
 */
export const QUEUE_EMAIL_HIGH = 'email-high';
export const QUEUE_EMAIL_DEFAULT = 'email-default';

/** All queue names (single source of truth for listing/iterating). */
export const QUEUE_NAMES = [QUEUE_EMAIL_HIGH, QUEUE_EMAIL_DEFAULT] as const;

/**
 * Job type literals for email jobs.
 * Stored in job.data.type for the processor to route correctly.
 */
export const EMAIL_JOB_TYPES = {
  PASSWORD_RESET: 'password-reset',
  ORDER_CONFIRMATION: 'order-confirmation',
  ORDER_STATUS_CHANGE: 'order-status-change',
  WELCOME: 'welcome',
  USER_CREATED: 'user-created',
} as const;

export type EmailJobType = (typeof EMAIL_JOB_TYPES)[keyof typeof EMAIL_JOB_TYPES];
