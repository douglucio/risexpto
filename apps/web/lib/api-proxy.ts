import { NextResponse } from 'next/server';
import { readSession } from './auth/session';

export async function apiProxy(path: string, init?: RequestInit) {
  const session = await readSession(false);
  if (!session) return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  const apiBaseUrl = process.env.API_BASE_URL ?? `http://localhost:${process.env.API_PORT ?? '3001'}`;
  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, {
      ...init,
      headers: { authorization: `Bearer ${session.accessToken}`, ...(init?.headers ?? {}) },
      cache: 'no-store',
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json({ message: 'API unavailable' }, { status: 503 });
  }
}
