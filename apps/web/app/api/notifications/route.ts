import { apiProxy } from '../../../lib/api-proxy';

export async function GET() { return apiProxy('/notifications'); }
