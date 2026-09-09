# ADR-014 — Public and authenticated routing

## Status

Accepted.

## Decision

`/` is always the public marketing site. `/login` and `/auth/*` are public authentication routes. `/dashboard` and domain routes are authenticated; `/admin` additionally requires `ADMIN` in both the server proxy and the page boundary. OIDC `returnTo` accepts only same-origin relative paths and defaults to `/dashboard`.

The Web BFF reads the sealed session and forwards only the current access token to NestJS. It never accepts a client-supplied bearer token as an override.

## Consequences

Visitors can inspect the landing page even when logged in. Successful login opens the authenticated workspace, while logout returns to the public landing page. Server-side route protection remains independent of navigation visibility.
# ADR-014: Routing and authentication boundaries

## Decision

The Web proxy owns one explicit path policy. `/`, `/login`, `/auth/*`, assets, and `/api/public/*` are public. Application APIs and workspace pages require the sealed session; `/admin/*` additionally requires the `ADMIN` role. Public API handlers must also declare their own public contract (for example Nest `@Public`), so middleware and application authorization agree.

## Consequences

Anonymous pricing and marketing pages never redirect to login. A missing anonymous session is normal on public pages, while authenticated BFF requests still refresh and forward the access token. New public endpoints must be added to the policy and covered by an anonymous HTTP test.
