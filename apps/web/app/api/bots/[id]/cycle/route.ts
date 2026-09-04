import { apiProxy } from '../../../../../lib/api-proxy';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.text();
  return apiProxy(`/bots/${encodeURIComponent(id)}/cycle`, {
    method: 'POST', body, headers: { 'content-type': 'application/json' },
  });
}
