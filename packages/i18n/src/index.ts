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
    'marketing.eyebrow': 'AUTOMATION WITH GUARDRAILS', 'marketing.portfolio': 'PORTFOLIO OVERVIEW', 'marketing.illustrative': 'Illustrative workspace', 'marketing.riskCapacity': 'Risk capacity', 'marketing.withinLimits': 'Within limits', 'marketing.activeBots': 'Active bots',
    'marketing.benefitRisk': 'Risk-first automation', 'marketing.benefitRiskText': 'Every trade proposal is checked against hard limits before execution.', 'marketing.benefitPaper': 'Paper Trading first', 'marketing.benefitPaperText': 'Validate behavior with market data and simulated balances before going live.', 'marketing.benefitCustody': 'Non-custodial by design', 'marketing.benefitCustodyText': 'Your assets stay on your exchange. Withdrawal permission is never required.',
    'marketing.securityTrade': 'Trade-only API permissions', 'marketing.securityCredentials': 'Encrypted exchange credentials', 'marketing.securityEngine': 'Risk Engine before execution', 'marketing.securityAudit': 'Full audit trail for actions', 'marketing.pricingDescription': 'Explore strategies, configure limits, and understand the workflow before considering live execution.', 'marketing.footerDisclaimer': 'Past performance does not guarantee future results.', 'marketing.previewLabel': 'Illustrative risk dashboard preview',
    'pricing.loading': 'Loading plans…', 'pricing.error': 'Pricing is temporarily unavailable. The workspace remains available in Paper Trading.', 'pricing.empty': 'No plans are available yet.', 'pricing.month': '/ month · Stripe Test Mode',
    'nav.dashboard': 'Dashboard', 'nav.bots': 'Bots', 'nav.strategies': 'Strategies', 'nav.connections': 'Connections', 'nav.backtests': 'Backtests', 'nav.trades': 'Trades', 'nav.risk': 'Risk', 'nav.notifications': 'Notifications', 'nav.billing': 'Billing', 'nav.settings': 'Settings', 'nav.admin': 'Admin Console', 'nav.profile': 'Profile', 'nav.logout': 'Logout', 'nav.tradingMode': 'TRADING MODE',
    'auth.welcome': 'Welcome to RiseXPTO', 'auth.description': 'Sign in through our secure identity service. Your trading credentials are never part of your login.', 'auth.signIn': 'Sign in', 'auth.createAccount': 'Create account', 'auth.recover': 'Recover password', 'auth.disclaimer': 'By continuing, you acknowledge that trading involves risk and returns are not guaranteed.', 'auth.error.emailTitle': 'Email verification required', 'auth.error.expiredTitle': 'Login expired', 'auth.error.sessionTitle': 'Login session invalid', 'auth.error.profileTitle': 'Profile incomplete', 'auth.error.failedTitle': 'Authentication failed', 'auth.error.emailMessage': 'Verify your email in Keycloak before continuing.', 'auth.error.expiredMessage': 'This login attempt expired. Start a new sign-in attempt.', 'auth.error.sessionMessage': 'The login session was invalid or expired. Try again.', 'auth.error.profileMessage': 'Your Keycloak profile is missing a valid email. Update it and try again.', 'auth.error.audienceMessage': 'The identity service returned a token for the wrong application.', 'auth.error.tokenMessage': 'The identity token could not be validated safely.', 'auth.error.exchangeMessage': 'The authorization code could not be exchanged. Start a new sign-in attempt.', 'auth.error.genericMessage': 'The login could not be completed safely. Please try again.',
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
    'marketing.eyebrow': 'AUTOMAÇÃO COM GUARDRAILS', 'marketing.portfolio': 'VISÃO GERAL DO PORTFÓLIO', 'marketing.illustrative': 'Workspace ilustrativo', 'marketing.riskCapacity': 'Capacidade de risco', 'marketing.withinLimits': 'Dentro dos limites', 'marketing.activeBots': 'Bots ativos',
    'marketing.benefitRisk': 'Automação orientada a risco', 'marketing.benefitRiskText': 'Toda proposta de operação é verificada contra limites rígidos antes da execução.', 'marketing.benefitPaper': 'Paper Trading primeiro', 'marketing.benefitPaperText': 'Valide o comportamento com dados de mercado e saldos simulados antes de entrar ao vivo.', 'marketing.benefitCustody': 'Não custodial por design', 'marketing.benefitCustodyText': 'Seus ativos permanecem na sua exchange. A permissão de saque nunca é necessária.',
    'marketing.securityTrade': 'Permissões de API somente para trade', 'marketing.securityCredentials': 'Credenciais da exchange criptografadas', 'marketing.securityEngine': 'Risk Engine antes da execução', 'marketing.securityAudit': 'Trilha de auditoria completa', 'marketing.pricingDescription': 'Explore estratégias, configure limites e entenda o fluxo antes de considerar a execução ao vivo.', 'marketing.footerDisclaimer': 'Desempenho passado não garante resultados futuros.', 'marketing.previewLabel': 'Prévia ilustrativa do painel de risco',
    'pricing.loading': 'Carregando planos…', 'pricing.error': 'Os preços estão temporariamente indisponíveis. O workspace continua disponível em Paper Trading.', 'pricing.empty': 'Nenhum plano disponível ainda.', 'pricing.month': '/ mês · Stripe Test Mode',
    'nav.dashboard': 'Painel', 'nav.bots': 'Bots', 'nav.strategies': 'Estratégias', 'nav.connections': 'Conexões', 'nav.backtests': 'Backtests', 'nav.trades': 'Operações', 'nav.risk': 'Risco', 'nav.notifications': 'Notificações', 'nav.billing': 'Cobrança', 'nav.settings': 'Configurações', 'nav.admin': 'Console administrativo', 'nav.profile': 'Perfil', 'nav.logout': 'Sair', 'nav.tradingMode': 'MODO DE OPERAÇÃO',
    'auth.welcome': 'Bem-vindo ao RiseXPTO', 'auth.description': 'Entre pelo nosso serviço seguro de identidade. Suas credenciais de trading nunca fazem parte do login.', 'auth.signIn': 'Entrar', 'auth.createAccount': 'Criar conta', 'auth.recover': 'Recuperar senha', 'auth.disclaimer': 'Ao continuar, você reconhece que operar envolve riscos e que retornos não são garantidos.', 'auth.error.emailTitle': 'Verificação de e-mail necessária', 'auth.error.expiredTitle': 'Login expirado', 'auth.error.sessionTitle': 'Sessão de login inválida', 'auth.error.profileTitle': 'Perfil incompleto', 'auth.error.failedTitle': 'Falha na autenticação', 'auth.error.emailMessage': 'Verifique seu e-mail no Keycloak antes de continuar.', 'auth.error.expiredMessage': 'Esta tentativa expirou. Inicie um novo login.', 'auth.error.sessionMessage': 'A sessão de login expirou ou é inválida. Tente novamente.', 'auth.error.profileMessage': 'Seu perfil Keycloak não possui um e-mail válido. Atualize-o e tente novamente.', 'auth.error.audienceMessage': 'O serviço de identidade retornou um token para a aplicação errada.', 'auth.error.tokenMessage': 'O token de identidade não pôde ser validado com segurança.', 'auth.error.exchangeMessage': 'O código de autorização não pôde ser trocado. Inicie um novo login.', 'auth.error.genericMessage': 'O login não pôde ser concluído com segurança. Tente novamente.',
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
    'marketing.eyebrow': 'AUTOMATIZACIÓN CON GUARDAS', 'marketing.portfolio': 'RESUMEN DE CARTERA', 'marketing.illustrative': 'Espacio ilustrativo', 'marketing.riskCapacity': 'Capacidad de riesgo', 'marketing.withinLimits': 'Dentro de los límites', 'marketing.activeBots': 'Bots activos',
    'marketing.benefitRisk': 'Automatización orientada al riesgo', 'marketing.benefitRiskText': 'Cada propuesta de operación se verifica contra límites estrictos antes de ejecutarse.', 'marketing.benefitPaper': 'Paper Trading primero', 'marketing.benefitPaperText': 'Valida el comportamiento con datos de mercado y saldos simulados antes de operar en vivo.', 'marketing.benefitCustody': 'No custodial por diseño', 'marketing.benefitCustodyText': 'Tus activos permanecen en tu exchange. Nunca se requiere permiso de retiro.',
    'marketing.securityTrade': 'Permisos de API solo para trading', 'marketing.securityCredentials': 'Credenciales de exchange cifradas', 'marketing.securityEngine': 'Risk Engine antes de ejecutar', 'marketing.securityAudit': 'Registro de auditoría completo', 'marketing.pricingDescription': 'Explora estrategias, configura límites y entiende el flujo antes de considerar la ejecución en vivo.', 'marketing.footerDisclaimer': 'El rendimiento pasado no garantiza resultados futuros.', 'marketing.previewLabel': 'Vista previa ilustrativa del panel de riesgo',
    'pricing.loading': 'Cargando planes…', 'pricing.error': 'Los precios no están disponibles temporalmente. El espacio sigue disponible en Paper Trading.', 'pricing.empty': 'Aún no hay planes disponibles.', 'pricing.month': '/ mes · Stripe Test Mode',
    'nav.dashboard': 'Panel', 'nav.bots': 'Bots', 'nav.strategies': 'Estrategias', 'nav.connections': 'Conexiones', 'nav.backtests': 'Backtests', 'nav.trades': 'Operaciones', 'nav.risk': 'Riesgo', 'nav.notifications': 'Notificaciones', 'nav.billing': 'Facturación', 'nav.settings': 'Configuración', 'nav.admin': 'Consola de administración', 'nav.profile': 'Perfil', 'nav.logout': 'Cerrar sesión', 'nav.tradingMode': 'MODO DE TRADING',
    'auth.welcome': 'Bienvenido a RiseXPTO', 'auth.description': 'Inicia sesión mediante nuestro servicio seguro de identidad. Tus credenciales de trading nunca forman parte de tu acceso.', 'auth.signIn': 'Iniciar sesión', 'auth.createAccount': 'Crear cuenta', 'auth.recover': 'Recuperar contraseña', 'auth.disclaimer': 'Al continuar, reconoces que operar implica riesgos y que no se garantizan rendimientos.', 'auth.error.emailTitle': 'Se requiere verificar el correo', 'auth.error.expiredTitle': 'Inicio de sesión expirado', 'auth.error.sessionTitle': 'Sesión de inicio inválida', 'auth.error.profileTitle': 'Perfil incompleto', 'auth.error.failedTitle': 'Error de autenticación', 'auth.error.emailMessage': 'Verifica tu correo en Keycloak antes de continuar.', 'auth.error.expiredMessage': 'Esta sesión expiró. Inicia un nuevo acceso.', 'auth.error.sessionMessage': 'La sesión es inválida o expiró. Inténtalo de nuevo.', 'auth.error.profileMessage': 'Tu perfil de Keycloak no tiene un correo válido. Actualízalo e inténtalo de nuevo.', 'auth.error.audienceMessage': 'El servicio de identidad devolvió un token para otra aplicación.', 'auth.error.tokenMessage': 'El token de identidad no pudo validarse de forma segura.', 'auth.error.exchangeMessage': 'No se pudo intercambiar el código. Inicia un nuevo acceso.', 'auth.error.genericMessage': 'No se pudo completar el acceso de forma segura. Inténtalo de nuevo.',
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
