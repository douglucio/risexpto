import { describe, expect, it } from 'vitest';
import { KillSwitch } from './index.js';
describe('KillSwitch', () => {
  it('blocks system, user and bot scopes and publishes events', () => {
    const kill = new KillSwitch(() => 10);
    const events: string[] = [];
    kill.subscribe((event) => events.push(event.scope));
    kill.activate('BOT', 'bot-1', 'repeated execution errors', 'system');
    expect(kill.isActive('user-1', 'bot-1')).toBe(true);
    kill.activate('USER', 'user-1', 'daily loss exceeded', 'risk');
    expect(kill.isActive('user-1', 'other')).toBe(true);
    kill.activate('SYSTEM', 'global', 'exchange unavailable', 'admin');
    expect(kill.isActive('other', 'other')).toBe(true);
    expect(events).toEqual(['BOT', 'USER', 'SYSTEM']);
  });
  it('deactivates only the requested scope and validates reasons', () => {
    const kill = new KillSwitch();
    expect(() => kill.activate('BOT', '', 'x', 'admin')).toThrow('required');
    kill.activate('BOT', 'b', 'x', 'admin');
    kill.activate('USER', 'u', 'x', 'admin');
    expect(kill.deactivate('BOT', 'b')).toBe(true);
    expect(kill.isActive('u', 'b')).toBe(true);
    expect(kill.deactivate('BOT', 'b')).toBe(false);
  });
});
