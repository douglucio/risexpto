export type NotificationEvent =
  | 'BOT_STARTED'
  | 'BOT_PAUSED'
  | 'BOT_STOPPED'
  | 'RISK_BLOCKED'
  | 'KILL_SWITCH'
  | 'BINANCE_INVALID'
  | 'DRAWDOWN_WARNING'
  | 'CRITICAL_ERROR'
  | 'BACKTEST_COMPLETED';
export type Channel = 'IN_APP' | 'EMAIL';
export type Notification = {
  id: string;
  userId: string;
  event: NotificationEvent;
  title: string;
  body: string;
  channel: Channel;
  dedupeKey: string;
  createdAt: number;
};
export type NotificationAdapter = { send(notification: Notification): Promise<void> };
export class NotificationService {
  private readonly sent = new Set<string>();
  private readonly items: Notification[] = [];
  constructor(
    private readonly now: () => number = Date.now,
    private readonly id: () => string = () =>
      globalThis.crypto?.randomUUID() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  ) {}
  async publish(
    userId: string,
    event: NotificationEvent,
    title: string,
    body: string,
    channels: readonly Channel[],
    dedupeKey: string,
    adapters: Partial<Record<Channel, NotificationAdapter>> = {},
  ): Promise<Notification[]> {
    if (!userId.trim() || !title.trim() || !body.trim() || !dedupeKey.trim())
      throw new Error('Notification fields are required');
    const created: Notification[] = [];
    for (const channel of channels) {
      const key = `${userId}:${channel}:${dedupeKey}`;
      if (this.sent.has(key)) continue;
      const notification = {
        id: this.id(),
        userId,
        event,
        title: title.trim(),
        body: body.trim(),
        channel,
        dedupeKey,
        createdAt: this.now(),
      };
      this.sent.add(key);
      this.items.push(notification);
      if (adapters[channel]) await adapters[channel].send({ ...notification });
      created.push({ ...notification });
    }
    return created;
  }
  list(userId: string): Notification[] {
    return this.items.filter((item) => item.userId === userId).map((item) => ({ ...item }));
  }
}
