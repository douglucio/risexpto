# ADR-015 — Access token identity claims for the MVP

## Status

Accepted — 2026-09-10

## Context

The API provisions a local user from the Keycloak `sub` and currently uses the
verified e-mail as the application identity contact. A manual browser run showed
valid signature, issuer and audience but a `CLAIMS` rejection, so the effective
realm configuration must be observable without logging token contents.

## Decision

For the MVP, Keycloak Access Tokens must contain `sub`, `email` and
`email_verified`. The API remains primarily keyed by `sub`, but rejects a token
without a usable e-mail until an alternative trusted attribute source is
implemented. Token diagnostics expose only claim presence and safe metadata.
Token kind is inferred from `typ` when available and from audience/authorized
party as a fallback; `typ` alone is not authorization evidence.

## Consequences

Realm client scopes and the running realm must be reconciled before authenticated
API testing. Missing e-mail is an operational configuration failure, not a reason
to weaken signature, issuer, audience or verification checks.

The local review(6) runtime proved that a custom `openid` scope without the
`oidc-sub-mapper` can emit `email` and the API audience while omitting `sub`.
The versioned realm therefore declares the subject mapper explicitly, and
`pnpm keycloak:reconcile` applies it to an existing development realm.

## Risks

User e-mail changes and privacy policy remain identity-provider concerns. A future
option may provision by `sub` and obtain contact data from a separately trusted
source, but that is outside the MVP.
