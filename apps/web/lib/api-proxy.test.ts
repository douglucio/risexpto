import { describe, expect, it } from 'vitest';
import { apiRequestHeaders } from './api-proxy';

describe('API proxy authorization boundary', () => {
  it('always uses the session access token and preserves non-auth headers', () => {
    const headers = apiRequestHeaders(
      {
        authorization: 'Bearer id-token-or-stale-token',
        'content-type': 'application/json',
      },
      'current-access-token',
    );
    expect(headers.get('authorization')).toBe('Bearer current-access-token');
    expect(headers.get('content-type')).toBe('application/json');
  });
});
