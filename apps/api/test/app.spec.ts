import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppController } from '../src/app.controller';

describe('AppController', () => {
  it('reports API health without sensitive data', async () => {
    const module = await Test.createTestingModule({ controllers: [AppController] }).compile();
    expect(module.get(AppController).health()).toEqual({ service: 'api', status: 'ok' });
  });
});
