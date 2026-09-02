export type AdminRole = 'USER' | 'SUPPORT' | 'ADMIN';
export type AdminSnapshot = {
  users: unknown[];
  subscriptions: unknown[];
  plans: unknown[];
  bots: unknown[];
  strategies: unknown[];
  versions: unknown[];
  exchangeConnections: Array<{
    id: string;
    userId: string;
    provider: string;
    status: string;
    maskedApiKey: string;
  }>;
  workers: unknown[];
  queues: unknown[];
  errors: unknown[];
  riskEvents: unknown[];
  killSwitches: unknown[];
  auditLogs: unknown[];
  health: unknown;
};
export type AdminDataSource = Omit<AdminSnapshot, 'exchangeConnections'> & {
  exchangeConnections: Array<Record<string, unknown>>;
};
function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}
export class AdminConsole {
  constructor(private readonly source: AdminDataSource) {}
  read(role: AdminRole): AdminSnapshot {
    if (role !== 'ADMIN' && role !== 'SUPPORT') throw new Error('Admin permission required');
    return {
      ...this.source,
      exchangeConnections: this.source.exchangeConnections.map((connection) => ({
        id: text(connection.id),
        userId: text(connection.userId),
        provider: text(connection.provider),
        status: text(connection.status),
        maskedApiKey: text(connection.maskedApiKey),
      })),
    };
  }
}
