import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgBoss } from 'pg-boss';

/** Remove schema= from URL query so pg-boss uses its own schema, not Prisma's. */
function stripSchemaFromUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete('schema');
    return u.toString();
  } catch {
    return url;
  }
}

@Injectable()
export class PgbossService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgbossService.name);
  private boss: InstanceType<typeof PgBoss> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      this.logger.error('DATABASE_URL not set; pg-boss will not start');
      return;
    }

    const schema = this.configService.get<string>('PGBOSS_SCHEMA', 'pgboss');

    // Use a connection URL without ?schema=public so pg-boss creates/uses its own schema.
    // Prisma often adds schema=public to DATABASE_URL; that can prevent pg-boss from creating the pgboss schema.
    const connectionString = stripSchemaFromUrl(databaseUrl);

    this.boss = new PgBoss({
      connectionString,
      schema,
    });

    this.boss.on('error', (err) => this.logger.error('pg-boss error', err));

    try {
      await this.boss.start();
      this.logger.log('pg-boss started');
    } catch (err) {
      this.logger.error('pg-boss failed to start', err);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.boss) {
      await this.boss.stop();
      this.boss = null;
      this.logger.log('pg-boss stopped');
    }
  }

  /** Get the PgBoss instance. Throws if not started. */
  getBoss(): InstanceType<typeof PgBoss> {
    if (!this.boss) {
      throw new Error('pg-boss is not started (DATABASE_URL may be unset)');
    }
    return this.boss;
  }

  /** Check if pg-boss is running. */
  isStarted(): boolean {
    return this.boss !== null;
  }
}
