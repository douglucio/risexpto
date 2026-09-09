export type Locale = 'en' | 'pt-BR' | 'es';
const messages: Record<Locale, Record<string, string>> = {
  en: {
    'bot.started': 'Bot started',
    'risk.blocked': 'Trade blocked by risk controls',
    'error.generic': 'An unexpected error occurred.',
    'marketing.how': 'How it works', 'marketing.security': 'Security', 'marketing.pricing': 'Pricing', 'marketing.login': 'Log in',
    'marketing.hero': 'Trade with a system you can understand.', 'marketing.lede': 'RiseXPTO brings disciplined crypto automation, risk controls, and transparent monitoring into one focused workspace.',
    'marketing.paper': 'Start in Paper Trading', 'marketing.see': 'See how it works →', 'marketing.note': 'No custody. No withdrawal access. No promises of returns.',
    'marketing.loop': 'A CONTROLLED LOOP', 'marketing.context': 'From signal to decision, every step has context.', 'marketing.product': 'SECURITY IS THE PRODUCT',
    'marketing.securityHeadline': 'Automation should make decisions more disciplined, not more mysterious.', 'marketing.simple': 'SIMPLE START', 'marketing.begin': 'Begin with Paper Trading.',
    'marketing.workspace': 'Create your workspace',
  },
  'pt-BR': {
    'bot.started': 'Bot iniciado',
    'risk.blocked': 'Operação bloqueada pelos controles de risco',
    'error.generic': 'Ocorreu um erro inesperado.',
    'marketing.how': 'Como funciona', 'marketing.security': 'Segurança', 'marketing.pricing': 'Preços', 'marketing.login': 'Entrar',
    'marketing.hero': 'Opere com um sistema que você entende.', 'marketing.lede': 'O RiseXPTO reúne automação disciplinada de cripto, controles de risco e monitoramento transparente em um só workspace.',
    'marketing.paper': 'Começar no Paper Trading', 'marketing.see': 'Veja como funciona →', 'marketing.note': 'Sem custódia. Sem acesso a saques. Sem promessas de retorno.',
    'marketing.loop': 'UM CICLO CONTROLADO', 'marketing.context': 'Do sinal à decisão, cada etapa tem contexto.', 'marketing.product': 'SEGURANÇA É O PRODUTO',
    'marketing.securityHeadline': 'A automação deve tornar as decisões mais disciplinadas, não mais misteriosas.', 'marketing.simple': 'COMEÇO SIMPLES', 'marketing.begin': 'Comece com Paper Trading.',
    'marketing.workspace': 'Criar seu workspace',
  },
  es: {
    'bot.started': 'Bot iniciado',
    'risk.blocked': 'Operación bloqueada por los controles de riesgo',
    'error.generic': 'Ocurrió un error inesperado.',
    'marketing.how': 'Cómo funciona', 'marketing.security': 'Seguridad', 'marketing.pricing': 'Precios', 'marketing.login': 'Iniciar sesión',
    'marketing.hero': 'Opera con un sistema que puedes entender.', 'marketing.lede': 'RiseXPTO reúne automatización disciplinada de cripto, controles de riesgo y monitoreo transparente en un solo espacio.',
    'marketing.paper': 'Empezar en Paper Trading', 'marketing.see': 'Mira cómo funciona →', 'marketing.note': 'Sin custodia. Sin acceso a retiros. Sin promesas de rentabilidad.',
    'marketing.loop': 'UN CICLO CONTROLADO', 'marketing.context': 'De la señal a la decisión, cada paso tiene contexto.', 'marketing.product': 'LA SEGURIDAD ES EL PRODUCTO',
    'marketing.securityHeadline': 'La automatización debe hacer las decisiones más disciplinadas, no más misteriosas.', 'marketing.simple': 'INICIO SIMPLE', 'marketing.begin': 'Empieza con Paper Trading.',
    'marketing.workspace': 'Crear tu espacio',
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
  if (value?.toLowerCase().startsWith('pt')) return 'pt-BR';
  if (value?.toLowerCase().startsWith('es')) return 'es';
  return 'en';
}
