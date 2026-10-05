# Astro-Trading Algo: MVP Plan — Bradley Siderograph v1

- **Requested by:** operator, via gm (msg_e8e8856d_62612380) — turn bshr's
  methodology research into a concrete, scoped MVP plan. Research-only
  project: no live trading, no brokerage wiring, no real money, without
  the operator's separate sign-off.
- **Grounded in two things read directly, not summarized secondhand:**
  bshr's full research
  (`$ORCHESTRA_DIR/state/bshr/astro-trading-gann-jenkins-20261005/answer.md`)
  and builder-1's existing scaffold, already committed at
  `~/conductor/repos/astro-trading-backtest` (commit `6599d3a`) — read the
  actual source files, not the commit message.

## The direct answer: builder-1's scaffold is further along than "scaffolding" suggests — v1 is one new signal module plus two concrete gaps in the existing ephemeris code, not a from-scratch build

```
ALREADY REAL AND TESTED (don't rebuild):
  prices.py    -- real OHLCV via yfinance, local CSV cache
  ephemeris.py -- real planetary longitudes via skyfield + JPL DE421
                  (sun/moon/mercury/venus/mars/jupiter/saturn),
                  lunar phase angle, generic aspect() detector
  harness.py   -- no-lookahead backtest loop, signal plugs in as one function
  stats.py     -- total_return, sharpe, max_drawdown -- unit-tested
  signals.py   -- the interface: (date, price_row, astro_row) -> weight[-1,1]

MISSING, NEEDED FOR BRADLEY SPECIFICALLY (the real v1 work):
  ephemeris.py -- no Uranus/Neptune/Pluto (needed for the "Long Term"
                  outer-planet aspects), no declination function at all
                  (only longitude exists)
  signals.py   -- no real signal yet, only the always_long stub
  stats.py     -- no win_rate function yet
  (nothing)    -- no turn-event scorer at all (see below — this is a
                  different kind of test than the existing harness runs)
```

## The signal: Bradley Siderograph, and the one formula detail I caught that needs resolving against source, not guessing

bshr's summary said the declination component uses "Mercury/Venus
declination." I cross-checked this against multiple independent
descriptions of Bradley's actual 1948 formula before scoping the build, and
they consistently say **Mars and Venus**, not Mercury:

```
P = X(L + D) + M

  P = Sidereal Potential (the siderograph's output — a wavy line over time)
  L = Long Terms  -- aspects among the outer planets (Jupiter, Saturn,
                     Uranus, Neptune, Pluto), weighted 5x the middle terms
  D = Declination Factor -- half the algebraic sum of Mars's and Venus's
                     geocentric declination (north positive, south negative)
  M = Middle Terms -- aspects of Sun/Mercury/Venus/Mars against everything
  X = Long-term multiplier, traditionally 5
```

Five aspect types (conjunction/sextile/square/trine/opposition), each
scaled 0–10 by proximity to exact, sextiles/trines positive, squares/
oppositions negative, conjunctions using planet-pair-specific valencies
(conjunction with Mars/Saturn/Pluto reads differently than with Jupiter/
Venus) — 36 aspects total in Bradley's own tables.

**This is a real discrepancy between bshr's summary and the primary
formula, not a nitpick** — Mercury and Mars are different planets with
different cycles, and getting this wrong silently produces a different
(wrong) indicator that still runs and still produces plausible-looking
output. **Don't resolve this by picking one in the plan** — resolve it by
building directly against `NQevxvEtg/Bradley-Siderograph` (the open AGPL
reference implementation bshr already found) as the source of truth for
the exact body list and weight table, and unit-test the from-scratch port
against its output on a handful of known dates before trusting it on 80
years of history. This also answers "is the orb/valency table worth
hand-deriving from secondary sources" — no, port it from working code.

## Concrete build scope

1. **`ephemeris.py`:** add `uranus`, `neptune`, `pluto` to `BODIES`; add a
   `declination(date, body)` function alongside the existing `longitude()`
   (skyfield's `ecliptic_latlon()` call already returns what's needed to
   derive this — it's the same astrometric object, a different accessor,
   not a new data source).
2. **New `bradley.py` signal module:** port the P = X(L+D)+M formula and
   its aspect/valency tables from the reference repo, expose it as a
   `SignalFn` matching the existing interface in `signals.py`. The raw
   Siderograph is a continuous value, not a position weight — v1 needs a
   simple, pre-committed rule to turn "Siderograph changed direction" into
   a turn event (see below) and that event into a position (flip to
   opposite exposure at each turn, flat between — pre-commit this rule
   before looking at any results, same discipline bshr flagged for Gann's
   pivot-selection problem).
3. **New turn-event scorer (not the existing harness — a different test):**
   the actual falsifiable claim is "a Bradley turn predicts a real price
   turn within ±4 calendar days," which is a date-alignment/hit-rate
   question, not a returns-stream question. Needs: (a) a plain, pre-defined
   "real price turn" detector (e.g. a local extremum over an N-day window —
   pick N once, before looking at results), (b) a scorer that checks, for
   every Siderograph-predicted turn, whether a real price turn landed
   within ±4 days, reporting a hit rate against the base rate a random date
   would get by chance (not just a raw percentage, which is meaningless
   without the chance baseline).
4. **`stats.py`:** add `win_rate` (fraction of trades/days with positive
   strategy return) — the one metric gm asked for that doesn't exist yet.

## Success metrics — two layers, because this claim has two different shapes

```
LAYER 1 -- the actual claim (event-based, the falsifiable thing itself)
  Does a Bradley turn predict a real price turn within +/-4 days,
  at a rate better than chance?
  -> hit rate vs. random-date baseline, in-sample AND out-of-sample

LAYER 2 -- what gm asked for explicitly (returns-based, uses the
           existing harness as-is once Layer 1's turn events feed a
           simple position rule)
  Sharpe ratio, max drawdown, win rate, vs. plain buy-and-hold
  -> this is what harness.py + stats.py already compute; just needs
     Bradley's turn-following position rule as the signal_fn
```

Both layers get the in-sample/out-of-sample split from day one — not an
afterthought. `anki1007/astro`'s own honestly-reported result (in-sample
signal that collapsed to noise out-of-sample) is the standard bshr named
to hold this to, and I'm holding the plan to the same bar: report whatever
the out-of-sample number actually says, including if it's nothing.

## A data-depth check I ran, not assumed: "80+ years of history" is only true for one of the three default instruments

bshr's research describes Bradley as scoreable against "80+ years of real
price history." I checked what's actually available through the scaffold's
existing `prices.py` (yfinance) for its three default tickers:

```
^GSPC   (SPX)      1927-2026   ~99 years   <- the real 80+ year depth
GC=F    (gold)     2000-2026   ~26 years
EURUSD=X (EUR/USD) 2003-2026   ~23 years
```

Gold futures and EUR/USD on Yahoo simply don't go back that far — that's a
data-provider limit, not a scaffold bug. **Recommendation: SPX is the
primary instrument for Layer 1's turn-hit-rate claim**, since it's the only
one of the three with enough history for the count of Bradley turns to be
statistically meaningful. Gold and EUR/USD are still fine as secondary
Layer-2 return-stream comparisons (more data = always better, but a
shorter window isn't disqualifying there the way it is for counting rare
turn events).

## Explicitly NOT v1 — deferred, per bshr's own tractability ranking

- **Gann Square of Nine / Gann angles** — doable later, but the
  pivot-selection step is subjective and must be pre-committed before any
  results are looked at, or it isn't a real backtest.
- **Jenkins' full method** (horoscope degrees, eclipses) — proprietary, no
  open digitization, most subjective. Only worth it if Bradley (or the
  plain aspect-correlation approach, the planned v2) shows something real
  first.
- **"ipcycle kokoros algorythm"** — bshr could not identify this with
  confidence after a real search pass. Not blocking v1. Needs a direct
  follow-up with the operator ("what book/video/person were you
  referencing?") rather than a guessed match.
- **The Jesse ML crypto strategy** — useful to study as a reference
  implementation, not to trust; no visible out-of-sample validation in
  that repo.

## Scope boundary, restated plainly

Research and backtesting only. No live trading, no brokerage API, no real
money — already true of builder-1's scaffold (confirmed in its own
README) and this plan doesn't change that. `pyswisseph`'s AGPL licensing
caveat bshr flagged doesn't even apply here: the scaffold already uses
`skyfield` + JPL's DE421 (MIT-licensed library, public-domain NASA data),
which sidesteps that licensing question entirely for this repo.

## What to tell the operator

v1 is Bradley Siderograph, the most mechanical and falsifiable of the
methods bshr found — one new signal module plus two small, concrete gaps
in ephemeris data (outer planets, declination) on top of a backtest
harness that already works end-to-end. One real correction caught before
build started: the declination component is Mars+Venus, not Mercury+Venus
as summarized — resolving that against the open reference implementation
rather than guessing. The test has two parts: does a predicted turn
actually land near a real price turn (the literal claim, scored against
chance), and separately, does following those turns beat buy-and-hold on
risk-adjusted terms (Sharpe/drawdown/win-rate, what you'd expect from a
trading backtest). SPX is the right primary instrument since it's the only
one of the three already-wired tickers with real 80-year depth — gold and
EUR/USD top out around 25 years. Everything here stays in the research
repo, no live trading wiring, same boundary the operator already set.
