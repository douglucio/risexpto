export type ConnectionStatus =
  | 'CONNECTED'
  | 'DEGRADED'
  | 'INVALID'
  | 'UNSAFE_PERMISSIONS'
  | 'DISCONNECTED';
export type StoredCredentials = {
  apiKeyCiphertext: string;
  apiSecretCiphertext: string;
  keyVersion: number;
  revokedAt: string | null;
};
export type ConnectionSummary = {
  apiKeyMasked: string;
  status: ConnectionStatus;
  lastCheckedAt: string | null;
  permissions: string[];
};
export type AuditEvent = {
  action: 'CONNECTION_CREATED' | 'CONNECTION_TESTED' | 'CONNECTION_REVOKED';
  status: ConnectionStatus;
  at: string;
};
