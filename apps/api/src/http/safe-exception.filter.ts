import { Catch, ArgumentsHost, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

type RequestLike = { headers: Record<string, string | string[] | undefined> };
type ResponseLike = { status(code: number): { json(body: unknown): void } };

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestLike>();
    const response = context.getResponse<ResponseLike>();
    const header = request.headers['x-correlation-id'];
    const correlationId = typeof header === 'string' && /^[a-zA-Z0-9._:-]{1,128}$/.test(header)
      ? header
      : randomUUID();
    const httpException = exception instanceof HttpException ? exception : null;
    const status = httpException?.getStatus() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const message = status >= 500 ? 'Internal server error' : safeMessage(httpException!);
    console.error(JSON.stringify({ event: 'api_request_error', correlationId, status }));
    response.status(status).json({ error: { code: statusCode(status), message, correlationId } });
  }
}

function safeMessage(exception: HttpException): string {
  const body = exception.getResponse();
  if (typeof body === 'string') return body;
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = body.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.every((item) => typeof item === 'string'))
      return message.join('; ');
  }
  return 'Request failed';
}

function statusCode(status: number): string {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  return status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED';
}
