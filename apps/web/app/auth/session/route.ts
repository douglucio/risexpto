import { NextResponse } from 'next/server';
import { readSession } from '../../../lib/auth/session';
export async function GET() {
  const session = await readSession();
  if (!session)
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { 'cache-control': 'no-store' } },
    );
  return NextResponse.json(
    { authenticated: true, user: session.user, preferences: session.preferences },
    { headers: { 'cache-control': 'no-store' } },
  );
}
