import { NextResponse } from 'next/server';
import { authConfig } from '../../../lib/auth/config';
import { updatePreferences } from '../../../lib/auth/session';
import type { UserPreferences } from '../../../lib/auth/types';

const locales = new Set(['en', 'pt-BR']);
const currencies = new Set(['USD', 'BRL', 'EUR']);
export async function PUT(request: Request) {
  if (request.headers.get('origin') !== authConfig().baseUrl)
    return new NextResponse(null, { status: 403 });
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isPreferences(value))
    return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 });
  const session = await updatePreferences(value);
  return session
    ? NextResponse.json({ preferences: session.preferences })
    : NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
}
function isPreferences(value: unknown): value is UserPreferences {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  if (
    !locales.has(String(item.locale)) ||
    !currencies.has(String(item.currency)) ||
    typeof item.timezone !== 'string' ||
    item.timezone.length > 64
  )
    return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: item.timezone }).format();
    return true;
  } catch {
    return false;
  }
}
