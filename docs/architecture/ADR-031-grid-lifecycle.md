# ADR-031 — Atlas Grid Lifecycle

Atlas determines BUY/SELL from price relative to a reference price, not level
index parity. Grid levels are persisted and selected only while open. A sell
is capped by that level's quote allocation and current inventory. Invalid
generic defaults are replaced by a range around the current market price,
scaled by risk preset. Grid behavior remains Paper-only in this rodada.
