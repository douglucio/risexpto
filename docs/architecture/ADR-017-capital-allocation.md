# ADR-017: Hard Trader Instance capital allocation

- Status: Accepted

## Decision

Capital is reserved transactionally at the connection/portfolio boundary and at the individual Paper reservation boundary. A conditional update or row lock must reject over-allocation; a second Trader Instance cannot spend another instance’s allocation.

## Consequences

The system keeps user-owned exchange balances outside custody while persisting allocation and reservations as authoritative controls. Reconciliation releases orphaned reservations.
