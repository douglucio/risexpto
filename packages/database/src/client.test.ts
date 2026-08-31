import { describe, expect, it } from 'vitest';
import { createDatabaseClient } from './index.js';

describe('database client', () => {
  it('rejects non-PostgreSQL connection strings', () => {
    expect(() => createDatabaseClient('file:unsafe.db')).toThrow('PostgreSQL');
  });
});
