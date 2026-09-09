import { apiProxy } from '../../../../lib/api-proxy';

export async function PATCH(request: Request) {
  return apiProxy('/profile/preferences', { method: 'PATCH', body: await request.text(), headers: { 'content-type': 'application/json' } });
}
