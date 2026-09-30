# What We've Found in the Original 1987 Program So Far — For Todd's Review

- **Requested by:** the operator, to send directly to Todd as a PDF.
- **What this is:** a first-pass inventory, not a finished analysis. Everything
  below is our best reading of what's actually sitting in the original program
  files — a real, working system from 1987 that we've been reading directly
  (file names, program text, scoring logic), not guessing at from memory or
  secondhand description. You built and lived with this system for decades; we
  didn't. Where we've made an interpretation, we've tried to say so plainly and
  flag it as something for you to confirm or correct, not as a settled fact.
- **What this is not:** a decision about what to build, or a claim that we
  understand this system better than you do. It's the opposite — this is us
  showing our work so you can tell us where we've got it right and where we
  haven't.

## The eight industry variants, and which letter is which

The original program shipped eight distinct versions, each identified by a
single letter (A, B, C, D, M, R, S, T). Each one has its own set of files —
a questionnaire, a risk-scoring file, a score-calculation file, and a
supporting library file.

We found a file (`GPDDMS.ASF`) that appears to map each letter to a specific
industry. Reading it directly, the mapping looks like this:

- **A** = Large Manufacturing
- **B** = Large Service
- **C** = Large Retail
- **D** = Large Restaurant
- **M** = Manufacturing
- **R** = Retail
- **S** = Service
- **T** = Restaurant

This is our hypothesis, read directly out of that one file — we haven't
cross-checked it against your own memory of building the system. If any of
these eight letters actually meant something different, or if this mapping
file was for something other than what we think, that's exactly the kind of
thing only you would know.

We also grouped the eight variants into three families based on which ones
share large amounts of identical text: **A and M** share short, generic
labels; **B and S** share language that reads as client-relationship-focused;
**C, D, R, and T** share the fullest common text, including compensation and
management-layer language. We don't know if this grouping reflects something
real about how you designed the system, or if it's just a byproduct of how
the files were built. Worth asking you directly.

## The Client Relationship Module, and what it's actually for

Separate from the eight industry variants, there's a standalone program
(`CPCSP.EXE`) with its own splash screen calling itself the **"Touche Ross
Client Service Planning System."** Reading its own help text directly, it
describes itself as a tool for a consultant to fill out **about a client**,
covering six areas: Development Stage, Strategy, Structure, Culture,
Leadership Style, and — the sixth one — **Client Relationship**.

Reading the actual text more carefully, five of those six areas ask a
consultant to diagnose the client's own organization — which looks, on our
read, very close to what the main eight-variant product already does, just
from a consultant's outside view instead of the client's own voice. The
sixth area, Client Relationship, is different: it scores the *consultant's
own* way of building trust and credibility with the client, using the same
underlying scale the main system uses to describe a CEO's leadership style,
just pointed at the consultant instead.

**Our working hypothesis:** this sixth dimension — Client Relationship — is
the real, original source for what we've been calling "Consulting
Communicator," the idea of consultants getting feedback on their own
coaching or relationship-building style, not on the client's organization.
We found six real, scored items in this area, with real example language
like *"is more comfortable influencing others on the basis of trust and
expertise than on the basis of the formal clout inherent in his position."*
If your own memory of a sixteen-question consultant self-assessment is close
to this, that's a strong match. If it's a completely different idea, please
tell us — we'd rather build the right thing than something coincidentally
similar.

## What else Todd's seven-module framework has real decoded content for, and what doesn't

Beyond Consulting Communicator, here's where we stand on the rest of the
seven original module ideas, checked directly against what's actually
present in the files — not assumed from the module names alone.

**Executive Communicator** looks real and decodable. We found an actual
historical report (`MV6COMBO.ASC`, dated 1992) that combines the individual
answers of eight named people rating the same organization, and shows how
much they agreed or disagreed on each dimension. There are also specific
calculation routines in the files literally named for measuring "significant
agreement" and "significant disagreement" across raters. This looks like
real, working precedent for a tool that surfaces where a leadership team's
views of their own company actually diverge.

**Investor Insight** — we need to walk back our own earlier read on this
one. We had found a report section called the "Saleability Index," present
across all eight variants, and initially assumed this meant something like
investor due-diligence — helping an outside investor judge a company before
putting money in. The operator has since corrected us: it likely reads more
naturally as **sales advice** — helping the organization itself understand
how ready or attractive it is in the marketplace — not an outside
investor-facing tool. We're flagging this correction plainly rather than
quietly keeping our first guess. If you remember what this index was
actually built to do, that would resolve it for us directly.

**Merger & Acquisition Manager** and **Contingency Planner** — we looked
specifically and found nothing. No comparison-between-two-companies logic
anywhere in the files (the words "merger" and "acquisition" only show up as
a single risk category for one company, not a tool for comparing two), and
nothing anywhere resembling forward-looking scenario planning. If either of
these ideas has real substance in your own head, none of it is visible to
us in these files — we'd be starting from nothing but your description.

**Client Service Planner** turned out to be a real naming trap worth
flagging directly. The Client Relationship Module's own splash screen says
it's "Client Service Planning" — a very close name match — but its actual
described purpose, in its own words, is helping a consultant plan how to
better serve and sell more services to an existing client, not helping an
organization itself become more market- and customer-driven internally,
which is what we understood this module to be about. Real content exists
under this name, but it may not be the same idea you had in mind when you
named it — worth you telling us which one you actually meant.

## A specific question we went looking to answer: is there a nonprofit version?

The operator asked us to check directly whether a version of the system for
nonprofit organizations exists somewhere in the files, distinct from the
eight known industry letters. We looked hard — every file in the
distribution, every industry-selection screen we could find, a direct search
for words like "nonprofit," "charity," "foundation," and similar — and found
nothing. This is a genuine, checked negative, not something we're unsure
about from lack of looking.

That said, the files only show us what was actually shipped in this
particular archive. If a nonprofit version existed and simply isn't in this
copy of the software, we'd have no way of knowing that from here — this is
exactly the kind of thing your own memory might resolve in one sentence
where our search cannot.

## The single biggest new find: a real, decoded "fit-check" analysis

This is worth describing carefully because it may be the most substantial
piece of undiscovered content we found tonight.

Beyond the numeric scores the system already produces for each dimension
(Structure, Strategy, Culture, Leadership, and so on), we found a large,
fully-written library of text that checks whether an organization's scores
actually *fit together* — not just what each individual score is, but
whether they make sense in combination. Concretely, we found:

- roughly **35 written rules** describing when a particular organizational
  Structure conflicts with a particular Strategy,
- roughly **14 rules** for when Culture conflicts with Structure,
- roughly **20 rules** for when Culture conflicts with Strategy,
- a full **per-stage description of the "ideal" structure, culture, and
  leadership style** for each of the eight lifecycle stages your system
  tracks,
- a **32-item checklist** covering things like board involvement, whether
  one person makes all the decisions, financial oversight, employee morale,
  and six categories of how well the organization watches its environment —
  each with three levels of write-up depending on how healthy that item is,
- and what looks like a version of the stage-crisis idea often associated
  with Larry Greiner's growth-stage research — a named "crisis" (of
  leadership, delegation, coordination, control, and so on) tied to each
  stage.

We didn't just find this text — we tested it, and want to walk you through
that test specifically, because we think the result is worth your attention
on its own.

We took one real, historical answer set from your own system — an actual
anonymized client's real 171 answers, already on file and already used
earlier tonight to check that our modern scoring math reproduces your
original program's own printed numbers — and ran a sample of the decoded
fit-check rules against the real scores that answer set produces.

Two things stood out. First, an independent sanity check on the scoring
itself, not the new rules: this same client's real answers produce an
overall risk score that lands in the middle band of the scale — and your
original program's own printed output for this exact client also said
"Moderate Risk." That match, found independently, is real evidence that our
modern reimplementation of your scoring math is faithful to the original,
not just plausible-looking.

Second, on the fit-check rules themselves: this client's own scores put
three lifecycle stages (Stall, Projectile, Acceleration) in a near-tie for
first place — your system's own confidence measure correctly flagged this
as ambiguous rather than picking one falsely. When we applied your decoded
"ideal structure per stage" text to this same client's real structure
scores, something useful happened: this client's actual profile fits the
ideal structure you describe for the Acceleration stage (a Functional
Hierarchy) far better than it fits the ideal structure for the Stall stage
(which calls for a Simple structure — the one dimension this client scores
lowest on of all ten). In other words, the fit-check logic, run on real
numbers, pointed toward a more precise answer than the raw scores alone
gave us. We also found three specific, real conflicts between this client's
actual dominant culture and its actual structure and strategy scores (for
example: this client's culture leans heavily Paternalistic, and your own
decoded text says a Paternalistic culture works against exactly what makes
a Divisional or Organic structure function well — and this client scores
real, meaningful signal on both of those structures). Just as important:
several adjacent rules that describe conflicts with a risk-taking strategy
correctly did NOT fire, because this same client's real strategy profile
is risk-averse, not risk-seeking — the logic responded to what was actually
true about this specific case rather than firing on every organization
regardless of its actual profile.

We're treating this as a real, working signal, not proof the whole thing is
perfect — we only hand-checked a portion of the full rule set against one
example.

We wanted you to know this exists and appears to work, in plain terms,
before anyone designs anything around it — partly because you may remember
exactly how this was meant to be used, and partly because you may know
things about its limitations that a file full of text can't tell us.

## One more thing, from a different, more recent piece of the story

Separately from the 1987 system, we also went looking through the history of
a newer, web-based version of this work — not connected to the original DOS
program, built years later. In an early version of that newer product, we
found a real, working homepage that walked someone through a "What," "So
what," and "Now what" reflection, ending in personalized suggestions
addressing themselves, another specific person, and the group as a whole.
It was later removed and the homepage was pointed somewhere else. We're
mentioning it here only for completeness — it's a separate lineage from the
1987 system above, not part of it, but part of the fuller picture of what's
been found and recovered tonight.

## What we're asking of you, plainly

Everything above is our best reading of real files, not invention — but
every interpretation in it is exactly that, an interpretation, made by
people who never worked with this system while it was live. Where we've
guessed at what something was for, we'd rather be corrected now than build
the wrong thing later. Thank you for taking the time to look this over.
