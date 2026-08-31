import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { TOKEN_VERIFIER, type TokenVerifier } from '../src/auth/auth.types';

describe('API authentication boundary', () => {
  let app: INestApplication;
  const verifier: TokenVerifier = {
    verify: vi.fn((token: string) => {
      if (token !== 'valid') throw new Error('invalid');
      return Promise.resolve({
        sub: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        email_verified: true,
        realm_access: { roles: ['USER'] },
      });
    }),
  };
  beforeEach(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(verifier)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });
  it('keeps health public but profile private', async () => {
    const server = app.getHttpServer() as Server;
    await request(server).get('/health').expect(200);
    await request(server).get('/profile').expect(401);
  });
  it('returns a safe profile for a verified bearer token', async () => {
    const response = await request(app.getHttpServer() as Server)
      .get('/profile')
      .set('authorization', 'Bearer valid')
      .expect(200);
    expect(response.body).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      emailVerified: true,
      roles: ['USER'],
    });
    expect(JSON.stringify(response.body)).not.toContain('valid');
  });
});
