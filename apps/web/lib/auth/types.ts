export const roles = ['USER', 'SUPPORT', 'ADMIN'] as const;
export type AppRole = (typeof roles)[number];
export type UserPreferences = Readonly<{
  locale: 'en' | 'pt-BR';
  timezone: string;
  currency: 'USD' | 'BRL' | 'EUR';
}>;
export type SessionUser = Readonly<{
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  roles: AppRole[];
}>;
export type AuthSession = Readonly<{
  user: SessionUser;
  preferences: UserPreferences;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
}>;
export type LoginTransaction = Readonly<{
  state: string;
  verifier: string;
  returnTo: string;
  createdAt: number;
}>;
