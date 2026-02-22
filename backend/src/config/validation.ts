/**
 * Config validation. Fails fast at startup with clear errors.
 * Required in production; some checks relaxed in development/test.
 *
 * NestJS ConfigModule passes the merged config (from loaders + process.env) to validate().
 * Our configuration() produces nested shape; we validate both nested and flat keys.
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

function get(config: Record<string, unknown>, ...paths: string[]): string | undefined {
  for (const path of paths) {
    const val = config[path];
    if (typeof val === 'string' && val.trim()) return val.trim();
    if (path.includes('.')) {
      const parts = path.split('.');
      let obj: unknown = config;
      for (const p of parts) {
        obj = (obj as Record<string, unknown>)?.[p];
        if (obj === undefined) break;
      }
      if (typeof obj === 'string' && obj.trim()) return obj.trim();
    }
  }
  return undefined;
}

export function validateConfig(config: Record<string, unknown>): ValidatedConfig {
  const errors: string[] = [];

  const dbUrl = get(config, 'database.url', 'DATABASE_URL');
  if (!dbUrl) {
    errors.push('DATABASE_URL is required');
  }

  const jwtSecret = get(config, 'jwt.secret', 'JWT_SECRET') ?? 'change-me-in-production';
  const nodeEnv =
    (config.nodeEnv as string | undefined) ?? (config.NODE_ENV as string | undefined) ?? 'development';
  if (jwtSecret === 'change-me-in-production' && nodeEnv === 'production') {
    errors.push('JWT_SECRET must be changed in production');
  }

  if (nodeEnv === 'production') {
    const appUrl = get(config, 'urls.app', 'APP_URL');
    if (!appUrl || appUrl.includes('example.com')) {
      errors.push('APP_URL must be set to your main website URL in production (e.g. https://yoursite.com)');
    }

    const adminUrl = get(config, 'urls.admin', 'ADMIN_URL');
    if (!adminUrl || adminUrl.includes('example.com')) {
      errors.push('ADMIN_URL must be set to your admin portal URL in production (e.g. https://admin.yoursite.com)');
    }

    const mailProvider = (get(config, 'mail.provider', 'MAIL_PROVIDER') ?? 'mock').toLowerCase();
    if (mailProvider === 'brevo') {
      const key = get(config, 'mail.brevoApiKey', 'BREVO_API_KEY');
      if (!key) errors.push('BREVO_API_KEY is required when MAIL_PROVIDER=brevo');
    }
    if (mailProvider === 'sendgrid') {
      const key = get(config, 'mail.sendgridApiKey', 'SENDGRID_API_KEY');
      if (!key) errors.push('SENDGRID_API_KEY is required when MAIL_PROVIDER=sendgrid');
    }

    const storageProvider = (get(config, 'storage.provider', 'STORAGE_PROVIDER') ?? 'cloudinary').toLowerCase();
    if (storageProvider === 'cloudinary') {
      const cloudName = get(config, 'storage.cloudinary.cloudName', 'CLOUDINARY_CLOUD_NAME');
      const apiKey = get(config, 'storage.cloudinary.apiKey', 'CLOUDINARY_API_KEY');
      const apiSecret = get(config, 'storage.cloudinary.apiSecret', 'CLOUDINARY_API_SECRET');
      if (!cloudName || !apiKey || !apiSecret) {
        errors.push(
          'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required when using Cloudinary storage in production',
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n  - ${errors.join('\n  - ')}\n\nCheck your .env file or environment variables. See backend/.env.example for reference.`,
    );
  }

  return config as unknown as ValidatedConfig;
}
