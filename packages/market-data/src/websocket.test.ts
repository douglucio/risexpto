import { describe, expect, it, vi } from 'vitest';
import { BinancePublicStream, type PublicWebSocket } from './websocket.js';

function fakeSocket(): PublicWebSocket & {
  emitClose: () => void;
  emitOpen: () => void;
  emitMessage: (data: string) => void;
} {
  const socket: PublicWebSocket & {
    emitClose: () => void;
    emitOpen: () => void;
    emitMessage: (data: string) => void;
  } = {
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    close: vi.fn(),
    emitOpen: () => socket.onopen?.(),
    emitClose: () => socket.onclose?.(),
    emitMessage: (data) => socket.onmessage?.({ data }),
  };
  return socket;
}

describe('BinancePublicStream', () => {
  it('connects to normalized stream, forwards events, and reconnects with backoff', async () => {
    const sockets: ReturnType<typeof fakeSocket>[] = [];
    const factory = vi.fn((url: string) => {
      expect(url).toBe('wss://stream.binance.com/ws/btcusdt@trade');
      const socket = fakeSocket();
      sockets.push(socket);
      queueMicrotask(() => socket.emitOpen());
      return socket;
    });
    const events: unknown[] = [];
    const metrics = { websocketReconnects: 0 };
    const stream = new BinancePublicStream('wss://stream.binance.com/', factory, metrics, () =>
      Promise.resolve(),
    );
    await stream.connect({
      stream: 'BTCUSDT@trade',
      onEvent: (event) => events.push(event),
      maxRetries: 1,
    });
    sockets[0]?.emitMessage('{"p":"1"}');
    sockets[0]?.emitClose();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toEqual([{ p: '1' }]);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(metrics.websocketReconnects).toBe(1);
    stream.stop();
  });
});
