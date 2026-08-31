# ADR-003: Keycloak OIDC with a web BFF session

- Status: Accepted
- Date: 2026-08-30

## Context

RiseXPTO needs international signup, verified identities, password recovery, secure browser sessions, refresh, and role enforcement across Next.js and NestJS. Browser code must not become an authorization authority or expose refresh tokens.

## Options considered

1. Keycloak using Authorization Code with PKCE and a Next.js backend-for-frontend (BFF).
2. Auth.js v4 with a Keycloak provider.
3. Locally managed passwords and JWTs.

## Decision

Use Keycloak as the identity provider and OAuth 2.0/OIDC Authorization Code with PKCE. Next.js route handlers act as the BFF: they own state and verifier transactions, exchange codes server-side, and keep encrypted token material in `HttpOnly`, `Secure`, `SameSite=Lax` cookies. The NestJS API independently validates access-token issuer, audience, signature, time claims, and realm roles against Keycloak JWKS.

The initial roles are `USER`, `SUPPORT`, and `ADMIN`. UI checks improve navigation only; API guards remain authoritative. Locale, timezone, and reference currency use typed session preferences until the durable user profile is introduced by Feature 05.

## Rationale

This retains mature identity lifecycle features without storing passwords in RiseXPTO. A BFF prevents refresh tokens from entering browser JavaScript and avoids adopting the stable-but-aging Auth.js v4 session surface merely to bridge OIDC.

## Consequences

- Login, registration, email verification, and password recovery screens are Keycloak-hosted and branded separately.
- Web sessions require a 32-byte-or-longer encryption secret and HTTPS in production.
- API authorization does not trust web cookies or Keycloak UI state.
- Profile preferences move from the encrypted session to PostgreSQL in Feature 05 without changing their public contract.

## Risks

Cookie size, key rotation, provider downtime, clock skew, and refresh-token reuse require explicit handling. Production must use managed secrets, TLS, a persistent Keycloak database, SMTP, restricted redirect URIs, and reviewed realm changes. No authentication fallback may silently grant access.
