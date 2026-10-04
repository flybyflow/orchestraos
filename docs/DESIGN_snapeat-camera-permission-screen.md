# SnapEat: Camera Permission Screen — A Real Designed Moment

- **Requested by:** operator, via gm (msg_b912f356_14565717) — redesign the
  photo-capture/permission moment as "a nice permission screen," not a
  bare OS dialog. **Fast-tracked:** builder-2 is building the camera
  mechanics now and holding only on this UI — this is written to unblock
  them, not to sit as a research doc.
- **Color, resolved:** green in the prior mockups was a testing/gesture-
  capture overlay tool, not a real direction. This uses the documented
  terracotta system (`#B5563A` accent, warm beige), per `DESIGN.md`.

## One correction before the design, because it changes how urgent the
underlying problem actually is

I went back and read the full spoken transcript of the tester who failed
this step (not just the task/rating overlay I'd summarized before). The
tester's own words: *"it seems like it cannot scan it within user brain
recorder... Maybe because it's inside the application, it's not letting
me actually open my camera roll."* **The most likely explanation is that
Userbrain's own test-recording sandbox blocked camera access, not that
SnapEat's permission flow itself is broken.** The tester then typed their
ingredients instead ("rice, eggs, tomato"), continued through the entire
rest of the flow enthusiastically, and ended at 5/5 confidence.

This doesn't make the redesign unnecessary — it changes *why* it matters.
The real lesson isn't "fix a broken permission flow," it's **"a real user
will hit this exact fork (camera denied, unavailable, or just not wanted
right now) for real reasons, and the graceful fallback already exists in
the product — the permission moment just needs to point at it instead of
dead-ending."** That's a materially different, and honestly better, design
brief than "fix what's broken."

## The moment, end to end

```
[Scan tap] ──▶ [PRIMING SCREEN, this doc] ──▶ [OS permission dialog]
                                                       │
                                    ┌──────────────────┴──────────────────┐
                                    ▼                                     ▼
                               Allow → camera opens                  Don't Allow
                                                                            │
                                                                            ▼
                                                        Falls straight to "Type it
                                                        instead" — already built,
                                                        not a dead end.
```

Two things make this "a real designed moment" instead of a bare dialog:
(1) the priming screen explains the *why*, in the app's own voice, before
the system asks; (2) the fallback is visible and warm, not a retry loop —
so declining doesn't feel like failing.

## The priming screen (the part DESIGN.md requires and the old flow skips)

`DESIGN.md`'s own native adaptation spec already requires this: *"Permission
prompts are primed in-context, never cold at launch."* This screen is that
prime — it appears the instant the user taps to scan, replacing the raw
system prompt as the first thing they see.

```
┌─────────────────────────────────┐
│  ×                              │  ← dismiss (top-right, 44×44pt,
│                                  │     ink-soft) — closing this returns
│                                  │     to Schedule, not an error state
│         🥘  (one warm,          │
│          functional icon —      │
│          no stock photography)  │
│                                  │
│   Let's see what you've got     │  ← Source Serif 4, 600, ~28px
│                                  │     (same scale as other screen
│                                  │     h1s — this is a screen, not
│                                  │     a modal interruption)
│                                  │
│   One photo of your open        │  ← Source Sans 3, 400, 15px,
│   fridge is all it takes.       │     ink-soft — same body style
│   We only look at what's        │     as every other screen's
│   there — nothing is saved      │     subhead copy
│   or shared.                    │
│                                  │
│  ┌────────────────────────────┐ │
│  │     Open camera      →     │ │  ← primary, 56px, terracotta fill,
│  └────────────────────────────┘ │     triggers the OS dialog
│                                  │
│      Type it in instead         │  ← secondary, text-only link,
│                                  │     ink-soft, same weight as the
│                                  │     existing "Type it instead"
│                                  │     link on the Scan screen —
│                                  │     same escape hatch, just
│                                  │     offered BEFORE the camera
│                                  │     question instead of only
│                                  │     after it fails
└─────────────────────────────────┘
```

**Why "nothing is saved or shared" is in the copy, not just nice-to-have:**
camera permission requests are the single most common point where a user
hesitates on any app, and this product's actual data story is genuinely
reassuring (a processed ingredient list, not a stored photo) — saying so
plainly, in the moment it's actually relevant, is the real content of
"priming," not just a friendlier headline.

**Why the secondary action is here, not just after a failure:** this is
the direct fix for what both this redesign and the usability finding are
actually about — a user who doesn't want to grant camera access (for any
reason, including the one the test session hit) sees the alternative
*before* making a decision, not as a consolation prize after declining.

## The system dialog copy (the one piece of UI we don't draw, but do write)

iOS only shows the `Info.plist` `NSCameraUsageDescription` string in the
native dialog — no custom layout is possible there, so the string is the
entire design surface. Default/generic text ("App would like to access
your camera") is explicitly what `DESIGN.md` says not to ship.

> **`NSCameraUsageDescription`:** "SnapEat uses your camera to see what's
> in your fridge and suggest something to cook — nothing is stored or
> shared."

Matches the priming screen's own promise exactly, so there's no gap
between what the app said and what the system repeats back.

## On decline: the fallback, not a dead end

If the system dialog returns "don't allow," skip straight to the existing
Ingredients screen with "Type it instead" already active — no error
state, no "camera access required" wall, no second ask this session. The
product already has a complete, tested path that doesn't need a camera;
this redesign's whole job is making sure declining (for any reason) routes
there immediately instead of stalling.

## What's deliberately NOT in this screen

The usability test also surfaced a real, separate idea — one tester
wanted the scan step to ask clarifying questions (what kind of meat, what
kind of sauce). That's a genuinely good idea, but it belongs to the
**Ingredient Review** screen (after a successful scan, confirming what
was seen), not the **permission** moment (before the camera even opens).
Flagging the pairing per gm's instruction, not forcing it in — these are
two different moments solving two different problems.

## For builder-2, concretely

- New screen, inserted between the Scan-tap action and the native
  `AVCaptureDevice` permission request — not a modal over the existing
  Scan screen, a real screen (matches "this is a screen, not an
  interruption" in the mock above).
- `Info.plist` → `NSCameraUsageDescription` = the string above, verbatim.
- Decline path routes directly to the existing Ingredients
  screen/"Type it instead" flow — reuse what's already built, don't add a
  new empty state.
- Tokens: `#B5563A` accent (not green), Source Serif 4 for the headline,
  Source Sans 3 for body, 56px primary button, 44×44pt dismiss target —
  all already-defined tokens, nothing new to add to the system.
