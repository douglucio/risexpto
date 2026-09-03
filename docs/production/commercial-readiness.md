# RiseXPTO — Commercial Readiness

Status geral: `NOT_READY`

Este checklist acompanha a prontidão comercial. Nenhum item autoriza Stripe Live,
operação financeira real ou lançamento público por si só.

## Billing e planos

- [ ] Stripe Production configurado somente após aprovação explícita.
- [ ] Pricing aprovado pelo proprietário e documentado.
- [ ] Regras de assinatura, upgrade, downgrade e cancelamento implementadas.
- [ ] Checkout, Customer Portal e invoices validados em Stripe Test Mode.
- [ ] Webhooks Stripe com assinatura e idempotência persistida.
- [ ] Entitlements internos aplicados pelo backend.
- [ ] Test mode/live mode separados e visíveis para operação.

## Operação e suporte

- [ ] Canal e processo de suporte definidos.
- [ ] Monitoramento de erros, filas, billing e integrações ativo.
- [ ] Procedimento de incidentes e Kill Switch testado.
- [ ] Backup e restore do PostgreSQL testados.
- [ ] Retenção, exclusão de dados e exclusão de conta implementadas.

## Comunicação e conformidade

- [ ] Política de privacidade revisada.
- [ ] Termos de uso revisados.
- [ ] Aviso de riscos de trading revisado.
- [ ] Política de retenção e tratamento de dados revisada.

Políticas, termos, disclaimers e retenção exigem validação jurídica/comercial;
este documento não constitui aconselhamento jurídico.

## Gates técnicos

- [ ] Gate A — Authentication aprovado.
- [ ] Gate B — Paper Trading E2E aprovado.
- [ ] Gate C — Binance Spot Testnet aprovado.
- [ ] Gate D — Stripe Test Mode aprovado.
- [ ] Gate E — Production Security aprovado.
- [ ] Gate F — Piloto controlado autorizado explicitamente pelo proprietário.

## Restrições atuais

- Stripe Live permanece desabilitado.
- Binance Production permanece desabilitada.
- Não cobrar usuários nem executar ordens reais antes da aprovação de todos os gates.
