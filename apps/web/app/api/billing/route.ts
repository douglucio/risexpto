import { apiProxy } from '../../../lib/api-proxy';

export async function GET() {
  return apiProxy('/billing');
}
export async function POST(request: Request) {
  return apiProxy('/billing/checkout', {
    method: 'POST',
    body: await request.text(),
    headers: { 'content-type': 'application/json' },
  });
}
