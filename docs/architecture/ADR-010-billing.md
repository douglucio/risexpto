# ADR-010 — Billing desacoplado do core de trading

Stripe é o provedor oficial, mas o core usa apenas `BillingProvider` e entitlements internos. Webhooks são autenticados e idempotentes; estados `PAST_DUE` podem manter acesso durante grace period. A implementação inicial usa mock seguro para testes, sem secrets reais.
