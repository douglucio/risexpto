import { apiProxy } from '../../../../../lib/api-proxy';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.text();
  return apiProxy(`/bots/${encodeURIComponent(id)}/status`, {
    method: 'PATCH', body, headers: { 'content-type': 'application/json' },
  });
}
