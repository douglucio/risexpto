import type { MarketDataMetrics } from './types.js';

export type PublicWebSocket = {
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: (() => void) | null;
  close: () => void;
};

export type WebSocketFactory = (url: string) => PublicWebSocket;

export type StreamOptions<T> = {
  stream: string;
  onEvent: (event: T) => void;
  onError?: (error: unknown) => void;
  maxRetries?: number;
  retryBaseDelayMs?: number;
};

export class BinancePublicStream<T> {
  private socket: PublicWebSocket | null = null;
  private stopped = false;
  private retries = 0;

  constructor(
    private readonly baseUrl: string,
    private readonly factory: WebSocketFactory,
    private readonly metrics?: Pick<MarketDataMetrics, 'websocketReconnects'>,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}

  async connect(options: StreamOptions<T>): Promise<void> {
    this.stopped = false;
    this.retries = 0;
    await this.open(options);
  }

  stop(): void {
    this.stopped = true;
    this.socket?.close();
    this.socket = null;
  }

  private async open(options: StreamOptions<T>): Promise<void> {
    if (this.stopped) return;
    const socket = this.factory(
      `${this.baseUrl.replace(/\/$/, '')}/ws/${options.stream.toLowerCase()}`,
    );
    this.socket = socket;
    await new Promise<void>((resolve) => {
      socket.onopen = () => {
        this.retries = 0;
        resolve();
      };
      socket.onmessage = (event) => {
        try {
          options.onEvent(JSON.parse(event.data) as T);
        } catch (error) {
          options.onError?.(error);
        }
      };
      socket.onerror = (error) => options.onError?.(error);
      socket.onclose = () => {
        if (this.stopped || this.retries >= (options.maxRetries ?? 8)) return;
        this.retries += 1;
        if (this.metrics) this.metrics.websocketReconnects += 1;
        void this.sleep((options.retryBaseDelayMs ?? 250) * 2 ** (this.retries - 1)).then(() =>
          this.open(options),
        );
      };
    });
  }
}
