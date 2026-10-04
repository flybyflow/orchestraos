# SnapEat: New Mockups + User Test Review

- **Requested by:** operator, via gm (msg_ba3fa84f_11870442) — design + CEO
  review of two new mockup files and two Userbrain usability tests, "simple
  terms, easy to digest, with visuals."
- **What was reviewed:** two HTML comparison mockups (8 screens each, "light
  flow" + a before/after against the live MVP at snapeat.siliconjungle.io),
  and both Userbrain test recordings, watched directly rather than taken on
  a secondhand summary.
- **Checked against:** the project's own `DESIGN.md` and decision history
  (iterations 1–3), not the mockups in isolation — per the operator's own
  framing, "the htmls are just a reference," not the design system itself.

## The one-line verdict

**Good bones, one real color mismatch, one real usability failure, and one
open product question that shouldn't get decided by accident.** None of it
is a redo — all four things are fixable in the next pass.

## 1. What the new mockups get right

- **Typography and structure match the design system exactly.** Source
  Serif 4 for headings, Source Sans 3 for body, IBM Plex Mono for the small
  mono labels ("SATURDAY," "15–20 MIN · SERVES 2") — all correct, all where
  the design system says they should be.
- **The effort selector is the time-labeled version, which is the current,
  correct decision.** The design system reversed from feeling-only labels
  ("Slammed / A little…") to time-labeled rows (15 / 30 / 45 / An hour+) on
  2026-10-01 after two testers couldn't parse the feeling version. The new
  mockup already reflects that — no regression here.
- **The recipe card ("Your Day" screen) matches the current spec:** one
  composed card, ingredients/method, a committed primary action ("I'll
  make this"), and two secondary alternatives underneath — this is exactly
  iteration 3's "tonight's recipe leads, choice is secondary" decision,
  correctly carried through.

## 2. What doesn't match the design system — needs a decision, not a guess

**The accent color is green, not terracotta.** The design system's
documented primary accent is `#B5563A` (terracotta), on a warm beige
background. Every screen in both new mockups uses a green accent
(`#1f7a4a`) on a similar beige. This is consistent throughout the mockup —
not a one-off slip — which reads like a deliberate choice by whoever built
it, not an accident. **This needs an explicit answer: is green the new
direction, or does it need to come back to terracotta before this becomes
the real build?** Left unanswered, whichever one ships first becomes the
de facto answer by default, not by decision.

**The Schedule screen now combines two things the design history treats as
alternatives, not partners.** The decision log shows two different intake
styles tried at different points: a free-text "conversational" note
(iteration 2) and a time-tap selector (iteration 3, current). The new
mockup's Schedule screen has both at once — a text box ("Back-to-back till
6, cooking for two tonight…") stacked above the four time-tap rows. That
might be the right call — the text box gives richness the tap-rows can't,
and the tap-rows give the fast default the text box can't — but it hasn't
been decided anywhere on record, and a hybrid of two things that were each
tried and reverted before deserves one explicit decision now, not silence
until someone builds it one way or the other.

**"Your Day" plans a whole day (breakfast, lunch, dinner), not "tonight's
one meal."** The product's own stated premise is "get ONE prescribed
dinner" — "zero decisions today," singular. The new mockup's "Your Day"
screen plans all three meals, with lunch and dinner as separate "tap to
plan" cards. This is either a real, deliberate widening of the product
(from "tonight's dinner" to "your whole day") or scope that crept in while
building a screen — worth naming plainly rather than letting it become the
build target by default just because it's the newest file.

## 3. The usability tests — watched directly, not summarized secondhand

Two real sessions, same script, different outcomes on one step:

| | Tester A (20:19) | Tester B (9:38) |
|---|---|---|
| Capture fridge ingredients | **Completed.** Ease: **5/5** | **Failed.** Ease: **3/5** |
| Confidence in the product overall | **5/5** | **5/5** |
| Written takeaway | "This is really amazing! I love this site for real!" — wants more specific clarifying questions during the fridge scan (what kind of meat, what kind of sauce) | Wants a shareable URL — "if you could send it via email" |

**The real finding: fridge capture is not uniformly broken, but it broke
for real for one of two testers, and that's exactly the step that matters
most — it's the one piece of information the whole product is built
around.** One clean pass and one outright task failure on the same step,
same script, is a coin flip nobody should accept before a wider test
round. This needs a real look before the next round of testing, not a
"keep in mind" note.

**The confidence score staying at 5/5 for both testers, even through
Tester B's failed step, is the most important number in this whole
review.** It means the core idea — "tell me what's in my fridge, you tell
me what to cook" — lands even when the mechanics wobble. That's the
product's actual strength, and it's evidence, not a hope.

**One concrete, cheap product idea came out of this for free:** Tester A
explicitly asked the scan step to ask about specifics it currently
doesn't — meat type, sauce type. That is a real, named gap in what the
fridge-scan extraction currently captures, worth a look regardless of
which platform this ships on next.

**Generation speed:** flagged by a separate written note (not visible in
either transcript's own numbers, but noted by whoever watched both
sessions) as something both testers felt was slow. Worth connecting
directly to an existing, already-logged risk: the Claude-call latency is a
backend property, not a UI one — see the iOS plan below for why this
matters regardless of which client calls it.

## 4. The three flagged edits, and the one bug

The "edits marked" version flags four spots with red badges. Three are
real, already-applied copy/sizing fixes (shortened copy on the Schedule
screen's subhead, a size-up on the "OR TAP ONE" label, a repositioned
instruction on the Scan screen) — nothing to decide, they're done. **The
fourth is explicitly marked "spacing error, not a design edit"** — a
visual bug near the Scan screen's camera button, not a decision anyone
made. That one's a bug ticket, not a design question.

## 5. Recommended next steps, in order

1. **Decide the color question** (terracotta vs. green) before anything
   else ships from this mockup — it touches every screen.
2. **Decide the Schedule-screen hybrid** (text note + time tap, both, or
   pick one) — a real product call, not a visual one.
3. **Name "Your Day" as a scope decision** (one dinner vs. a full day) to
   whoever owns the roadmap — don't let it ship by default.
4. **Look at the fridge-capture failure** before the next test round —
   one failure in two tests on the step the whole product depends on is
   worth real attention now, cheap to test, expensive to ignore.
5. Fix the one real spacing bug near the Scan screen's camera button.
6. Everything else in both mockups is ready to build from as-is.
