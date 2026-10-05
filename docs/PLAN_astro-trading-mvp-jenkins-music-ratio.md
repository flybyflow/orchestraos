# Astro-Trading Algo: MVP Plan — Jenkins' Musical-Ratio Method v1

- **Requested by:** operator, via gm (msg_af8f2b7c_99867919). bshr's
  strongest recommendation across the whole research arc.
- **Grounded in:** bshr's direct read of Jenkins' own book
  (`$ORCHESTRA_DIR/state/bshr/astro-trading-gann-jenkins-20261005/jenkins-geometry-study.md`,
  read in full — the actual primary source this time, not a secondary
  description) and the three signals already built and landed
  (`~/conductor/repos/astro-trading-backtest`, commits `7141ad2`
  Bradley, `ff226ef` Gann, `61909a6` Gartley) — read their actual results,
  not just scoped from memory, since this is the fourth signal and their
  real outcomes are useful context.

## The direct answer: the ratio itself really is parameter-free, and verified against the primary source for the first time — but the test design still needs two real pre-commitments gm's framing understates

bshr's formula confidence here is **higher than any of the prior three
signals**, for a specific reason: this is the first signal verified
directly against the actual book (bshr independently re-derived two
separate worked examples in Python and matched the printed results to
the penny / within 4 cents), rather than against a third-party GitHub
port whose own fidelity to the source was itself part of what needed
checking. The core formula — step a price by `×/÷ 1.05946` (2^(1/12),
one semitone) or `×/÷ 1.68179` (2^0.75, the 3/4-octave point) — is a
fixed mathematical constant with nothing to choose.

**But gm's framing ("no free parameters to pre-commit... that's it")
undersells the testing design, and gm's own point 2 actually says so in
the same message** — "the remaining design question is what 'reference
point' to project from and what counts as a 'hit.'" Those two things
*are* free parameters, just not in the formula — they're in how the
claim gets tested, the same category of decision Gann's pivot and
Gartley's PRZ tolerance were. The difference from Gann specifically is
real and worth stating precisely: Gann needed **one** global pivot
shared across the whole backtest (a true single point of subjectivity).
This signal's reference point question resolves cleanly without that
problem — see below — but "what counts as a hit" has no reference
implementation to defer to this time, which the prior three signals all
had. That's the one place this plan has to make a genuinely new call
rather than deferring to source code.

## The two formulas, and gm's point 4 (verify multiple worked examples) — already satisfied for this chapter specifically

bshr independently verified **two separate worked examples** in the
Music chapter (Ch. 9) before writing the recommendation: the 12-step
`/1.05946` octave table from the March 2000 S&P high (matched the book's
printed table to the penny at every step), and the `×1.68179` cross-check
from the October 1998 low to the March 2000 high (matched within 4
cents). **This already satisfies gm's point 4 instruction for this
specific chapter** — the internal inconsistency gm flagged (two slightly
different C values) was found in a *different* chapter (Ch. 7, the
Pythagorean triangle method), not in Ch. 9's music ratios, and isn't
being built here. Worth stating plainly so nobody assumes the
inconsistency applies to this signal when it doesn't.

## Reference point: reuse the existing swing detector at every swing, not one global pivot — this is what actually makes this cleaner than Gann

**Decision: apply the ratio-stepping formula from every swing high/low
detected by `turns.py`'s existing `peaks_and_troughs()`** (the same
function already reused for Gartley's X/A/B/C/D points, already
pre-committed at a 5-trading-day window) — not a single chosen "major"
pivot. This is the real reason bshr's "no pivot-selection judgment call"
characterization holds up: the reference point isn't one discretionary
choice, it's a mechanical rule (every detected swing qualifies) applied
uniformly across the whole dataset, structurally the same resolution
Gartley used for its own reference-point question. This directly answers
gm's point 2's first half.

## "What counts as a hit": the one place this plan makes its own call, with no reference code to defer to

No open-source reference implementation exists for this specific
technique (bshr found none, and didn't look for one — this was a direct
primary-source read, not a GitHub search). That means, for the first
time in this project, **there's no "reference code wins" escape hatch**
for the test-design choices below. Stating them plainly as this plan's
own modeling assumptions, not sourced from the book or any other
authority:

```
1. PRICE TOLERANCE BAND: a projected level counts as "hit" if any future
   daily Close trades within 1% of it. Proposed default, not derived
   from the book (its own worked examples match to the penny in
   hindsight, which isn't a usable forward-looking tolerance). 1% is a
   round, conventional support/resistance tolerance, stated here for the
   operator/gm to override if a different number is preferred -- this is
   exactly the kind of judgment call that would normally defer to
   reference code and can't here.

2. FORWARD TIME WINDOW: a hit must occur within 504 trading days (~2
   calendar years) of the reference point. Loosely motivated by the
   book's own longest verified example (923.32 -> 1552.83 took 17
   months) -- loosely, not rigorously, since one example doesn't justify
   a general window. Without SOME bound, "does this level ever get
   touched" approaches 100% for almost any level inside the historical
   price range, which would make the test meaningless.

3. DIRECTION: apply both ×/÷ symmetrically from every swing (step down
   AND up from both highs and lows), not cherry-picked per reference
   point after seeing which direction "worked" -- pre-committed before
   any result is examined, same discipline as all three prior signals.
```

## The claim shape is genuinely different from all three prior signals — a new scorer is needed, turns.py's existing one doesn't directly reuse

Bradley, Gann, and Gartley all answer the same question shape: **does a
signal predict WHEN (which date) a turn happens**, which is exactly what
`turns.py`'s `hit_rate_vs_chance()` was built to score (date-alignment,
±4 calendar days, chance baseline = random dates). **This signal asks a
different question: does a projected price LEVEL later get touched**
(price-dimension matching, not date-dimension). Confirmed by reading
`turns.py` fresh just now — nothing in it matches on price, only on
date. **New scorer needed: `level_hit_rate_vs_chance()`**, structurally
parallel to the existing one (same chance-baseline philosophy: compare
the real hit rate against many trials of similarly-spaced *random*
price levels, not real projected ones, from the same reference points
and the same forward window) but matching on price-within-tolerance
instead of date-within-tolerance. This is real new engineering, not a
drop-in reuse — correctly flagging this now rather than discovering it
mid-build.

## What's reusable vs. new

```
REUSABLE AS-IS:
  turns.py's peaks_and_troughs() -- reference-point source (new use,
               same function, same pre-committed window)
  prices.py -- no change
  stats.py  -- Layer 2 still uses total_return/sharpe/max_drawdown/win_rate
               unmodified if a trading rule is tested (see below)

NEW THIS SIGNAL:
  jenkins_music.py -- the ratio-stepping projection (×/÷ 1.05946 twelve
               times, ×/÷ 1.68179 once, from every swing point)
  turns.py: level_hit_rate_vs_chance() -- new function, price-matching
               chance-baseline scorer, parallel in spirit to the
               existing date-matching one but a genuinely new addition
               to the shared file, not a signal-specific module (this
               scorer shape is reusable by any future level-based
               signal, the same way the date scorer became reusable
               across Bradley/Gann/Gartley)

NOT NEEDED: ephemeris.py -- pure price ratios, same as Gann/Gartley.
```

## Layer 2 — flagging honestly that a trading rule here is a bigger interpretive leap than for the first three signals

Bradley/Gann/Gartley's Layer 2 was a natural extension of Layer 1 — a
predicted *turn* directly implies a position flip. **This signal's claim
is about a price *target/level*, not explicitly a reversal signal** — the
book's own framing is "the market tends to respect these levels," not
"trade a reversal when one is hit." A plausible Layer 2 candidate exists
(treat a projected level as support/resistance: go long approaching a
level from above within tolerance, short approaching from below) but
**this is this plan's own construction, not something the book
explicitly claims — stated honestly, not asserted as a faithful trading
interpretation of the source material.** Worth running since gm asked
for Layer 2 "if there's a sensible trading rule to test," but Layer 1
(the level-touch hit-rate claim) is the test that's actually faithful to
what Jenkins' chapter claims.

## Expectation — grounded in what's actually different here, not cheerleading because this is bshr's top pick

This has the best formula-confidence of any of the four signals (direct
primary-source verification, two independent worked examples, both
matched to the penny / within cents). **That's a statement about the
ratio being computed correctly, not a prediction about whether price
actually respects these levels at a rate above chance.** The two new
design choices above (tolerance band, forward window) are real places a
result could be an artifact of the chosen numbers rather than a genuine
finding — exactly the kind of risk the in-sample/out-of-sample split
caught for real in Gann's result (cleared chance in-sample, failed to
replicate out-of-sample). Same split required here, same skepticism
warranted, regardless of how clean the underlying formula is.

## Explicitly NOT in this plan

- **Ch. 7's Pythagorean triangle method** — bshr ranked it "moderately
  tractable," but it reintroduces Gann-style pivot subjectivity (which
  low-to-high impulse to measure from) and contains the one documented
  inconsistency in the book (two C values). Not this signal.
- **Arc/circle expansion, Speed Resistance Lines, Andrews Pitchforks** —
  bshr's own assessment: these depend on freehand visual judgment the
  book itself describes qualitatively; least tractable, not attempted.
- **The "Jenkins True Trend Line" / spreadsheet row-offset / NEM
  impulse-ratio examples (Ch. 12)** — the True Trend Line is confirmed
  (by bshr, arithmetic-checked) to be the same sqrt-plus-constant formula
  family as Gann's Square of Nine, already built and tested (`ff226ef`);
  not duplicated here. The other two are single, uncorroborated book
  examples without the Music chapter's double-verification.

## What to tell the operator

Fourth signal, bshr's strongest pick, and the first one verified directly
against the primary source rather than a third-party code port — real
basis for confidence in the formula itself. But "parameter-free" is true
of the ratio, not the full test design: two new judgment calls (1%
price tolerance, 2-year forward window) had to be made explicit since,
for the first time in this project, there's no reference implementation
to defer to — stated plainly as this plan's own proposed defaults, open
to the operator's override. The claim itself is also a different shape
than the first three signals (does a price get touched, not does a date
turn) and needs a genuinely new scorer, not a reuse of the existing one
— correctly scoped as real new work rather than assumed free. Same
in-sample/out-of-sample discipline applies regardless of how clean the
underlying math is, especially since Gann's own result already showed
exactly how an in-sample pass can look real and not survive the split.
