import { apiProxy } from '../../../../lib/api-proxy';
export async function POST() {
  return apiProxy('/billing/portal', { method: 'POST' });
}
