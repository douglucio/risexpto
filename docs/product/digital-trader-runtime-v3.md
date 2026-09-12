# Digital Trader Runtime V3

Runtime V3 makes the four Crypto Spot Digital Traders operationally explicit:
each instance has an evaluation cadence independent of its strategy parameters
and a market-data timeframe independent of that cadence.

Initial execution profiles are:

| Trader | Evaluation | Timeframe | History |
|---|---:|---|---:|
| Atlas | 30s | 1m | 60 |
| Luna | 60s | 15m | 120 |
| DCA One | 24h | 1h | 30 |
| Pulse | 30s | 5m | 120 |

These are Paper defaults and are persisted on each Trader Instance. They are
operational defaults, not a promise that a future provider will support the
same cadence. Strategy-specific intervals such as DCA purchase spacing remain
inside strategy parameters and do not control scheduler discovery.

The V3 readiness gate continues to prohibit Binance Production, Stripe Live,
and all real-money providers.
