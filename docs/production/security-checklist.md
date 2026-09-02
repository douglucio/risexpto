# Production Security Checklist

- [ ] secrets configurados em secret manager;
- [ ] nenhuma API key com saque habilitado;
- [ ] CORS restrito a origens conhecidas;
- [ ] TLS e headers de segurança ativos;
- [ ] rate limit e brute-force protection ativos;
- [ ] logs revisados contra secrets;
- [ ] webhooks Stripe com assinatura validada;
- [ ] backups criptografados e restore testado;
- [ ] RBAC e isolamento administrativo verificados;
- [ ] Kill Switch testado antes de LIVE;
- [ ] Risk Engine e reconciliação verificados antes de LIVE.
