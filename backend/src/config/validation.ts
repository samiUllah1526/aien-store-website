/**
 * Config validation. Fails fast at startup with clear errors.
 * Required in production; some checks relaxed in development/test.
 *
 * Note: NestJS ConfigModule calls validate() with the raw env object (PORT, DATABASE_URL, etc.)
 * before custom loaders run. Our configuration() loader runs after and produces the nested shape.
 * So we validate the flat env keys here; the nested structure comes from the loader.
 */

export interface ValidatedConfig {
  port: number;
  nodeEnv: string;
  corsOrigin?: string;
  database: { url: string; urlTest?: string };
  jwt: { secret: string; accessExpiresSec: number };
  urls: { app: string; admin?: string; adminLogin?: string };
  mail: Record<string, unknown>;
  storage: Record<string, unknown>;
  seed: Record<string, string>;
}

export function validateConfig(config: Record<string, unknown>): ValidatedConfig {
  const errors: string[] = [];

  // NestJS passes flat env (DATABASE_URL), not our nested config.database.url
  const dbUrl =
    (config.database as { url?: string } | undefined)?.url ??
    (config.DATABASE_URL as string | undefined);
  if (!dbUrl?.trim()) {
    errors.push('DATABASE_URL is required');
  }

  const jwtSecret =
    (config.jwt as { secret?: string } | undefined)?.secret ?? (config.JWT_SECRET as string | undefined);
  const nodeEnv =
    (config.nodeEnv as string | undefined) ?? (config.NODE_ENV as string | undefined) ?? 'development';
  if (jwtSecret === 'change-me-in-production' && nodeEnv === 'production') {
    errors.push('JWT_SECRET must be changed in production');
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n  - ${errors.join('\n  - ')}\n\nCheck your .env file or environment variables.`,
    );
  }

  return config as unknown as ValidatedConfig;
}
