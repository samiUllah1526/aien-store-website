/**
 * Central config. Load from .env (default) or swap to secrets manager later:
 *
 *   load: [
 *     configuration,  // reads process.env
 *     () => loadFromSecretsManager(),  // returns overrides; later wins
 *   ],
 */

export { default as configuration } from './configuration';
export { validateConfig } from './validation';
export type { ValidatedConfig } from './validation';
export type { EnvSource } from './configuration';
