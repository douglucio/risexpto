import { createHmac } from 'node:crypto';
import { BinanceConnectionError } from './errors.js';
import type { CredentialVault } from './vault.js';
import type { AuditEvent, ConnectionSummary, StoredCredentials } from './types.js';

type Dependencies = { fetch?: typeof fetch; now?: () => number };
type AccountResponse = {
  canTrade?: boolean;
  canWithdraw?: boolean;
  canDeposit?: boolean;
  accountType?: string;
};

export class BinanceAccountConnection {
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private credentials: StoredCredentials | null = null;
  private summary: ConnectionSummary = {
    apiKeyMasked: '',
    status: 'DISCONNECTED',
    lastCheckedAt: null,
    permissions: [],
  };

  constructor(
    private readonly vault: CredentialVault,
    private readonly baseUrl = 'https://api.binance.com',
    dependencies: Dependencies = {},
    private readonly audit: (event: AuditEvent) => void = () => undefined,
  ) {
    this.fetcher = dependencies.fetch ?? globalThis.fetch;
    this.now = dependencies.now ?? Date.now;
  }

  register(apiKey: string, apiSecret: string): ConnectionSummary {
    this.credentials = this.vault.encrypt(apiKey, apiSecret);
    this.summary = {
      apiKeyMasked: `${apiKey.slice(0, 4)}${'*'.repeat(Math.max(4, apiKey.length - 8))}${apiKey.slice(-4)}`,
      status: 'DISCONNECTED',
      lastCheckedAt: null,
      permissions: [],
    };
    this.audit({
      action: 'CONNECTION_CREATED',
      status: 'DISCONNECTED',
      at: new Date(this.now()).toISOString(),
    });
    return this.summary;
  }

  async testConnection(): Promise<ConnectionSummary> {
    if (!this.credentials) throw new BinanceConnectionError('No Binance connection configured');
    try {
      const { apiKey, apiSecret } = this.vault.decrypt(this.credentials);
      const timestamp = this.now();
      const query = `recvWindow=5000&timestamp=${timestamp}`;
      const signature = createHmac('sha256', apiSecret).update(query).digest('hex');
      const response = await this.fetcher(
        new URL(`/api/v3/account?${query}&signature=${signature}`, this.baseUrl),
        {
          headers: { 'X-MBX-APIKEY': apiKey, accept: 'application/json' },
          signal: AbortSignal.timeout(5_000),
        },
      );
      if (!response.ok) {
        this.summary = {
          ...this.summary,
          status: response.status === 401 || response.status === 400 ? 'INVALID' : 'DEGRADED',
          lastCheckedAt: new Date(this.now()).toISOString(),
        };
        throw new BinanceConnectionError(
          `Binance account validation failed (${response.status})`,
          response.status,
        );
      }
      const body = (await response.json()) as AccountResponse;
      const permissions = [
        body.canTrade ? 'TRADE' : '',
        body.canDeposit ? 'DEPOSIT' : '',
        body.canWithdraw ? 'WITHDRAW' : '',
      ].filter(Boolean);
      const checkedAt = new Date(this.now()).toISOString();
      this.summary = {
        ...this.summary,
        status: body.canTrade === true ? 'CONNECTED' : 'DEGRADED',
        permissions,
        lastCheckedAt: checkedAt,
      };
      this.audit({
        action: 'CONNECTION_TESTED',
        status: this.summary.status,
        at: checkedAt,
      });
      return this.summary;
    } catch (error) {
      if (error instanceof BinanceConnectionError) {
        this.audit({
          action: 'CONNECTION_TESTED',
          status: this.summary.status,
          at: new Date(this.now()).toISOString(),
        });
        throw error;
      }
      const checkedAt = new Date(this.now()).toISOString();
      this.summary = {
        ...this.summary,
        status: 'DEGRADED',
        lastCheckedAt: checkedAt,
      };
      this.audit({
        action: 'CONNECTION_TESTED',
        status: 'DEGRADED',
        at: checkedAt,
      });
      throw new BinanceConnectionError('Binance connection unavailable');
    }
  }

  revoke(): ConnectionSummary {
    if (this.credentials) this.credentials = this.vault.revoke(this.credentials);
    this.summary = { ...this.summary, status: 'DISCONNECTED', permissions: [] };
    this.audit({
      action: 'CONNECTION_REVOKED',
      status: 'DISCONNECTED',
      at: new Date(this.now()).toISOString(),
    });
    return this.summary;
  }
  status(): ConnectionSummary {
    return { ...this.summary };
  }
  storedCredentialsForPersistence(): StoredCredentials | null {
    return this.credentials ? { ...this.credentials } : null;
  }
}
