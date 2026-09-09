import { apiProxy } from '../../../../../lib/api-proxy';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return apiProxy(`/exchange-connections/${encodeURIComponent(id)}/test`, { method: 'POST' });
}
