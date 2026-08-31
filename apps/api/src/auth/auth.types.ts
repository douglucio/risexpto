import type { AppRole } from './roles';
export type AuthenticatedUser = Readonly<{
  id: string;
  email: string;
  name: string;
  roles: AppRole[];
  emailVerified: boolean;
}>;
export type VerifiedClaims = Readonly<{
  sub: string;
  email: string;
  name?: string;
  email_verified?: boolean;
  realm_access?: { roles?: string[] };
}>;
export interface TokenVerifier {
  verify(token: string): Promise<VerifiedClaims>;
}
export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
