import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { RolesGuard } from '../src/auth/roles.guard';

function context(roles: string[]): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }),
  } as unknown as ExecutionContext;
}
describe('RolesGuard', () => {
  it('denies a user without a required privileged role', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(context(['USER']))).toThrow(
      ForbiddenException,
    );
  });
  it('allows a matching role', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['SUPPORT', 'ADMIN']),
    } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(context(['SUPPORT']))).toBe(true);
  });
});
