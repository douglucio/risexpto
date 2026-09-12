# ADR-020: AI credit ledger foundation

- Status: Accepted

## Decision

Persist credit ledger entries by user and bucket. Subscription credits are consumed before purchased credits; subscription renewal replaces the subscription bucket and purchased credits remain. The ledger is not an execution authorization mechanism and has no LLM dependency.
