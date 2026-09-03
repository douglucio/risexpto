import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BinanceAccountConnection,
  BinanceConnectionError,
  CredentialVault,
} from '@risexpto/binance-connection';
import type { PrismaClient } from '@risexpto/database';
import { DATABASE } from '../users/user-provisioning.service';
import type { AuthenticatedUser } from '../auth/auth.types';

type CreateConnectionBody = { label?: unknown; apiKey?: unknown; apiSecret?: unknown };

@Injectable()
export class ExchangeConnectionsService {
  constructor(@Inject(DATABASE) private readonly db: PrismaClient) {}

  async list(user: AuthenticatedUser) {
    return this.db.exchangeConnection.findMany({
      where: { userId: applicationUserId(user), revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        label: true,
        status: true,
        maskedApiKey: true,
        permissions: true,
        lastCheckedAt: true,
        createdAt: true,
      },
    });
  }

  async create(user: AuthenticatedUser, body: CreateConnectionBody) {
    const userId = applicationUserId(user);
    const label = text(body.label, 'label', 80);
    const apiKey = text(body.apiKey, 'apiKey', 256);
    const apiSecret = text(body.apiSecret, 'apiSecret', 256);
    const vault = new CredentialVault(masterKey());
    const encrypted = vault.encrypt(apiKey, apiSecret);
    try {
      return await this.db.exchangeConnection.create({
        data: {
          userId,
          provider: 'BINANCE',
          label,
          status: 'DISCONNECTED',
          maskedApiKey: mask(apiKey),
          apiKeyCiphertext: Buffer.from(encrypted.apiKeyCiphertext, 'utf8'),
          apiSecretCiphertext: Buffer.from(encrypted.apiSecretCiphertext, 'utf8'),
          encryptionKeyVersion: encrypted.keyVersion,
        },
        select: { id: true, provider: true, label: true, status: true, maskedApiKey: true },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Connection label already exists');
      throw error;
    }
  }

  async test(user: AuthenticatedUser, id: string) {
    const connection = await this.findOwned(user, id, true);
    const client = new BinanceAccountConnection(
      new CredentialVault(masterKey()),
      process.env.BINANCE_BASE_URL ?? 'https://api.binance.com',
    );
    client.restore(
      {
        apiKeyCiphertext: Buffer.from(connection.apiKeyCiphertext).toString('utf8'),
        apiSecretCiphertext: Buffer.from(connection.apiSecretCiphertext).toString('utf8'),
        keyVersion: connection.encryptionKeyVersion,
        revokedAt: connection.revokedAt?.toISOString() ?? null,
      },
      connection.maskedApiKey,
    );
    try {
      const summary = await client.testConnection();
      return this.persistStatus(connection.id, summary);
    } catch (error) {
      if (!(error instanceof BinanceConnectionError))
        throw new ServiceUnavailableException('Binance unavailable');
      const summary = client.status();
      await this.persistStatus(connection.id, summary);
      if (summary.status === 'UNSAFE_PERMISSIONS')
        throw new BadRequestException(
          'Disable withdrawal permissions in Binance API Management and test the connection again.',
        );
      throw new BadRequestException('Binance connection test failed');
    }
  }

  async revoke(user: AuthenticatedUser, id: string) {
    const connection = await this.findOwned(user, id, false);
    await this.db.exchangeConnection.update({
      where: { id: connection.id },
      data: {
        status: 'DISCONNECTED',
        apiKeyCiphertext: Buffer.alloc(0),
        apiSecretCiphertext: Buffer.alloc(0),
        permissions: [],
        revokedAt: new Date(),
      },
    });
    return { id: connection.id, status: 'DISCONNECTED' as const, revoked: true };
  }

  private async findOwned(user: AuthenticatedUser, id: string, includeCiphertext: boolean) {
    const connection = await this.db.exchangeConnection.findFirst({
      where: { id, userId: applicationUserId(user), revokedAt: null },
      select: {
        id: true,
        maskedApiKey: true,
        encryptionKeyVersion: true,
        revokedAt: true,
        ...(includeCiphertext ? { apiKeyCiphertext: true, apiSecretCiphertext: true } : {}),
      },
    });
    if (!connection) throw new NotFoundException('Exchange connection not found');
    return connection as typeof connection & {
      apiKeyCiphertext: Buffer;
      apiSecretCiphertext: Buffer;
    };
  }

  private async persistStatus(
    id: string,
    summary: { status: string; permissions: string[]; lastCheckedAt: string | null },
  ) {
    await this.db.exchangeConnection.update({
      where: { id },
      data: {
        status: summary.status as never,
        permissions: summary.permissions,
        lastCheckedAt: summary.lastCheckedAt ? new Date(summary.lastCheckedAt) : null,
      },
    });
    return {
      id,
      status: summary.status,
      permissions: summary.permissions,
      lastCheckedAt: summary.lastCheckedAt,
    };
  }
}

function applicationUserId(user: AuthenticatedUser): string {
  if (!user.applicationUserId) throw new ConflictException('Application user is not provisioned');
  return user.applicationUserId;
}
function text(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new BadRequestException(`Invalid ${field}`);
  return value.trim();
}
function mask(value: string): string {
  return `${value.slice(0, 4)}${'*'.repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}
function masterKey(): Uint8Array {
  const value = process.env.BINANCE_CREDENTIAL_MASTER_KEY;
  if (!value) throw new ServiceUnavailableException('Binance credential vault is not configured');
  const key = Buffer.from(value, 'base64url');
  if (key.length !== 32)
    throw new ServiceUnavailableException('Binance credential vault is not configured');
  return key;
}
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
