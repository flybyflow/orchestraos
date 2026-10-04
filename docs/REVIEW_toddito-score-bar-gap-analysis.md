# Toddito Score Bars: Gap Analysis vs. the 1987 Sample Report

- **Requested by:** operator, via gm (msg_ccf46175_35377507) — "look at this
  report sample and lets do a gap analysis... notice mainly how the scoring
  doesn't make sense - its hard to read and its not showing the middle line
  rather just showing a score but its more so of an orientation."
- **Compared:** the 1987 THOR-instrument reference sample
  (`file_35.docx` + its embedded charts) against the live report at
  `https://toddi.to/report/d7ef3729-aa6c-47c3-8b0b-55675fda8a4d`, captured
  fresh just now, not recalled.
- **Component found and read, not guessed at:**
  `src/components/report/DimensionBars.tsx` — confirmed as the single
  shared bar component behind BOTH the Leadership section ("Where the
  energy comes from") and the Strategy section ("How the company places
  its bets"). One fix here fixes both.

## The direct answer: the operator's diagnosis is exactly right, and it's one specific, fixable bug — the bar renders a bipolar orientation as if it were a unipolar progress score

The sample's chart and the live chart are drawing **the same kind of data**
(a score that runs between two named opposite poles, e.g. Internal ←→
External) using **two different visual languages**:

```
SAMPLE (file_38.png, the 1987 instrument's native chart):

  Long Term  |----------[=========]              |  Short Term
  Risk       |------[====]                       |  Predictability
  External   |  [===]                             |  Internal
             -10   -8  -6  -4  -2   0   2   4   6   8   10
                                     ^
                              CENTER / ZERO LINE, always visible

  Bar starts AT the center and extends LEFT or RIGHT depending on
  which pole the answer leans toward. Distance from center = strength
  of lean. Zero = true neutral, and you can SEE that it's zero.


LIVE (toddi.to, DimensionBars.tsx, confirmed by reading the source):

  ORIENTATION  [=======================         ]   5.0
               INTERNAL                   EXTERNAL

  Bar always starts at the LEFT EDGE (x=0) and fills toward the value,
  same as a loading bar or a completion percentage. There is no mark
  anywhere on the track for "neutral." A value of 5.0 — which IS dead
  center, true neutral, on this exact live report — looks like a
  generic "about half" bar. Nothing distinguishes it from "50% done."
```

This is confirmed directly from the component's own layout code
(`DimensionBars.tsx:120-123`):

```ts
xaxis: {
  ...SILENT_AXIS,   // no ticks, no gridlines, no axis numbers at all
  range: [0, 10],
},
```

and the value bar trace, which always starts its fill at `x: 0`
(`DimensionBars.tsx:92-104`) rather than at the scale's center. There is no
shape or annotation marking x=5 anywhere in the layout — I checked the full
`shapes` array (`DimensionBars.tsx:137-146`); it only draws the horizontal
row-separator hairlines, nothing vertical.

**Live proof, pulled from the actual report just now:** this specific
report's "Orientation" score is 5.0 — exactly, perfectly neutral between
Internal and External. On the live page it renders as an unremarkable
half-filled bar, visually indistinguishable from a score of, say, 4.0 or
6.0. That's the bug in one sentence: **the one score in this report that is
textbook-neutral is the score most likely to be misread as "meh, kind of
leaning one way," because nothing on the chart marks where neutral is.**

## Why this matters beyond "it looks different"

The underlying data really is bipolar, confirmed in the data layer, not
assumed from the chart alone. `src/lib/scoring/strategy-compat.ts` docs the
five Strategy dimensions as "the methodology's five bipolars," and
`STRATEGY_POLES` defines genuine opposite-pole pairs (Predictable ↔
Risk-seeking, Diversified ↔ Focused, etc.) on a 0–10 scale where 5 is
structurally the midpoint. Leadership's five dims (`ReportView.tsx:517-530`)
are the same shape — Demand↔Develop, Settle↔Push, Self↔Mission. The 1987
instrument this is derived from was built as a set of bipolar dimensions by
design (that's what the sample's own diverging-bar chart is for). Toddito's
current renderer discards that structure visually and shows only
"how full is the bar," which is exactly the operator's complaint: a bipolar
*orientation* rendered as a scalar *score*.

## The fix: make `DimensionBars.tsx` a true diverging bar, not a new component

Minimal, scoped change to the one shared file — no new design tokens, no
new component, reuses exactly what's already there:

1. **Recenter the data, don't just restyle the bar.** Plotly's own
   documented pattern for a diverging bar chart (confirmed against
   plotly.com/javascript/bar-charts, not just recalled) is to shift values
   into signed space around zero rather than hand-positioning a `base`:
   plot `x: value - 5` (so the 0–10 scale becomes -5…+5), set
   `xaxis.range: [-5, 5]`, and set `xaxis.zeroline: true` with a visible
   `zerolinecolor` (e.g. `T.ink500`). Plotly draws bars extending left for
   negative values and right for positive ones automatically — a value of
   2.0 (centered: -3) extends *left*; 8.0 (centered: +3) extends *right*;
   5.0 (centered: 0) draws **no bar at all**, which is correct — that's
   what true neutral should look like. This also means the zero-line *is*
   the middle line, built into the axis rather than a separately
   hand-drawn shape — one less thing to keep in sync.
2. **Keep the displayed number on the original 0–10 scale.** The chart's
   x-coordinates move to -5…+5, but the numeric readout annotation and the
   hover template should keep showing the raw stored value (`5.0`, not
   `0.0`) — same convention the sample uses (plain number next to the
   bar), and no change needed to the data layer or `STRATEGY_POLES`.
3. **The background track needs the same recentering, or it'll only cover
   half the new range.** The existing "track" trace
   (`DimensionBars.tsx:81-90`, the full-width `T.ink050` background bar)
   currently spans `x: 10` starting at the implicit base of 0. It needs to
   span the full new -5…+5 range too — set its `base: -5` with `x: 10`
   (width 10, running from -5 to +5) so the pale background still shows
   the complete track behind the now-centered value bar.
4. **Leave everything else alone.** Pole labels just move with the new
   x-range (x=-5 / x=+5 instead of x=0 / x=10) — same two annotations,
   same position logic, no new copy. Accent colors (`T.ink900` / `T.vital`)
   stay exactly as they are.

That's the whole change. No new colors, no new component, no rewrite of
Leadership or Strategy's data — just how the existing bar is drawn.

## One correction to the brief before this goes to build

gm's dispatch said to keep "the terracotta/existing design system." **Toddito
doesn't have a terracotta token** — I checked `PlotlyBase.tsx`'s actual
exported palette (`T.paper0/1/2`, `T.ink900` down to `T.ink050`, `T.pulse`
`#C42B1C`, `T.vital` `#1F4D3F`). Terracotta is SnapEat's accent color, a
different product's design system (see
[[project_snapeat-mockup-review-and-ios-plan]]). Likely a cross-wire from
reviewing both products in close succession. The fix above correctly uses
toddito's real tokens; flagging this now so a build agent doesn't go
hunting for a color that isn't in this repo.

## Other things noticed, as asked

- **Only 3 of the 4 referenced PNGs exist.** gm's message said "file_38.png
  and others... check for all 4 PNGs." The upload directory has exactly
  three: `file_36.png`, `file_37.png`, `file_38.png`. `file_38.png` is the
  sample's true diverging chart (the one that matters for this gap
  analysis); `file_36.png` and `file_37.png` turn out to be screenshots of
  the LIVE toddito report itself (Strategy and Leadership sections,
  respectively) — not two more samples. Worth knowing so nobody goes
  looking for a fourth reference image that was never delivered.
- **A third, inconsistent rendering of the same bipolar data exists further
  down the same report page.** Below the sections this review covers, the
  live report also shows a "THOR engine — deterministic scoring" panel
  (`ThorScoresPanel.tsx`) that re-renders Strategy's same five bipolar
  dimensions in a completely different visual language: a compact
  percentage bar (0–100%, "Higher % = closer to first pole"), no pole
  labels flanking the bar, mono-font grid layout, raw score shown small and
  off to the side. Once the fix above lands, the customer-facing bars above
  will show a correct diverging chart while THOR's bars below keep showing
  the old unipolar style for the *same underlying dimensions* — a visible
  inconsistency on one page. Gm's dispatch scoped this review to the
  customer-facing component, so I'm not proposing a fix here, just flagging
  it so the operator can decide whether THOR's panel needs the same
  treatment or is intentionally kept distinct as "the technical/debug view."

## What to tell the operator

The read was right: the bar is currently a progress-fill, not a diverging
chart, so a true-neutral score (this report has one — Orientation, 5.0)
looks exactly like a nondescript "about half" instead of looking like what
it actually is — dead center between two opposites. The fix is small and
contained to one shared component (`DimensionBars.tsx`), reuses toddito's
real design system (no terracotta — that's a different product), and fixes
both the Leadership and Strategy sections at once since they already share
this one chart component. One open item for the operator, not resolved
here: the THOR panel further down the same report renders the identical
Strategy dimensions in a third, still-inconsistent style — worth a decision
on whether that's in scope too.
