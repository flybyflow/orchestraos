# The Activation Tables: Strategy, Structure, Leadership Style, Client Relationship

This closes the decode work left open by `BRIEF_1987-system-deep-mine.md`, whose
last line said the only remaining work was "applying the existing bit-matrix
decoder to the Strategy/Structure/Leadership/Relationship activation tables."
Everything here was read directly out of the files unless marked "we think" or
"inferred." Quoted text is verbatim. Read-only pass; no source file was modified.

**The headline, and a correction to the premise:** these four topics do not use
bit matrices at all. Only Development Stage, Culture, and the Descriptors module
are scored through 0/1 activation matrices. The other four use a simpler
mechanism that turned out to be *fully recoverable*: a per-question accumulator
map plus explicit numeric thresholds written into scoring functions whose source
is stored readably inside the SCORE files. We decoded all of it, and then
**verified the whole model by recomputing the real 1992 eight-rater COMBO report
from the raw saved answer files — the recomputed low/high scores match the
printed report on every Strategy axis, every Structure form, every Impact
dimension, and every Leadership style.** This is a stronger result than a
bit-matrix dump would have been: we now have the scoring arithmetic, the band
thresholds, and the report-text selection logic, not just which cells are 1.

---

## 1. How we got in (method continuity with the prior decode)

The prior pass (`scripts/parse_score_matrix.py` + `scripts/decode_matrices.py`
in the repo) found the Dev Stage and Culture matrices by scanning the
`GP?SCORE.ASF` binaries for long runs of ASCII '0'/'1' characters and reshaping
them. We reused that entry point, then went one level deeper: the `.ASF` files
are APL*PLUS component files with a parseable directory at the top (8-byte
entries: 32-bit offset + 16-bit length), and each component has a typed header
carrying its rank and dimensions. Parsing that directory gives every component
cleanly — including ones the string-scan could never see (binary integer
vectors, and APL function source stored as mostly-readable text).

The SCORE file's own table of contents (component [1], verbatim):

```
[2]       Dev Stage scoring array      [16]-[18] Structure or Design
[3]       Culture scoring array        [19]-[20] Need for Structural Change
[4]       DEV VEC - combos of 7 2 3    [21]-[24] Culture
[5]       Demo scoring matrix          [25]-[27] Leadership Style
[6]       ANSAV - Accum Vector         [28]-[30] Client Relationship
[7]       Demo # of choices            [31]      Client Relationship Graph
[8]       SCOREcmps                    [32]-[34] Saleability Index
[10]-[12] Development                  [35]-[43] Titles + SALES ADVICE per stage
[13]-[15] Strategy                     [44]-[46] Risk Graph / Risk Text / Risk Function
```

Each topic's 3 components are: a narrative-selection table, the narrative text
bank, and the scoring/report function (APL source — the glyph operators are
mangled in ASCII but the numbers, comments, and structure read fine).

## 2. The shared scoring machinery (verified)

- Answers are stored 1–5: 1 = TRUE, 2 = MORE TRUE THAN FALSE, 3 = no selection
  (the default — the QUEST file's "Default ANSV" component is all 3s), 4 = MORE
  FALSE THAN TRUE, 5 = FALSE.
- Each answer becomes a question score: TRUE +2, More True +1, neutral 0, More
  False −1, FALSE −2.
- Component [6], **ANSAV ("Accum Vector")**, is one integer per question: which
  accumulator (subscale) that question's score is added into. This vector *is*
  the activation table for the four topics — each question activates exactly
  one subscale, full-weight, signed by the answer.
- The scoring functions then compare accumulator sums against fixed thresholds
  to pick bands and compose the report from numbered narrative paragraphs.

**Verification.** We computed accumulator sums from the raw answers saved in
the fourteen `MGP*.ASF` rater files and compared against the printed low/high
columns of the 06/09/92 COMBO report (`MV6COMBO.ASC`, built from eight of those
raters). Matches, exactly: Strategy axes 1–4 (e.g. Long vs Short Term −60/+40 =
raw −6/+4 × 10), all five Structure forms (e.g. Simple 18.8/68.8 =
(raw+8)/16×100 for raw −5/+3), all five Impact dimensions, all four Leadership
styles, and the per-item influence subscales. Two systematic sign facts fell
out of this (see §3 and §4). The Client Relationship module could not be
verified this way — all fourteen raters left it unanswered (it is the
consultant-only module) — so its decode rests on the function source alone.

ANSAV is byte-identical across GPM/GPA/GPS/GPB (Manufacturing + Service family)
and across GPR/GPC/GPT/GPD (Retail + Restaurant family, which has a different
battery — §7). The scoring functions are equivalent across industries within a
family (we diffed them; only cosmetic differences). So unlike the risk engine,
**these four topics have no per-industry calibration at all** — the deep-mine
brief's guess that they'd be "normalized by per-industry min/max tables" was
wrong; the normalization is fixed arithmetic, identical everywhere.

## 3. Strategy — 25 items onto 5 bipolar axes

**Activation map** (from ANSAV: Strategy items cycle through the five axes in
order, so axis = ((item −1) mod 5) + 1):

| Axis (accumulator) | Items | Positive pole (verified from narrative) |
|---|---|---|
| Long vs Short Term (2) | 1, 6, 11, 16, 21 | **Short Term** |
| Risk vs Predictable (3) | 2, 7, 12, 17, 22 | **Predictable** |
| New vs Current (4) | 3, 8, 13, 18, 23 | **Current** |
| Spread / Concentrate (5) | 4, 9, 14, 19, 24 | **Concentrate** |
| External vs Internal (6) | 5, 10, 15, 20, 25 | **Internal** |

Positive always means the *second-named* pole. Items for axes 1–4 are worded
toward their positive pole and are summed as-is (verified against COMBO with no
per-item reversal). Axis 5's five items are all worded toward External
("pricing based on the value added to the user," "monitoring the needs and
perceptions of its users"…), yet the system treats a positive sum as Internal —
so **axis 5 is reverse-keyed somewhere upstream**. We verified this
behaviorally twice over (the COMBO scores only match if negated, and the
report function prints the INTERNAL paragraph for high positive scores); we
did not find the key's storage location (see §8).

**Scoring:** axis score = sum of its 5 item scores, range −10…+10; the report
displays ×10 (−100…+100 — the scale seen in the 1992 report).

**Bands** (function `S.STRAT`, component [15]; thresholds verbatim
`11 7 3 ¯2 ¯6`): +7…+10, +3…+6, −2…+2, −6…−3, −10…−7 → five narrative bands
per axis. The five band paragraphs for axis 1, trimmed, in order:

1. "There is a much greater focus on the SHORT TERM implications of decisions…"
2. "There is a greater focus on the SHORT TERM implications of decisions…"
3. "The organization makes a concerted effort to maintain SHORT TERM profitability and to simultaneously protect the LONG TERM health…"
4. "While attending to short term needs, the organization is willing to sacrifice today if necessary to insure the LONG TERM…"
5. "The organization's strategic emphasis is on the LONG TERM…"

Same five-step ladders exist for Predictable↔Risk, Current↔New,
Concentrate↔Spread, Internal↔External (narrative paragraphs 1–24 of component
[14]; each band also appends per-item detail bullets, e.g. "hires people who
can contribute immediately to the bottom line"). In the middle band, if the
score is still >+1 or <−1 a tie-breaker line is added, e.g. *"In the case of
disagreement or uncertainty about strategic direction, the SHORT TERM
perspective tends to prevail."*

**Congruity analysis** (same function, decoded from its source): after the five
axis write-ups the program checks cross-axis coherence using axes 1, 2, 3 and 5
(Spread/Concentrate is deliberately excluded from the congruity core):

- If the spread of those four scores is ≤3: *"Organizational strategies are
  congruent with one another."* If large and all same-signed, the all-high /
  all-low profiles print (e.g. *"A strategic emphasis on the SHORT TERM is
  compatible with a desire to leverage CURRENT assets in a largely PREDICTABLE
  fashion…"*).
- Otherwise it hunts pairwise contradictions: any pair differing by ≥6 with
  opposite signs triggers a specific write-up — e.g. *"There is too great an
  emphasis placed on realizing a payout in the SHORT TERM given the
  organization's willingness to accept RISK"*; *"A tendency to focus INTERNALLY
  may render the organization's willingness to accept RISK problematic…"* A
  full library of ~30 such pairwise texts exists (paragraphs 203–238), covering
  both directions of every pair.

## 4. Structure or Design — 30 items, three outputs

**Form activation map.** Items 1–20 cycle through the five forms in *reverse*
accumulator order (item 1 → Organic, 2 → Matrix, 3 → Divisional, 4 → Functional
Hierarchy, 5 → Simple, repeat):

| Form (accumulator) | Items | Sample item (verbatim, trimmed) |
|---|---|---|
| Simple (7) | 5, 10, 15, 20 | "Job descriptions are not important; people do whatever must be done to get the product out the door." |
| Functional Hierarchy (8) | 4, 9, 14, 19 | "People are specialists (vs. generalists), performing in depth a narrow range of activities." |
| Divisional (9) | 3, 8, 13, 18 | "Units within the organization are able to operate independently." |
| Matrix (10) | 2, 7, 12, 17 | "People experience role conflict as they are subjected to contradictory expectations from multiple parts of the organization." |
| Organic (11) | 1, 6, 11, 16 | "Temporary groups made up of experts from diverse parts of the company… come together to create and implement innovative ideas." |

Form score = sum of 4 item scores, raw −8…+8, displayed (raw+8)/16×100
(0–100). No item reversal (verified against COMBO).

**Impact ("structural pain") map.** Items 21–30, two consecutive items per
dimension: Info Processing (12) ← items 21–22; Resource Utilization (13) ←
23–24; Specialization (14) ← 25–26; Coordination (15) ← 27–28; Market
Sensitivity (16) ← 29–30. Raw −4…+4 where **positive = pain** (the items are
all "this is hurting us" statements). The report displays the *negated* value
×25, so on the printed page positive = healthy (verified against COMBO).

**Need for Structural Change** — completely decoded from function `S.STRUC2`
(component [20], source readable):

- Overall: sum of all five impact scores (raw −20…+20) against thresholds
  `10 0 ¯9 ¯20` → four verdicts, verbatim ladder from "It appears that the
  structures in place are creating problems… the design is not working" down
  to "The advantages inherent in this form of organization are significantly
  outweighing possible problems… the design is working well."
- Per dimension: thresholds `3 0 ¯2 ¯4` → four bands each, e.g. Info
  Processing: "Information is not being processed effectively." / "There are
  some problems…" / "Information is generally processed in a timely manner." /
  "Information is being processed in a timely and effective manner."
- Per item: if a specific pain item was answered TRUE-ish (answer 1 or 2) its
  problem elaboration prints (e.g. item 22 → "The quality of decisions suffers
  as experts who are not fortunate enough to appear in the top boxes of the
  organization chart are denied the opportunity to voice an opinion."); if
  FALSE-ish (4 or 5) the mirrored strength prints. All 20 elaborations exist,
  one pair per item. Problem and strength sections are joined with "In other
  respects, the structures in place are working / are creating problems."

**Form narrative:** the classifier that turns the five form scores into a
diagnosis (pure form, blend, "moving toward X," no clear form) runs inside the
tokenized questionnaire engine as `STRUC~IND`, and we could not recover its
thresholds (§8). What *is* fully recovered: its output vocabulary — a
46-row selection table (component [16]) composing a 201-paragraph narrative
bank (component [17]) that covers each pure form with advantages/disadvantages
("The organization is SIMPLE in form."… "The organization operates as a pure
FUNCTIONAL HIERARCHY."… "The organization has adopted a MATRIX form…"…
"the most fluid form of design: the ORGANIC structure"), partial/transition
cases ("There is evidence that the organization is moving in the direction of
becoming a FUNCTIONAL HIERARCHY."), retained-vestige blends ("It appears that
vestiges of the DIVISIONAL structure remain…"), and a no-clear-form case ("The
organization lacks a clearly defined structure.").

## 5. Leadership Style — 21 items: a 4-style grid plus 5 influence modes

**Style map.** Items 1–16 cycle through the four styles (item 1 → Facilitator,
2 → Striver, 3 → Driver, 4 → Affiliator, repeat):

| Style (accumulator) | Items | The four items (gist) |
|---|---|---|
| Facilitator (18) | 1, 5, 9, 13 | respects rights of others / values others' ideas / listens actively / builds on others' ideas |
| Striver (19) | 2, 6, 10, 14 | makes opinions known / tells people openly when they fail expectations / recommends clear courses / looks for challenges |
| Driver (20) | 3, 7, 11, 15 | discourages disagreement / resists new ideas / gets defensive when criticized / places blame |
| Affiliator (21) | 4, 8, 12, 16 | avoids disagreement, smooths over / unclear expectations / indecisive / vague and uncertain |

Raw −8…+8 per style, displayed (raw+8)/16×100. Accumulator-to-name assignment
verified empirically — each style's recomputed low/high matches its named row
in the 1992 report.

**Influence modes.** Items 17–21 are scored individually (one item each):
17 "setting up trades" = Negotiate; 18 "tells people what to do and how… power
to back up his demands" = Direct; 19 "relies on friendship or respect" =
Enlist; 20 "works with them to discover best solutions" = Involve; 21
"minimizes his need for (or dependence on) others" = No-influence. Display
mapping per item: TRUE 100, More True 66, More False 33, FALSE 0 (verified
against COMBO).

**Outcome classification.** The classifier (`LEAD~IND`, in the tokenized
engine) picks one of 52 cases; its thresholds were not recovered, but the full
case list and each case's narrative are. From the Saleability function's own
case table and comments, cases 1–20 are strong/moderate pairs over ten style
categories, 21–30 are weak versions of the same ten, 31–35 are
faint-tendency/no-style cases, and 36–52 select the influence-mode text. The
ten categories (program's own labels): NURTURE, STRIVE, DRIVE, NEED,
STRIVE/DRIVE, NURTURE/STRIVE, NURTURE/DRIVE, NURTURE/NEED, STRIVE/NEED,
DRIVE/NEED — i.e., the four pure styles plus all six pairings, plus "No Clear
Style." Each maps to a signature narrative paragraph:

- "is a FACILITATIVE leader. He cares about his people, is very responsive…"
- "is a STRIVING leader. He appears to place a greater emphasis on the job to be done…"
- "is a DRIVING leader. He appears to be only concerned about the job to be done…"
- "is an AFFILIATIVE leader. He is concerned about what others think, seeks approval and may not provide clear direction…"
- pairings, e.g. "is at once a STRIVING and DRIVING leader. The job to be done is all that matters…"
- and "Responses indicate that the %1 lacks a clearly defined style. No discription can be rendered." [sic]

The influence texts are their own ladder, from "The %1 is more comfortable
influencing others on the basis of trust and expertise than on the basis of the
formal clout…" through "tends to rely on the power inherent in his position…"
to "The %1 is able to use a variety of influence styles and power bases."

## 6. Client Relationship — 16 items, 4 scoring groups, 10 reported subscales

The function source carries its own label, verbatim comment: `V←S.IS[Trust,
Respect, Network, Other Factors]`. Map (item order = question order; items
quoted in the deep-mine style, trimmed):

| Group (accumulator) | Items | Content |
|---|---|---|
| Trust (23) | 1–5 | "willing to talk openly"; "close; camaraderie"; "confident we would act in his best interest"; "guarded; cautious" (negative); "would try to gain at his expense" (negative) |
| Respect (24) | 12–13 | "seeks advice… around a wide variety of business issues"; "talks about long term work" |
| Network (25) | 14, 16 | "key players other than the %2 perceive that [firm] could help them"; "good relationship with people who can really influence the %2" |
| Other Factors (26) | 6–11, 15 | each item is its own reported subscale — see below |

The 1992 report's own subscale list names the Other Factors items individually:
item 6 = **Realistic Expectations**, 7 = **Perceived Relevance**, 8 = **Time
Invested**, 9 = **Aware of Services**, 10 = **Use of Competitors**, 11 =
**Access**, 15 = **Price** — giving the ten reported dimensions: Trust,
Credibility/Respect, Network, plus those seven.

**Scoring and bands** (function `M.S.RELA`, component [30], fully readable):

- If fewer than 12 of the 16 items are answered, no report is produced.
- **Overall**: sum of all four groups (raw −32…+32) against thresholds
  `24 16 8 0 ¯8 ¯16 ¯24 ¯32` → an eight-rung ladder (which also positions the
  marker on the Client Relationship Graph, component [31]): from *"The
  consulting team has managed to create a highly COLLABORATIVE relationship
  with the organization"* down through *"It is with some RESERVATION that the
  %2 involves ________ in the organization"* to *"The relationship with this
  client is shaky. The %2 is RESISTANT, attempting to minimize the extent of
  ________' involvement."*
- **Trust** (raw −10…+10): thresholds `8 4 0 ¯4 ¯7 ¯10` → six bands from "The
  %2 has a high level of TRUST in the members of the consulting team" to "The
  %2 does not trust the members of the consulting team. He would probably sever
  the relationship if he were in a position to do so." Separate paragraph
  variants exist for 5, 4, or 3 items answered; ≤2 answered prints an
  unanswered-items caution instead.
- **Respect** and **Network** (raw −4…+4 each): thresholds `3 1 ¯2 ¯4` → four
  bands each ("The %2 has a great deal of respect for the depth and range of
  expertise…" / "Members of the consulting team have managed to build a strong
  network of supporters within the client organization…"), again with
  unanswered-item variants.
- **The seven individual factors** drive sales advice: the overall band (≥+16 /
  +0…+16 / −16…0 / ≤−16) selects one of four advice regimes, and within it each
  factor item answered strongly (±2) or mildly (±1) prints its own paragraph —
  leverage-the-strength wording in good relationships (e.g. *"The client has
  invested enough time and energy with ________ that it would be both
  inconvenient and presumably inefficient to turn to another provider…"*),
  fix-the-weakness wording in poor ones (e.g. *"That ________ does not have a
  strong hold on this client is apparent as the client uses outside consultants
  for services ________ is capable of rendering…"*). 2 paragraphs × 7 factors ×
  4 regimes, all present in component [29].

**Keying caveat (inferred, flagged):** Trust items 4–5 and factor items 9, 10,
15 are negatively worded. The band thresholds only make sense if those items
are reverse-scored before summing (otherwise the top Trust band is unreachable
by any coherent answer pattern). We could not verify this empirically — the
module is unanswered in every saved file — and we did not find the key vector
(§8). We state it as the only sane reading, same status as the Strategy axis-5
reversal, which *was* behaviorally proven.

## 7. The Retail/Restaurant family is a different battery

GPR/GPC/GPT/GPD are not just reworded — the instrument differs structurally
(all verified from their own MODV/ANSAV/function components):

- **181 questions**, not 180: 10 demographics, 25 Development Stage, 24
  Strategy, 32 Structure, 28 Culture, 21 Leadership, 16 Relationship, 25 Risk.
- **Strategy has six axes** (4 items each, raw ±8, bands `9 6 2 ¯1 ¯5`): the
  five above plus **Integrate/Separate** (accumulators 2–7).
- **Impact of Structures has six dimensions**: the five above plus **Supplier
  Performance** (accumulators 13–18; 12 pain items).
- Culture's **"Professional" type is renamed "Traditional"** in this family's
  report vocabulary.
- Leadership (accs 20–23 + 24) and Client Relationship (accs 25–28) are the
  same design, shifted accumulator numbers.
- This also solves a deep-mine open question: the two combine/report
  workspaces' suffixes mean **MS = Manufacturing & Service, RR = Retail &
  Restaurant** — the split exists because the two families have different
  subscale structures (the RR workspace's report skeleton lists the 6-axis
  Strategy, 6-dim Impact, "Traditional," and a slightly different risk list —
  "Outside Mgmt Advice," "Training" — plus an One-Man-Rule component "Experts
  as Leaders" in place of "Delegation/Decent.").

## 8. Corrections to the repo's prior decode artifacts, and what's still locked

Corrections (these matter if anyone builds on `matrices/*_decoded.json`):

1. **The retail-family dev matrices in `*_decoded.json` are wrong.** The prior
   decoder hardcoded 120×8; GPR/GPC/GPT/GPD's first bit array is 1360 bits
   (34×5×8, per its own stored dimensions), so those four JSON files contain a
   truncated misreshape. (Open question: the retail dev matrix has 34 row
   groups but the retail Dev Stage module has 25 items — the extra 9 are
   unexplained; resolving it needs the tokenized dev-scoring code.)
2. **The 344-bit array labeled `risk_flag_matrix` is actually the Demo scoring
   matrix** — component [5], demographics answer-choices × 8 stages. Proof:
   the "Demo # of choices" vector for GPM is `3 5 5 6 6 4 5 6 3`, summing to
   exactly 43 = 344/8. The other variants match too (GPS 40×8=320, GPR/GPC
   46×8=368, GPT/GPD 47×8=376 — all exactly the "third run" sizes).
3. The Dev Stage array's true shape is 24×5×8 (question × answer-state ×
   stage), stored with its dimensions in the component header — the prior
   120×8 reshape was equivalent for the MS family but right by luck, not by
   derivation.

Still locked / not recovered (all in the tokenized APL engine code, which would
need a real APL*PLUS decoder):

- The **reverse-key storage**: axis-5 Strategy reversal (proven behaviorally)
  and the inferred Client Relationship item keys live somewhere we didn't find
  — not in the QUEST file's readable components (we checked Default ANSV, MODV,
  and the screen-layout vector).
- The **classifier functions** `DEV~IND`, `STRUC~IND`, `CULT~IND`, `LEAD~IND`
  that bucket scores into narrative cases. Their *output vocabularies* are
  fully recovered (37 dev-stage cases including every transition, 46 structure
  blocks, 52 leadership cases), but the exact score cutoffs they use are not.
- Minor: the exact band-to-paragraph pairing for the Respect and Network
  sub-ladders has a possible off-by-one we could not fully pin (the Trust and
  overall ladders are pinned exactly).

Everything else in this brief — the activation maps, the arithmetic, the
thresholds, the narrative ladders — is read directly from stored data or
readable function source, and the arithmetic is independently confirmed by
reproducing the 1992 report from raw answers.
