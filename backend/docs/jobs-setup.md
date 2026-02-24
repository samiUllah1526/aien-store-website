# Background Jobs Setup

This guide explains how background jobs work in the backend.

---

## pg-boss (PostgreSQL Job Queue)

The backend uses [pg-boss](https://github.com/timgit/pg-boss) for background jobs. pg-boss uses the same PostgreSQL database (no Redis or extra infrastructure). Jobs are stored in a `pgboss` schema.

**Requirements:** PostgreSQL 13+, Node 22.12+ (pg-boss v12+)

### Email Queues

Transactional emails are sent via background jobs:

| Queue | Job types | Concurrency | Purpose |
|-------|-----------|-------------|---------|
| `email-high` | password-reset | 5 | High priority (reset token expires in 1h) |
| `email-default` | order-confirmation, order-status-change, welcome, user-created | 3 | Standard priority |

Emails are enqueued by `EmailQueueService` and processed by `EmailJobProcessor` (runs in the NestJS process). Failed jobs are retried by pg-boss with exponential backoff.

### Configuration

- **DATABASE_URL**: Required. pg-boss uses the same connection.
- **PGBOSS_SCHEMA**: Optional. Default `pgboss`. Custom schema if needed.

pg-boss creates its schema and tables automatically on first `start()`.

---

## Current State

- **Email jobs**: Configured. All transactional emails (order confirmation, status change, welcome, user-created, password reset) go through pg-boss. No setup needed beyond `DATABASE_URL`.

- **Voucher expired job**: A standalone script exists (`scripts/job-voucher-expired.ts`) that writes `EXPIRED` audit logs for vouchers past their expiry date. Run manually:

  ```bash
  npm run job:voucher-expired
  ```

  Future: Can be migrated to pg-boss cron via `boss.schedule()`.

- **Archival job**: Not implemented. Plan: delete or archive `voucher_audit_logs` rows older than `VOUCHER_AUDIT_RETENTION_DAYS`.

---

## Option 1: NestJS Schedule (In-Process Cron)

Use `@nestjs/schedule` to run jobs inside the NestJS process.

### 1. Install

```bash
npm install @nestjs/schedule
```

### 2. Register Module

In `app.module.ts`:

```ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ... other imports
  ],
})
export class AppModule {}
```

### 3. Create a Cron Service

Create `src/modules/jobs/jobs.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { VoucherExpiredJob } from '../vouchers/voucher-expired.job';

@Injectable()
export class JobsService {
  constructor(private readonly voucherExpiredJob: VoucherExpiredJob) {}

  @Cron('0 2 * * *') // Daily at 2:00 AM
  async handleVoucherExpired() {
    const { processed } = await this.voucherExpiredJob.processExpiredVouchers();
    console.log(`[Jobs] Voucher expired: processed ${processed}`);
  }
}
```

### 4. Register JobsService

In a new `JobsModule` or in `VouchersModule`, add `JobsService` as a provider.

---

## Option 2: System Cron (Standalone Script)

Run the script via system cron. No code changes needed.

### Crontab example

```cron
# Voucher expired job - daily at 2:00 AM
0 2 * * * cd /path/to/backend && npm run job:voucher-expired >> /var/log/voucher-expired.log 2>&1
```

### With PM2

```bash
pm2 start "npm run job:voucher-expired" --cron "0 2 * * *" --no-autorestart --name voucher-expired
```

---

## Option 3: External Scheduler (GitHub Actions, AWS EventBridge, etc.)

Trigger the job via HTTP or by running the script in CI.

### Example: GitHub Actions

```yaml
name: Voucher Expired Job
on:
  schedule:
    - cron: '0 2 * * *'  # Daily 2 AM UTC
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run job:voucher-expired
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Archival Job (Future)

When ready to add archival for `voucher_audit_logs`:

1. Add env var: `VOUCHER_AUDIT_RETENTION_DAYS=730`
2. Create `scripts/job-voucher-audit-archival.ts`:
   - Query rows where `created_at < now() - retention_days`
   - Delete in batches (e.g. 1000 at a time) to avoid long locks
3. Run daily via cron or `@nestjs/schedule`

---

## Summary

| Job | How it runs | Schedule |
|-----|-------------|----------|
| Email (all types) | pg-boss worker (in-process) | Immediate (queued on send) |
| Voucher expired | Standalone script | Manual or cron |
| Audit archival | (to be added) | Daily |

**Email jobs:** Start automatically with the NestJS server. Ensure `DATABASE_URL` is set.

**Voucher expired:** Run `npm run job:voucher-expired` manually or via system cron until migrated to pg-boss.
