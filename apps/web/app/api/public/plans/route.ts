import { NextResponse } from 'next/server';

export async function GET() {
  const base = process.env.API_BASE_URL ?? `http://localhost:${process.env.API_PORT ?? '3001'}`;
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/public/plans`, { cache: 'no-store' });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    return NextResponse.json({ message: 'Pricing is temporarily unavailable.' }, { status: 503 });
  }
}
