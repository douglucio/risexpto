import { apiProxy } from '../../../lib/api-proxy';

export async function GET() { return apiProxy('/backtests'); }
export async function POST(request: Request) {
  return apiProxy('/backtests', { method: 'POST', body: await request.text(), headers: { 'content-type': 'application/json' } });
}
