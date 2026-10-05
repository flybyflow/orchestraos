# SPEC — pre-committing the forward scoring window for Jenkins' Secret Angle

**Status:** revision 1, awaiting review. **Nothing is built against this yet.**
**Scope:** the scoring window ONLY. The replacement null is deliberately out of
scope and must not be built until this document is reviewed and fixed.

---

## 1. Why this document exists before any code

`jenkins_secret_angle` is one of two signals in this project with no valid
measurement. It has two independent defects:

1. **The scored window is self-referential.** `find_impulses` derives each
   impulse's angle from `close[d1]`, the price *at the peak*, and the scored
   window is `[origin+1, origin+duration]` — which *ends on that same bar*.
   Verified: all 1226 impulses have `origin+duration` equal to the
   slope-defining peak. The line under test is built from the endpoint of the
   window it is tested over.
2. **The null is the exact identity.** `sloped_line_hit_rate_vs_chance`
   stratifies on `angle_deg` and shuffles `slope = tan(radians(angle_deg /
   fraction))`, a deterministic monotone function of the key. On real SPX:
   `chance_mean == hit_rate` to sixteen digits, `chance_std == 0.0`.

Defect 2 has a known repair (randomise the *fraction*, which is a genuine free
parameter and is **not** monotone in touch rate — unlike `crossing_`'s
exponent, which is why that signal stays unmeasured). But the repair is
worthless until defect 1 is fixed, because a valid null over an invalid window
measures nothing.

Fixing defect 1 means choosing a forward window, and **window length
monotonically inflates the touch rate** — more days, more chances to touch. It
is therefore a free parameter of exactly the kind this project has been burned
by. The Gartley correction records the same failure: a post-hoc 20-day horizon
where "every instrument clears p95 at *some* horizon". So the window is
pre-committed here, in writing, before it is scored.

---

## 2. DISCLOSURE — I have already seen one configuration

This is the part that most needs review, and it is stated first rather than
buried.

While diagnosing whether a valid null was even possible for this signal, I ran
the forward-corrected touch rate across sub-angle fractions, using:

- start = `origin + duration + PRICE_TURN_WINDOW + 1`
- length = the impulse's own `duration`

and obtained, for fractions 1/1.5, 1/2, 1/3, 1/4, 1/6, 1/8, 1/12, 1/20:

```
0.2751, 0.3151, 0.3233, 0.3167, 0.3029, 0.2890, 0.2857, 0.2800
```

**The maximum sits at 1/3, which is the signal's own declared primary
fraction.** I do not believe this is a finding, for four reasons already
recorded: the peak is not separated from its neighbours (1/3 vs 1/2 is +0.62
binomial SD, vs 1/4 is +0.50); "the max of 8 values landed on the one we care
about" is a p=0.125 statistic, identical in shape to a result already withdrawn
from this project for failing to replicate; the window was chosen by me after
the original was known broken; and it is full-history with no split.

**The consequence for this spec is not rhetorical.** I can no longer claim the
window was chosen blind. Section 3 is written to make the headline
configuration one I have *not* observed, and section 6 states what I will not
compute before review.

---

## 3. The pre-commitment

### 3.1 Window start — FORCED, not chosen

```
start = origin_pos + duration + PRICE_TURN_WINDOW + 1
```

`peaks_and_troughs` is a **centered** window of `PRICE_TURN_WINDOW = 5`, so the
peak at `origin_pos + duration` is not identifiable until bar
`origin_pos + duration + 5`. Scoring may begin on the first bar strictly after
that. This is the same `knowable_lag` rule already applied to `gartley`,
`jenkins_music` and `jenkins_triangle` in this repo; it is a correctness
constraint, not a tuning knob, and there is no freedom in it.

### 3.2 Window length — CHOSEN, and this is the real commitment

```
length = 20 trading days   (fixed, identical for every impulse)
```

Three grounds, in order of weight:

1. **It reuses an existing pre-commitment rather than inventing one.** This
   project already fixed 20 trading days for Gartley's forward horizon, on the
   stated ground that it is roughly one trading month and a horizon a
   discretionary trader could actually hold. Reusing a constant already
   committed to elsewhere in the same codebase is stronger than minting a new
   one here, because it cannot have been selected for this signal's benefit.
2. **It is NOT the configuration I observed.** Section 2's curve used
   `length = duration`. Fixing a constant length makes the headline
   configuration one whose numbers I have never seen. This is the main reason
   to prefer it over the self-scaling alternative.
3. **It decouples the window from the impulse geometry.** `duration` also sets
   the angle, and through it the slope under test. Scoring over `duration`
   would make the window a function of the same quantity the hypothesis is
   about — a mild self-reference, and this signal already failed once on
   exactly that pattern. A constant has no such coupling. It also avoids the
   degenerate short cases: median duration is 7 trading days, p25 is 5, and the
   minimum is 1, so a duration-scaled window is frequently *shorter than the
   knowability lag it sits behind*.

Cost, stated plainly: a fixed 20 days is generous for a 1-day impulse and
stingy for a 48-day one. That is a real objection and it is the strongest
argument for the `duration` alternative. It is accepted because contamination
avoidance (ground 2) and self-reference avoidance (ground 3) matter more here
than per-impulse proportionality — and because the sensitivity curve in §4
makes the cost visible rather than hidden.

### 3.3 Everything else held fixed

Impulse detection, origins, durations, angles and the touch test itself are
unchanged. The touch test stays `Low[d] <= line_value[d] <= High[d]` — already
parameter-free, no tolerance band to tune.

---

## 4. Mandatory reporting, not optional

Because window length monotonically inflates the statistic, the runner **must**
print the full sensitivity curve beside the headline, following the precedent
`run_gartley.py` set:

- touch rate at lengths 5, 10, **20**, 40, 60 trading days, with n at each
  point (n changes along the curve as impulses run off the end of the series);
- the headline length marked;
- both the in-sample and out-of-sample figure for every point.

If the verdict flips across that curve, the correct writeup is "horizon-
sensitive, no stable verdict", exactly as Gartley's was — not the one value
that reads best.

---

## 5. Split, and what actually carries the weight

The pre-committed split for this project is `2001-01-01`, in-sample before,
out-of-sample after. It applies unchanged.

Because of §2, my own blindness is no longer available as a guarantee. The
split therefore has to carry weight it would not normally have to carry
alone. Concretely:

- The **out-of-sample** cell is the result. An in-sample-only effect is not a
  finding here, and given the disclosure it is worth less than it usually
  would be.
- If 1/3 leads in-sample but not out-of-sample, that is a negative result and
  must be written as one, not as "promising in-sample".

**A reviewer is entitled to conclude the contamination is not recoverable** —
that having seen a 1/3 peak at one window, no window choice I make is
trustworthy for this particular hypothesis. That is a legitimate verdict and
the honest outcome in that case is that the signal stays **unmeasured**, which
is where it already sits. I would rather be told that than talk my way past it.

---

## 6. What I have deliberately NOT computed

I have **not** run the touch rate at `length = 20`, for any fraction, in-sample
or out. Doing so before this document is fixed would defeat its purpose and
reproduce the defect it exists to prevent. The numbers in §2 are the only
forward-window figures I have seen, and they are from a different
configuration.

---

## 7. Out of scope

The fraction-randomising construction null. It is the obvious next step and it
has a working precedent in `jenkins_triangle.per_ratio_hit_rate_vs_construction_chance`,
but it must not be built until this window is reviewed and fixed. Building both
at once is how a window gets quietly tuned to suit a null.

---

## 8. What review should decide

1. Is the forced start (§3.1) right, or is there an argument for a later one?
2. Is fixed-20 the right length, or does the proportionality objection in §3.2
   outweigh the contamination and self-reference grounds?
3. **Is the §2 contamination recoverable at all**, or does this signal stay
   unmeasured? This is the one that actually matters.
4. Is the §4 sensitivity reporting sufficient to keep the length honest?
