export type Locale = 'en' | 'pt-BR';
const messages: Record<Locale, Record<string, string>> = {
  en: {
    'bot.started': 'Bot started',
    'risk.blocked': 'Trade blocked by risk controls',
    'error.generic': 'An unexpected error occurred.',
  },
  'pt-BR': {
    'bot.started': 'Bot iniciado',
    'risk.blocked': 'Operação bloqueada pelos controles de risco',
    'error.generic': 'Ocorreu um erro inesperado.',
  },
};
export function translate(key: string, locale: Locale = 'en'): string {
  return messages[locale][key] ?? messages.en[key] ?? key;
}
export function formatNumber(
  value: number,
  locale: Locale = 'en',
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}
export function formatCurrency(value: number, currency: string, locale: Locale = 'en'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}
export function formatDate(value: Date | number, locale: Locale = 'en', timezone = 'UTC'): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(value);
}
export function normalizeLocale(value: string | undefined): Locale {
  return value?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}
