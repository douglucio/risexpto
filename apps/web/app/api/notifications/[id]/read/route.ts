import { apiProxy } from '../../../../../lib/api-proxy';

export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return apiProxy(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
}
