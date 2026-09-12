# ADR-022 — User-Scoped Paper Portfolio

`PaperGlobalCapitalAllocation` is retained for historical compatibility only.
Runtime V2 uses `PaperPortfolio`, unique by user/provider/base currency. A Paper
portfolio owns its balance and hard allocations, so one user can never reserve
another user's simulated capital. The default local Paper seed is 10,000 USDT;
this is configuration data, not a Live balance.

