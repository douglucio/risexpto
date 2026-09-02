export type KillScope = 'USER' | 'BOT' | 'SYSTEM';
export type KillEvent = {
  scope: KillScope;
  targetId: string;
  reason: string;
  activatedAt: number;
  activatedBy: string;
};
export class KillSwitch {
  private readonly active = new Map<string, KillEvent>();
  private readonly listeners = new Set<(event: KillEvent) => void>();
  constructor(private readonly now: () => number = Date.now) {}
  subscribe(listener: (event: KillEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  activate(scope: KillScope, targetId: string, reason: string, activatedBy: string): KillEvent {
    if (!targetId.trim() || !reason.trim() || !activatedBy.trim())
      throw new Error('Kill switch fields are required');
    const event = { scope, targetId, reason: reason.trim(), activatedAt: this.now(), activatedBy };
    this.active.set(`${scope}:${targetId}`, event);
    for (const listener of this.listeners) listener({ ...event });
    return { ...event };
  }
  deactivate(scope: KillScope, targetId: string): boolean {
    return this.active.delete(`${scope}:${targetId}`);
  }
  isActive(userId: string, botId?: string): boolean {
    return (
      this.active.has('SYSTEM:global') ||
      this.active.has(`USER:${userId}`) ||
      (botId !== undefined && this.active.has(`BOT:${botId}`))
    );
  }
  events(): KillEvent[] {
    return [...this.active.values()].map((event) => ({ ...event }));
  }
}
