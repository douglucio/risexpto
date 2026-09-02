import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, normalizeLocale, translate } from './index.js';
describe('i18n', () => {
  it('translates with English fallback and supports Brazilian Portuguese', () => {
    expect(translate('bot.started', 'pt-BR')).toBe('Bot iniciado');
    expect(translate('unknown', 'pt-BR')).toBe('unknown');
    expect(normalizeLocale('pt-BR')).toBe('pt-BR');
    expect(normalizeLocale('fr')).toBe('en');
  });
  it('formats currency and timezone-aware dates through Intl', () => {
    expect(formatCurrency(1234.5, 'USD', 'en')).toContain('$1,234.50');
    expect(formatDate(Date.UTC(2026, 0, 1, 12), 'en', 'UTC')).toContain('Jan');
  });
});
