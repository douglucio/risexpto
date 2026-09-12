# ADR-025 — Portfolio Risk State

Every Paper proposal passes Trader Risk, then connection/portfolio risk, then
execution. Portfolio risk aggregates only the same user-scoped Paper Portfolio
and connection, including hard allocation, live exposure, daily realized loss
and the kill switch. A zero Live available balance is unknown and never means
infinite; Live remains disabled until provider balance synchronization exists.

