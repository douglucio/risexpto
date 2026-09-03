import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { AuthGuard } from '../src/auth/auth.guard';
import type { AuthenticatedUser, TokenVerifier } from '../src/auth/auth.types';
import {
  UserProvisioningError,
  type UserProvisioningService,
} from '../src/users/user-provisioning.service';

const provisioning = {
  provision: vi.fn((user: AuthenticatedUser) => Promise.resolve(user)),
} as unknown as UserProvisioningService;

function context(authorization?: string) {
  const request: { headers: { authorization?: string }; user?: unknown } = { headers: {} };
  if (authorization) request.headers.authorization = authorization;
  return {
    request,
    context: {
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext,
  };
}

describe('AuthGuard', () => {
  it('denies missing bearer credentials', async () => {
    const verifier: TokenVerifier = { verify: vi.fn() };
    const { context: execution } = context();
    await expect(
      new AuthGuard(new Reflector(), verifier, provisioning).canActivate(execution),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('maps only known realm roles after verification', async () => {
    const verifier: TokenVerifier = {
      verify: vi.fn().mockResolvedValue({
        sub: 'u1',
        email: 'user@example.com',
        email_verified: true,
        realm_access: { roles: ['USER', 'offline_access'] },
      }),
    };
    const { context: execution, request } = context('Bearer valid');
    await expect(
      new AuthGuard(new Reflector(), verifier, provisioning).canActivate(execution),
    ).resolves.toBe(true);
    expect(request.user).toMatchObject({ id: 'u1', roles: ['USER'], emailVerified: true });
  });
  it('does not leak verifier details on invalid tokens', async () => {
    const verifier: TokenVerifier = {
      verify: vi.fn().mockRejectedValue(new Error('JWKS internal detail')),
    };
    const { context: execution } = context('Bearer invalid');
    await expect(
      new AuthGuard(new Reflector(), verifier, provisioning).canActivate(execution),
    ).rejects.toThrow('Invalid or expired access token');
  });
  it('keeps a deactivated application user forbidden', async () => {
    const verifier: TokenVerifier = {
      verify: vi
        .fn()
        .mockResolvedValue({ sub: 'u1', email: 'user@example.com', email_verified: true }),
    };
    const deactivated = {
      provision: vi.fn().mockRejectedValue(new UserProvisioningError('DEACTIVATED')),
    } as unknown as UserProvisioningService;
    const { context: execution } = context('Bearer valid');
    await expect(
      new AuthGuard(new Reflector(), verifier, deactivated).canActivate(execution),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('keeps database provisioning failures distinct from invalid tokens', async () => {
    const verifier: TokenVerifier = {
      verify: vi
        .fn()
        .mockResolvedValue({ sub: 'u1', email: 'user@example.com', email_verified: true }),
    };
    const unavailable = {
      provision: vi.fn().mockRejectedValue(new UserProvisioningError('UNAVAILABLE')),
    } as unknown as UserProvisioningService;
    const { context: execution } = context('Bearer valid');
    await expect(
      new AuthGuard(new Reflector(), verifier, unavailable).canActivate(execution),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
