export const appRoles = ['USER', 'SUPPORT', 'ADMIN'] as const;
export type AppRole = (typeof appRoles)[number];
