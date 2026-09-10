import { NextResponse } from 'next/server';
import { readSession } from './auth/session';
import { summarizeAccessToken } from './auth/oidc';

export function apiRequestHeaders(init: HeadersInit | undefined, accessToken: string): Headers {
  const headers = new Headers(init);
  headers.set('authorization', `Bearer ${accessToken}`);
  return headers;
}

export async function apiProxy(path: string, init?: RequestInit) {
  const session = await readSession(true);
  if (!session) return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  const apiBaseUrl =
    process.env.API_BASE_URL ?? `http://localhost:${process.env.API_PORT ?? '3001'}`;
  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, {
      ...init,
      headers: apiRequestHeaders(init?.headers, session.accessToken),
      cache: 'no-store',
    });
    if (response.status === 401) {
      console.warn(
        JSON.stringify({
          event: 'web_api_auth_failed',
          path,
          token: summarizeAccessToken(session.accessToken),
        }),
      );
    }
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json({ message: 'API unavailable' }, { status: 503 });
  }
}
