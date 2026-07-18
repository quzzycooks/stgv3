/**
 * Typed configuration factory. Everything reads from validated env
 * (see env.validation.ts). No secret literals live here.
 */
export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiVersion: process.env.API_VERSION ?? 'v1',

  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'stignit',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'stignit',
    replica: {
      // Falls back to primary when no replica configured.
      host: process.env.DB_REPLICA_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_REPLICA_PORT ?? process.env.DB_PORT ?? '5432', 10),
    },
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  crypto: {
    fieldKey: process.env.FIELD_ENCRYPTION_KEY ?? '',
    fieldKeyPrevious: process.env.FIELD_ENCRYPTION_KEY_PREVIOUS || undefined,
    blindIndexKey: process.env.BLIND_INDEX_KEY ?? '',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },

  adminSso: {
    issuer: process.env.ADMIN_SSO_ISSUER ?? 'https://accounts.google.com',
    clientId: process.env.ADMIN_SSO_CLIENT_ID ?? '',
    allowedDomain: process.env.ADMIN_SSO_ALLOWED_DOMAIN ?? '',
  },

  integrations: {
    sendchampApiKey: process.env.SENDCHAMP_API_KEY ?? '',
    sendchampSenderName: process.env.SENDCHAMP_SENDER_NAME ?? 'Sendchamp',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID ?? '',
    fcmProjectId: process.env.FCM_PROJECT_ID ?? '',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
    aiProvider: process.env.AI_PROVIDER ?? 'stub',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    aiModel: process.env.AI_MODEL ?? 'claude-sonnet-5',
  },
});
