# ADR-018: Trader Risk before Portfolio Risk

- Status: Accepted

## Decision

Every proposal passes Trader Risk, then Connection/Portfolio Risk, then Execution. A kill switch, account exposure limit or account daily-loss limit rejects before an adapter can submit an order.
