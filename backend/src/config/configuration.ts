/**
 * Central configuration. Reads from env vars by default.
 * To use a secrets manager later: add an async loader that returns overrides,
 * e.g. load: [configuration, () => loadFromSecretsManager()] — later overrides earlier.
 */

export type EnvSource = NodeJS.ProcessEnv | Record<string, string | undefined>;

function get(env: EnvSource, key: string): string | undefined {
  return env[key]?.trim() || undefined;
}

function getOr(env: EnvSource, key: string, fallback: string): string {
  return get(env, key) ?? fallback;
}

function getNumber(env: EnvSource, key: string, fallback: number): number {
  const v = get(env, key);
  if (v === undefined || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Build configuration from env-like source. Pass process.env (default) or
 * a merged object from secrets manager for easy swap later.
 */
function getBool(env: EnvSource, key: string, fallback: boolean): boolean {
  const v = get(env, key)?.toLowerCase();
  if (v === undefined || v === '') return fallback;
  return v === '1' || v === 'true' || v === 'yes';
}

export default function configuration(env: EnvSource = process.env) {
  const nodeEnv = getOr(env, 'NODE_ENV', 'development');
  const swaggerEnabledExplicit = get(env, 'SWAGGER_ENABLED');
  const swaggerEnabled =
    swaggerEnabledExplicit !== undefined
      ? getBool(env, 'SWAGGER_ENABLED', false)
      : nodeEnv !== 'production';

  return {
    port: getNumber(env, 'PORT', 3000),
    nodeEnv,
    corsOrigin: get(env, 'CORS_ORIGIN'),
    swagger: {
      enabled: swaggerEnabled,
      path: getOr(env, 'SWAGGER_PATH', 'docs'),
    },

    database: {
      url: get(env, 'DATABASE_URL'),
      urlTest: get(env, 'DATABASE_URL_TEST'),
    },

    jwt: {
      secret: getOr(env, 'JWT_SECRET', 'change-me-in-production'),
      accessExpiresSec: getNumber(env, 'JWT_ACCESS_EXPIRES_SEC', 86400),
    },

    urls: {
      app: get(env, 'APP_URL')?.replace(/\/$/, '') ?? 'https://example.com',
      admin: get(env, 'ADMIN_URL')?.replace(/\/$/, ''),
      adminLogin: get(env, 'ADMIN_LOGIN_URL')?.replace(/\/$/, ''),
    },

    mail: {
      provider: (getOr(env, 'MAIL_PROVIDER', 'mock').toLowerCase()) as 'mock' | 'brevo' | 'sendgrid',
      fromEmail: getOr(env, 'MAIL_FROM_EMAIL', 'noreply@example.com'),
      fromName: getOr(env, 'MAIL_FROM_NAME', 'E-Commerce'),
      brevoApiKey: get(env, 'BREVO_API_KEY'),
      sendgridApiKey: get(env, 'SENDGRID_API_KEY'),
    },

    storage: {
      provider: (getOr(env, 'STORAGE_PROVIDER', 'cloudinary').toLowerCase()) as 'local' | 'cloudinary' | 's3',
      uploadDir: get(env, 'UPLOAD_DIR'),
      cloudinary: {
        cloudName: get(env, 'CLOUDINARY_CLOUD_NAME') ?? '',
        apiKey: get(env, 'CLOUDINARY_API_KEY') ?? '',
        apiSecret: get(env, 'CLOUDINARY_API_SECRET') ?? '',
      },
    },

    seed: {
      adminEmail: getOr(env, 'SEED_ADMIN_EMAIL', 'admin@example.com'),
      adminPassword: getOr(env, 'SEED_ADMIN_PASSWORD', 'Admin123!'),
      adminName: getOr(env, 'SEED_ADMIN_NAME', 'Admin'),
    },
  };
}
