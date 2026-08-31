export class BinanceConnectionError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'BinanceConnectionError';
  }
}
