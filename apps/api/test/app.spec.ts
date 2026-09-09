import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppController } from '../src/app.controller';

describe('AppController', () => {
  it('reports API health without sensitive data', async () => {
    const module = await Test.createTestingModule({ controllers: [AppController] }).compile();
    expect(module.get(AppController).health()).toEqual({ service: 'api', status: 'ok' });
  });

  it('reports readiness as unavailable when dependencies are not injected/configured', async () => {
    const module = await Test.createTestingModule({ controllers: [AppController] }).compile();
    const response = { status: (code: number) => code } as never;
    await expect(module.get(AppController).ready(response)).resolves.toMatchObject({
      service: 'api',
      status: 'not_ready',
      checks: { postgres: false, redis: false },
    });
  });
});
