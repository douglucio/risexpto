# RiseXPTO Brand Reference Kit

Version 1.0 — provisional identity for the MVP.

## Brand idea

RiseXPTO is a calm, precise operating layer between a trader's intent and exchange execution. The identity combines an ascending path with connected decision points: growth produced by controlled automation, not speculation.

The symbol is an abstract `R` constructed from a continuous route and three nodes. The rising terminal stroke expresses progress; the ordered nodes express market data, risk validation, and execution. It intentionally avoids coins, candles, rockets, and gambling imagery.

## Personality and voice

- **Assured, not boastful:** explain safeguards and limitations plainly.
- **Quantitative, not cryptic:** prefer measurable facts over hype.
- **Calm under pressure:** concise status language, predictable hierarchy, restrained motion.
- **Transparent:** distinguish PAPER and LIVE everywhere and state risk explicitly.
- **International:** direct English is the primary product voice; translations preserve meaning rather than slang.

Never promise returns or describe a strategy as safe, infallible, or guaranteed. Prefer “automated execution with configurable risk controls.”

## Logo system

Source assets live in [`logo/`](./logo/):

- `risexpto-horizontal-dark.svg`: for light surfaces;
- `risexpto-horizontal-light.svg`: for dark surfaces;
- `risexpto-symbol-dark.svg` and `risexpto-symbol-light.svg`: compact marks;
- `favicon.svg`: browser icon with adaptive color scheme;
- `app-icon.svg`: square product/app icon.

Clear space is one node diameter around the symbol and half the symbol height around the horizontal lockup. Minimum sizes are 24 px for the symbol and 112 px wide for the lockup. Do not recolor individual nodes, skew, rotate, add glow, or place the mark on visually noisy backgrounds.

The SVGs are provisional and deliberately decoupled so a future commissioned mark can replace them without changing application layout or tokens.

## Color

The product uses deep navy neutrals and an electric indigo-blue accent. Green and red are semantic only.

| Role         |     Light |      Dark | Notes                              |
| ------------ | --------: | --------: | ---------------------------------- |
| Canvas       | `#F7F9FC` | `#080D18` | Primary background                 |
| Surface      | `#FFFFFF` | `#101827` | Cards and panels                   |
| Text         | `#101828` | `#F1F5F9` | Primary copy                       |
| Muted text   | `#526077` | `#9AA8BC` | Meets AA on its canvas             |
| Brand        | `#3657D6` | `#6F8CFF` | Actions, focus, active navigation  |
| Brand strong | `#263FA6` | `#9AADFF` | Hover/emphasis                     |
| Positive     | `#087A55` | `#38C793` | Gains and success only             |
| Negative     | `#C9364F` | `#FF667D` | Losses and destructive errors only |
| Warning      | `#A65F00` | `#F2B84B` | Risk warnings and attention        |

Never communicate P&L or risk using color alone; pair it with a sign, label, and where useful an icon. Core text/background pairs are selected for WCAG AA contrast. Component states must be rechecked when composed.

## Typography

The UI stack is `Inter Variable`, `Inter`, `ui-sans-serif`, `system-ui`, sans-serif. Inter is mature, compact, and legible in dense financial interfaces. Product builds may self-host the variable font; the system fallback prevents a remote font dependency.

- Display: 40/48, weight 650, tracking -0.025em.
- Heading 1: 32/40, weight 650.
- Heading 2: 24/32, weight 620.
- Heading 3: 20/28, weight 600.
- Body: 16/24, weight 400.
- Small: 14/20, weight 400.
- Caption: 12/16, weight 500.
- Label: 14/20, weight 600.

Financial values use tabular lining numerals: `font-variant-numeric: tabular-nums lining-nums`. Keep currency symbols visually subordinate where possible; never truncate a value without exposing the exact value accessibly.

## Layout and components

The 4 px spacing grid, radii, elevations, control sizes, breakpoints, layers, and motion values are canonical in [`tokens.css`](./tokens.css) and machine-readable in [`tokens.json`](./tokens.json). Applications must consume these token names rather than duplicating hex values.

Use generous negative space for marketing and compact-but-breathable density for data views. Default controls are 40 px high; critical trading actions must not be reduced below that. Charts use brand blue for neutral series and semantic colors only for explicitly positive/negative data.

## Motion and imagery

Motion confirms state; it does not decorate trading activity. Standard transitions are 160 ms, entrances 240 ms, with reduced-motion support mandatory. Avoid flashing values, neon bloom, market-floor photography, anonymous “hacker” screens, coins, and luxury clichés. Prefer clear product views, restrained grids, and abstract connected paths.

## Usage example

[`examples/brand-board.html`](./examples/brand-board.html) is a dependency-free reference board. It is documentation, not an application implementation.
