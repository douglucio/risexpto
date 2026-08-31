import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

export * from '../generated/client/client.js';

export function createDatabaseClient(connectionString: string): PrismaClient {
  if (
    !connectionString.startsWith('postgresql://') &&
    !connectionString.startsWith('postgres://')
  ) {
    throw new Error('A PostgreSQL connection string is required');
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
