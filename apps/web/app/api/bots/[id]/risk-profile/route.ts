import { apiProxy } from '../../../../../lib/api-proxy';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return apiProxy(`/bots/${encodeURIComponent(id)}/risk-profile`, { method: 'GET' });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return apiProxy(`/bots/${encodeURIComponent(id)}/risk-profile`, { method: 'PATCH', body: await request.text(), headers: { 'content-type': 'application/json' } });
}
