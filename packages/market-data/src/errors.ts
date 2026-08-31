export class MarketDataError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'MarketDataError';
  }
}

export class CircuitOpenError extends MarketDataError {
  constructor() {
    super('Market data circuit is open');
    this.name = 'CircuitOpenError';
  }
}
