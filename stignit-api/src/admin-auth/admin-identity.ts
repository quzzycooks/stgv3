/** Dashboard roles (PRD 6.12.3). Distinct from mobile AccessLevel. */
export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  CONTENT_MANAGER = 'CONTENT_MANAGER',
  ANALYTICS_VIEWER = 'ANALYTICS_VIEWER',
}

export interface AdminIdentity {
  adminId: string;
  email: string;
  role: AdminRole;
}

/** Verifies an SSO ID token and returns the verified email + hosted domain. */
export interface AdminIdTokenVerifier {
  verify(idToken: string): Promise<{ email: string; hostedDomain?: string }>;
}
export const ADMIN_ID_TOKEN_VERIFIER = 'ADMIN_ID_TOKEN_VERIFIER';

/** Maps a verified admin email to an admin account + role (implemented by Admin module). */
export interface AdminRegistry {
  findByEmail(email: string): Promise<AdminIdentity | null>;
}
export const ADMIN_REGISTRY = 'ADMIN_REGISTRY';
