import { apiProxy } from '../../../lib/api-proxy';

export async function POST(request: Request) {
  return apiProxy('/bots', { method: 'POST', body: await request.text(), headers: { 'content-type': 'application/json' } });
}

export async function GET() {
  return apiProxy('/bots');
}
