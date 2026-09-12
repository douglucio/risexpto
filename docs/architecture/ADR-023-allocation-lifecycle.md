# ADR-023 — Idempotent Allocation Lifecycle

Hard allocation belongs to a Trader Instance and is separate from short-lived
order reservations. RUNNING activates it once; PAUSED keeps it active; resume
does not add capital; STOPPED/ARCHIVED releases it once. Reservation rows are
the only temporary execution locks and are consumed or released transactionally.

