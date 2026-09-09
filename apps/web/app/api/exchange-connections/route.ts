import { apiProxy } from '../../../lib/api-proxy';

export async function GET() {
  return apiProxy('/exchange-connections');
}

export async function POST(request: Request) {
  return apiProxy('/exchange-connections', {
    method: 'POST',
    body: await request.text(),
    headers: { 'content-type': 'application/json' },
  });
}
