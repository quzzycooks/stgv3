import * as Joi from 'joi';

/**
 * Fail-fast env validation (PRD 7.2 reliability: a misconfigured critical-path
 * service must not silently boot). Secrets are required in production but relaxed
 * in test so unit suites can run without a full secret set.
 */
const isProd = process.env.NODE_ENV === 'production';
const secret = (bytes = 16) =>
  isProd
    ? Joi.string().min(bytes).required()
    : Joi.string().min(bytes).default('x'.repeat(bytes));
const base64Key32 = () =>
  isProd
    ? Joi.string().base64().required()
    : Joi.string().base64().default(Buffer.alloc(32, 7).toString('base64'));

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_VERSION: Joi.string().default('v1'),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().default('stignit'),
  DB_PASSWORD: Joi.string().allow('').default('stignit_local_dev'),
  DB_NAME: Joi.string().default('stignit'),
  DB_REPLICA_HOST: Joi.string().allow('').default(''),
  DB_REPLICA_PORT: Joi.number().default(5432),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  FIELD_ENCRYPTION_KEY: base64Key32(),
  FIELD_ENCRYPTION_KEY_PREVIOUS: Joi.string().base64().allow('').default(''),
  BLIND_INDEX_KEY: secret(16),

  JWT_ACCESS_SECRET: secret(32),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: secret(32),
  JWT_REFRESH_TTL: Joi.string().default('30d'),

  ADMIN_SSO_ISSUER: Joi.string().default('https://accounts.google.com'),
  ADMIN_SSO_CLIENT_ID: Joi.string().allow('').default(''),
  ADMIN_SSO_ALLOWED_DOMAIN: Joi.string().allow('').default(''),

  SENDCHAMP_API_KEY: Joi.string().allow('').default(''),
  SENDCHAMP_SENDER_NAME: Joi.string().default('Sendchamp'),
  TWILIO_ACCOUNT_SID: Joi.string().allow('').default(''),
  TWILIO_AUTH_TOKEN: Joi.string().allow('').default(''),
  TWILIO_VERIFY_SERVICE_SID: Joi.string().allow('').default(''),
  FCM_PROJECT_ID: Joi.string().allow('').default(''),
  GOOGLE_MAPS_API_KEY: Joi.string().allow('').default(''),
  AI_PROVIDER: Joi.string()
    .valid('anthropic', 'openai', 'selfhosted', 'stub')
    .default('stub'),
  ANTHROPIC_API_KEY: Joi.string().allow('').default(''),
  AI_MODEL: Joi.string().default('claude-sonnet-5'),
}).options({ allowUnknown: true, abortEarly: false });
