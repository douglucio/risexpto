# ADR-028 — Risk Decision Severity

Risk decisions expose `ALLOW`, `SKIP`, or `PAUSE` in addition to the persisted
approved/rejected compatibility field. Cooldown, trade limits, temporary
balance constraints, market conditions and projected exposure are skips;
daily loss, drawdown, kill switch and disabled connection are pauses. A skip
does not change the trader lifecycle status.
