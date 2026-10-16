# Deep Mine of the 1987 Program Files

This goes one level below the scoping brief (`BRIEF_1987-system-scoping-for-todd.md`).
Everything here was read directly out of the files unless marked "we think" or
"not confirmed." Quoted text is verbatim from the files. Read-only pass; nothing
was modified.

The headline: the five "un-mined" topics (Development Stage, Strategy, Structure,
Culture, Leadership Style) are not locked away in the Client Service Planning
program — their full question banks, subscale lists, scoring tables and report
narratives live inside the eight industry files that are already on disk and
already partially decoded. All five are extractable the same way Client
Relationship was.

---

## 1. What the software actually is (new hard facts)

- **It is APL, not COBOL.** The runtime is APL*PLUS/PC version 7.1 by STSC.
  `.AWS` files are APL workspaces (the program code), `.ASF` files are APL
  component files (the data: questions, scoring arrays, report text).
  Copyright string inside CSPSYS.EXE: *"copyrighted unpublished works of STSC,
  Inc. and Dialectics Inc. Copyright 1987 STSC, Inc and Dialectics Inc."*
- **The product's real name is THOR — "The Organization Reappraisal."** The
  questionnaire intro screen begins: *"INTRODUCING THE ORGANIZATION REAPPRAISAL
  -THOR- … a unique, questionnaire-driven, computerized expert system…"* The
  boot banner in CSPSYS.EXE reads "The Organization Diagnosiis System" (typo in
  the original).
- **The Client Service Planning System is the Touche Ross-branded edition.**
  Its title screens (in CSPHELP.ASF) show a "Touche Ross" logo box above
  "Client Service Planning System." The 1991 report workspaces print the screen
  header "Touche Ross - CSP System."
- **Dates found inside:** function signatures "JH" dated 4-86, 11-86, 3-87;
  questionnaire engine version stamp `880601`; chart data "REVISED 12/18/88";
  the combine/report workspaces are version `GP9106` (i.e., 1991); the saved
  COMBO report is stamped 06/09/92.
- **The EXEs are just zip archives.** Every EXE except CSPSYS.EXE is a PKZIP
  self-extracting archive (PKWARE, 1989). We read their internal file lists:
  - GPATHOR1.EXE = the 4 files each for GPS + GPB (Service, Large Service)
  - GPATHOR2.EXE = GPA + GPM (Large Manufacturing, Manufacturing)
  - GPATHOR3.EXE = GPR + GPC (Retail, Large Retail)
  - GPATHOR4.EXE = GPT + GPD (Restaurant, Large Restaurant)
  - CPCSP.EXE = the CSP bundle: GPCSP.AWS, GPDDMS.AWS, GPDDRR.AWS, GPDD.BAT,
    GNGRAPH.ASF, CSPHELP.ASF, CSPMAINT.ASF, GPDDRR.ASF, GPDDMS.ASF
  Everything inside them already exists loose in the directory, which confirms
  the scoping brief's claim that the launchers add no content — now with the
  mechanism known.
- **The industry letter map is now confirmed from the data itself** (not just
  our read of one file). GPDDMS.ASF and GPDDRR.ASF carry two parallel
  `+`-delimited strings:
  `Manufacturing+Service+Retail+Large Manufacturing+Large Service+Large Retail+Restaurant+Large Restaurant`
  mapped to `GPM+GPS+GPR+GPA+GPB+GPC+GPT+GPD`.
- `CPCSP.AWS` and `GPCSP.AWS` are byte-identical (same md5). The 4 files per
  industry are: QUEST (questions), RISK (risk/fit engine + write-ups), SCORE
  (scoring arrays + report narrative), LIB (shared utility functions — "GNUTIL",
  no diagnostic content).
- How it was run: `GPDD.BAT` contains `cspsys q=gpddms s=0 h=10 c=0 z=1` —
  CSPSYS.EXE is the APL runtime, `q=` names the workspace to load.

## 2. Correction: where the six topics actually live

The scoping brief placed the six topics inside the Client Service Planning
program. The deeper truth: **all six topics are modules inside every one of the
eight industry questionnaires.** Each GP?QUEST.ASF file's own component
directory reads:

```
[15] Demogr. Formed Quests   [19] Culture Quests
[16] Dev. Stage Quests       [20] Leadership Quests
[17] Strategy Quests         [21] Relationship Quests
[18] Structure Quests        [22] Risk Quests
```

Each questionnaire is **180 questions in 8 modules**. We counted the items in
GPMQUEST.ASF and cross-checked against the scoring array dimensions in the
already-decoded matrices (Dev Stage array = 120 rows = 24 questions × 5 answer
states; Culture array = 140 rows = 28 × 5), and against the on-screen counter
"Question: ___ of 180":

| Module | Items | Who/what is rated |
|---|---|---|
| 1. Descriptors (demographics) | 9 | the client org — multiple choice a–f |
| 2. Development Stage | 24 | the client org |
| 3. Strategy | 25 | the client org |
| 4. Structure or Design | 30 | the client org |
| 5. Culture | 28 | the client org |
| 6. Leadership Style | 21 | **one named leader** (`%1` placeholder) |
| 7. Client Relationship | 16 | **the consultant's own firm's relationship** (`%2` + firm name) |
| 8. Add'l Performance Predictors (Risk) | 27 | the client org |

(The per-module counts for modules 3, 6, 7, 8 are our count from the dumped
text, ±0 — the eight counts sum to exactly 180.)

**Answer scale** for modules 2–8: four boxes — `TRUE / MORE TRUE THAN FALSE /
MORE FALSE THAN TRUE / FALSE` — plus a neutral middle position ("Ambiv", the
F9 "No Selection" key). So every item has 5 possible answer states, which is
why every scoring array has 5 rows per question.

**The "twist" check the operator asked for:** only Client Relationship is about
the consultant's own side. The other five are straight consultant-rates-client
(or insider-rates-own-org — the intro says both uses are intended). One nuance:
Leadership Style rates a *specific individual*, chosen from a titles list
(Chief Executive, President, Executive VP, CFO, COO, VP, Area/Unit Manager,
Chief Marketing Officer, Chairman of the Board, Division Head, Board Member,
Managing Director); the title is substituted into every item via `%1`.
In the Client Relationship items the consulting firm's name is substituted at
runtime (the raw GPM text still says "Dialectics" — the software author's own
firm; the report text uses a `__________` blank).

How scoring works mechanically (verified for Dev Stage and Culture; same
machinery for the rest): each (question, answer-state) pair activates
subscale columns in a 0/1 matrix; column sums are normalized against per-industry
R-MIN / R-MAX tables to a 0–100 scale (bipolar scales run negative-to-positive;
a comment in the risk engine notes a scale was "+ADDED TO MOVE SCALE FROM -20 TO
+100"). The modern re-implementation in `engine/src/` and `matrices/*_decoded.json`
already models this for Dev Stage / Culture / Risk flags.

---

## 3. The five un-mined topics, item by item

Full verbatim item text below is from GPMQUEST.ASF (Manufacturing). See §6 for
how much of it changes per industry (short version: Leadership and Client
Relationship are identical across all 8; the org-facing modules are
industry-adapted).

### 3a. Development Stage — 24 items, scored to 8 stages

Subscales (the 8 stages): **Launch, Course Find, Auto Pilot, Acceleration,
Projectile, Modulation, Refuel, Stall.** Each of the 24 items × 5 answer states
maps into the 120×8 stage matrix (already decoded in
`matrices/GPM_decoded.json`); the Descriptors module also feeds stage scoring
(a "Demo scoring matrix" exists in the SCORE file). The report also draws a
stage chart (see §5).

The 24 items:

1. The organization is experiencing difficulties due to lack of available cash.
2. The organization is experiencing difficulties due to lack of focus.
3. The organization is experiencing difficulties due to the lack of enough capable leaders.
4. The organization is not as healthy as it might be due to excessive domination on the part of the Chief Executive.
5. Organization members are burdened with too much red-tape.
6. The organization does not operate as efficiently as it might due to outmoded technology or outdated plant and equipment.
7. The organization devotes sufficient time and energy to thinking about and clarifying its long term growth strategies.
8. The organization has created operational plans which specify in sufficient detail what is to be done, by when and by whom.
9. Information flow within the organization is informal and spontaneous and dependent primarily on one-on-one informal interaction (as opposed to formal communications vehicles).
10. People are rewarded for having strong management skills (versus technical, marketing or sales skills).
11. Decision making within the organization is highly centralized; top management makes the important decisions.
12. Work relationships between organizational units are collaborative; people openly share information and work as a team.
13. Leadership within the organization is based on having expertise relevant to the problem or opportunity at hand; position is less important than the ability to contribute.
14. With regard to the management of its financial resources, the organization's major concern is with financing growth or expansion (vs. managing cash flow, or realizing an immediate return on investment).
15. The decisions made by the organization reflect a greater concern for the long term health of the company than for short term profitability.
16. Reporting relationships within the organization are simple and clear.
17. The organization is betting that spontaneous innovative ideas (vs. pre-planned, systematic efforts) will pay off.
18. The organization accepts the need to take risk in order to gain, and encourages its people to try new, untested approaches.
19. Hierarchy or position in the organization matters; title is of concern to people.
20. The organization will sacrifice short term profitability in the interest of long term gain.
21. The organization has established very complex mechanisms to coordinate the activities of the units or areas within the company.
22. The organization has a competitive advantage due to product differentiation, reputation or image.
23. The organization pays greater attention to enhancing quality than to minimizing the cost of manufacturing the product.
24. The organization invests significant resources in identifying user perceptions regarding product quality.

The 9 Descriptor questions (module 1) that feed this: industry tech level,
industry growth rate, own revenue growth rate, revenue size band, use of
revenues (stay alive / fund growth / return to owners), shareholder
participation, company age band, employee-count band, product portfolio risk
profile.

### 3b. Strategy — 25 items, scored to 5 bipolar axes

Subscales: **Long vs Short Term, Risk vs Predictable, New vs Current,
Spread / Concentrate, External vs Internal.** Scores are bipolar (the 1992
COMBO report shows values from −80 to +100 per axis).

The 25 items:

1. As the organization hires people, it seeks to attract the talent necessary to manage today's products, markets, and technologies (vs. new opportunities which may emerge in the future).
2. The organization's response to technological advances that might affect the nature of its products is to wait and see, delaying any significant change-over until the new processes are proven to be effective.
3. The organization is more interested in improving its sales volume by increasing its share of existing markets than by opening up new markets.
4. The organization's product development emphasis is on building full-line capacity in a few selected product areas (vs. expanding the number of product lines).
5. The organization's pricing strategy is based on the value that is added to the user, not on the costs that are incurred in order to develop and deliver the product.
6. The organization deals head-on with competitors, responding to challenges as they occur (vs. anticipating competitive approaches).
7. The organization is reluctant to enter new product areas in which it has not demonstrated the capacity to make or market the line.
8. The organization is attempting to capitalize on the benefits of experience that exist in its current technological base; it is less interested in being innovative with regard to technology.
9. The organization's strategy for establishing a distribution and sales system is to attempt to access those channels which can provide some exposure in a variety of markets or locations, as opposed to indepth exposure in limited markets or locations.
10. The organization invests significant resources in attempting to modify user or prospective user expectations in order to prevent subsequent user dissatisfaction.
11. The organization's major consideration when deciding whether to reach a certain market is short term profitability (vs. long term growth).
12. The organization's strategy is to maintain share in existing markets as opposed to diverting funds into potential high growth areas in which the company currently has minimal or no market share.
13. The organization is more interested in accessing today's high volume distributors and sales organizations than in establishing relationships with smaller distribution and sales organizations that may gain pre-eminence in the future.
14. The organization seeks to establish relationships with vendors or producers of product components so that it will not have to gear up to perform all of the functions required for product manufacture and distribution.
15. The organization's strategy is to emphasize its desire and ability to modify its products in response to changing user life styles.
16. The organization devotes more energy to showing a strong current financial profile than to building a sound base for future operations.
17. The organization is reluctant to sell products or services that require that it contract out to others due to lack of production or marketing capacity or experience in the lines in question.
18. Efforts to increase sales volume focus more on finding additional applications for existing products than on developing new products to meet new application needs.
19. The organization's strategy is to attempt to gain major share in a clearly defined target market as opposed to capturing some share in a variety of markets.
20. The organization varies its sales and marketing strategies to reflect the unique needs of the particular markets being served.
21. As the organization makes decisions regarding manufacturing capacity, it focuses on immediate or short term needs.
22. The organization tends to follow the lead of competitors with regard to such strategies as price, promotion, product features, etc.
23. The organization emphasizes the importance of resales or additional sales to existing users over the sale to new users.
24. The organization's strategy is to centralize manufacturing capabilities.
25. The organization invests significant resources in monitoring the needs and perceptions of its users and prospective users.

### 3c. Structure or Design — 30 items, scored three ways

Scored to (a) **5 structural forms**: Simple, Functional Hierarchy, Divisional,
Matrix, Organic; (b) **5 "Impact of Structures" dimensions**: Info Processing,
Resource Utilization, Specialization, Coordination, Market Sensitivity (the
later items, which are all "is this hurting you" problems, feed these); and
(c) a derived **"Need for Structural Change"** reading (its own scoring
components [19]–[20] in the SCORE files).

The 30 items — roughly the first 20 describe which form is in place, the last
10 measure structural pain:

1. Coordination of activities and control of results is effected primarily through peer pressure, and informal communication among members of project teams.
2. Activities are coordinated and results are controlled by holding people simultaneously responsible for the performance of at least two of the following: functional results; product results; market or regional results.
3. Personnel are grouped into market or product specific units.
4. People tend to focus all or most of their energies on what is in their "job description".
5. The organization has few or no "support personnel".  Everyone is involved in activities geared to producing and selling the product.
6. Top management acts as the primary sales force, attempting to make sure that the organization enjoys a steady stream of work.
7. People experience role conflict as they are subjected to contradictory expectations from multiple parts of the organization.
8. Top management leaves the decisions as to how to best accomplish objectives to unit heads or individual experts.
9. People are specialists (vs. generalists), performing in depth a narrow range of activities.
10. The CEO or the top management team makes the decisions, even with respect to daily operational matters.
11. People are confused about who is responsible for what or who is expected to do what, with and to whom.
12. Organizational units compete with one another for resources (e.g., staff, money, equipment).
13. Management uses competition to incite members to action and to motivate productivity; rewards are based on how one unit's results compare with another's results.
14. The marketing function of the organization is viewed as being separate and distinct from the manufacturing and design functions.
15. Job descriptions are not important; people do whatever must be done to get the product out the door.
16. Temporary groups made up of experts from diverse parts of the company who have knowledge relevant to a problem or opportunity come together to create and implement innovative ideas.
17. Managers do not have full control over the resources they need to accomplish their objectives.
18. Units within the organization are able to operate independently.
19. Formal communications procedures discourage members from communicating directly with persons performing other, different functions.
20. Formal communications procedures do not exist.
21. Organizational decision makers are at a disadvantage due to insufficient information.
22. People respond to others because of the power of position, as opposed to the power of expertise.  The experts are not sufficiently heard.
23. Duplication of effort is a problem for this organization.
24. Resources (financial, human and physical) are not easily transferrable from one unit or person to another.
25. The organization has too many generalists and not enough specialists.
26. There is insufficient depth of technological expertise on the part of the organization's specialists.
27. Too many decisions are made which, while in the best interests of a unit or individual, are not in the best interests of the organization as a whole.
28. Experiences gained in one area of the organization do not sufficiently benefit other areas.
29. Decisions regarding resource allocation do not take into sufficient consideration changes that are occurring in the marketplace.
30. Too many people in the organization are unaware of or unconcerned about how what they do (or fail to do) impacts upon the ultimate users of the organization's products.

### 3d. Culture — 28 items, scored to 11 culture types

Subscales (the 11 types): **Sales, Marketing, Experimental, Entrepreneurial,
Bureaucratic, Humanistic, Political, Professional, Deal Maker, Gambler,
Paternalistic.** The 140×11 activation matrix is already decoded. The report
can diagnose blends and also *culture conflict* (incompatible cultures coexisting
— there's a whole narrative library of pairwise culture-clash write-ups, e.g.
Deal Maker vs Professional, Gambler vs Paternalistic).

The 28 items:

1. Organization members are expected to display a high level of energy, and to keep going even when fatigued, over-stressed or ill.
2. Employees spend a lot of time talking with each other about job related and non-job related issues.
3. The power to influence decisions is dispersed throughout the organization; most employees can influence the decisions that affect them.
4. Employees spend a lot of time creating records to document their actions or inactions.
5. The organization encourages its people to take the risks inherent in openly declaring where they stand on issues.
6. The decision making process is logical and linear; there is little room for intuition.  The organization is not willing to take a "leap of faith," and does insist that decisions be based solidly on fact.
7. When faced with an environment which is in disorder, turbulent or rife with potential crises or sudden change, the organization puts its head in the sand, and waits for the storm to pass.
8. Employees feel that it's best to maintain a low visibility profile, and to avoid making waves.
9. The thoughts and beliefs that organization members have about the future are, "A grandiose scheme will save the day."
10. The distribution of rewards in the organization is entirely a function of results.  Trying hard doesn't count.  Neither do good intentions.  It is results that count.
11. The organization expects its people to be tough and aggressive; when the pressure mounts, it is expected that they will continue to be forcefule and to take it in stride. [sic]
12. The environment within the organization is highly ordered; employees are expected to maintain a neat and tidy work space and to avoid the appearance of chaos or confusion.
13. A significant amount of organizational effort is spontaneous, occurring in response to emerging opportunities and new ideas.
14. Organizational leadership behaves as though only strong profits and a high stock price can be allowed to matter as decisions are made to acquire, divest, layoff, drop product/service lines, etc.
15. The organization displays a high sense of urgency; there is the feeling that everything must be done immediately.
16. Organization members fondly remember "the good old days", viewing the past as better than the present or the future.
17. The organization's motto might well be, "Progress is our most important product."
18. Status or class distinctions are important and visible within the organization.
19. The organization has a lot of rules designed to constrain and control otherwise unruly, unreliable or unproductive people.
20. Newcomers are expected to learn and conform to the way things are done by the organization; they are discouraged from challenging or attempting to change organizational practices.
21. Within the organization, employees approach their jobs as though they are players in a competitive game; everyone seeks to win the coveted prize.
22. Employees are more likely to say "No" to a customer than to challenge an organizational procedure.
23. The organization expects its people to learn from mistakes and has created an environment in which it is safe to do so.
24. Organization members seem to measure their personal effectiveness on the basis of how much money they made (or failed to make).
25. The organization is courageous; it is not afraid of a fight, and is determined to win.
26. The organization seeks to recruit ambitious, talented fast-trackers.
27. Organization members are encouraged to work actively with customers to prevent or solve problems.
28. Organization members have a tendency to push decisions upward, refusing to take responsibility for a decision.

### 3e. Leadership Style — 21 items about one named leader

Every item begins "The %1 …" where %1 is the selected leader title. Subscales
(from the report workspace's module list): style blend **Facilitator, Striver,
Driver, Affiliator** plus influence approach **Negotiate, Direct, Enlist,
Involve, No-influence**. The report text confirms the model — e.g., *"is at
once a FACILITATIVE and STRIVING leader. He cares equally about the people and
the job to be done…"*; *"is at once a STRIVING and DRIVING leader. The job to
be done is all that matters…"* — a task-vs-people grid crossed with how the
leader gets compliance (trust/credibility vs. formal clout vs. deals).

The 21 items:

1. The %1 shows that he respects the rights of others.
2. The %1 makes his opinions known.
3. The %1 discourages disagreement with his point of view.
4. The %1 avoids disagreement or tension, or attempts to smooth things over in the event of conflict.
5. The %1 shows he values others' ideas and opinions.
6. The %1 tells people openly when they have failed to live up to his expectations.
7. The %1 resists new ideas suggested by others.
8. The %1 fails to make his expectations clear, forcing people to "second guess" his wishes.
9. The %1 listens actively, making sure he understands others' positions before accepting or rejecting their points of view.
10. The %1 recommends clear courses of action.
11. The %1 gets defensive when criticized, or attempts to make himself look "good" in comparison to others.
12. The %1 is indecisive.
13. The %1 builds on the ideas of others.
14. The %1 looks for challenges.
15. The %1 places blame; finds fault.
16. The %1 is vague and uncertain in his statements.
17. The %1 seems to enjoy setting up "trades" with people whereby parties to the agreement each get something in exchange for their contribution.
18. The %1 tells people not only what to do but how to do it, and assumes he has a right to do so, and the power to back up his demands.
19. The %1 is able to rely on friendship or the respect others' have for him to get things done.
20. The %1 tries to understand how others view a problem and then works with them to discover "best" solutions.
21. The %1 attempts to minimize his need for (or dependence on) others by doing things for himself.

### 3f. Two modules nobody has flagged yet

- **The Risk module (module 8, 27 items)** is its own question set — items on
  board involvement, second-in-command, quality deterioration, physical plant,
  turnover, rumor mill, top-team balance, "super salesman" CEO, succession
  grooming, CFO competence, Chairman/CEO split, budgetary control, cash-flow
  forecasting, costing systems, competitive agility, political/social/economic/
  technological change management, the "big project" bet, decision-maker greed
  (asked separately for CEO, CFO and second-in-command), wage control, and
  management layers. These feed the 33 risk dimensions (§4).
- **The Saleability Index** — a scored output we believe has never been
  mentioned in any prior pass. It combines Development Stage + Strategy +
  Structure pain + Leadership Style + Client Relationship into advice on *what
  the client is currently buyable for and how to sell to them*. Sample verbatim:
  *"A short term strategic perspective prevails in the organization. This will
  make it difficult to interest the %2 in products and services that require
  the spending of today's dollars…"*; *"Because the %1 of the organization is a
  very task focused individual, communications designed to sell additional
  products and services should be clear, concise and relatively formal."* There
  is a per-stage "SALES ADVICE" text block for each of the 8 stages in every
  SCORE file. For a product sold to advisors/consultants this is a complete,
  un-mined facet.

---

## 4. The healthy/unhealthy fit library (the "~30 items")

The "~30 items" are exactly **33 risk dimensions** (the risk engine's own label:
"RISK ISSUE 33"; an "Overall Risk" verdict sits on top). The full list, in the
program's own order:

Overall Risk; Board Involvement; External Focus; Physical Plant; Prod/Serv
Quality; Leaders Motivation; Info Processing; Morale; Turnover; Strategic
Congruity; One-Man Rule; Balanced Top Team; Management Depth; CFO Capability;
Dual Leadership; Financial Tracking; Competitive Response; Management Layers;
Cost Control; Mgmt Political Arena; Mgmt of Soc Change; Mgmt of Econ Change;
Mgmt of Tech Change; Market Responsiveness; The Big Project; Mgmt of Devel
Stage; Stage vs Strategy; Stage vs Structure; Stage vs Leadership; Stage vs
Culture; Strat/Structure Fit; Strat/Culture Fit; Struc/Culture Fit; Cultural
Blends Fit.

Each standalone dimension has a **three-level write-up** (healthy / middling /
unhealthy). Verbatim example, One-Man Rule:

> *Healthy:* "The organization does not suffer from one man rule, nor from the
> loss of vitality that occurs when the Chief Executive is excessively dominant
> or autocratic."
> *Middling:* "The organization suffers at least somewhat from 'one man rule'.
> The Chief Executive occasionally makes decisions without accessing the
> opinions of others…"
> *Unhealthy:* "The organization suffers from 'one man rule'. Either there are
> too few people filling leadership roles, or the executive in place tends to
> make decisions unilaterally."

On top sits a 7-rung overall verdict ladder from "The organization appears to
be extremely healthy…" down to "The organization is in real trouble. It is
likely that lack of vitality will result in business collapse." Each rung
exists in two parallel wordings — one speaks of business *failure/collapse*,
the other of *stagnation/decline*. We think the second wording is used for the
Large versions, not confirmed.

The last ~9 dimensions are the **fit checks**, and each carries real written
content:

- **Stage management**: per-stage "benefit + crisis" texts that are clearly a
  Greiner-style growth model — Launch = entrepreneurship / crisis of
  leadership; Course Find = clear direction / crisis of delegation; Auto Pilot
  = professional management / inability to change; Acceleration = functional
  rigor / crisis of coordination; Projectile = market responsiveness and
  initiative / crisis of control; Modulation = fluidity and coordination /
  crisis of red tape; Refuel = innovative market-oriented culture / crisis of
  cohesiveness; Stall = strong role model / having to make tough decisions.
- **Stage vs Strategy**: a prescribed strategic profile per stage, e.g.
  *"Launch organizations should place a somewhat greater emphasis on the SHORT
  TERM than on the long term; should accept some degree of RISK; and need to
  balance INTERNAL and EXTERNAL constraints…"* (one paragraph per stage, all 8
  present).
- **Stage vs Structure** — the "ideal structure per growth stage" content the
  scoping brief mentioned. Per stage, the prescribed form(s):
  - Launch → SIMPLE, or ORGANIC-AND-SIMPLE
  - Course Find → SIMPLE, or SIMPLE blended with FUNCTIONAL HIERARCHY
  - Auto Pilot → FUNCTIONAL HIERARCHY, or SIMPLE with functional/divisional traits
  - Acceleration → FUNCTIONAL HIERARCHY, or FUNCTIONAL HIERARCHY with divisional traits
  - Projectile → DIVISIONAL
  - Modulation → MATRIX, or DIVISIONAL with matrix traits
  - Refuel → ORGANIC
  - Stall → DIVISIONAL/SIMPLE or MATRIX/SIMPLE (strong role model making most decisions)
  Each is a full written paragraph defining the form in plain English.
- **Stage vs Culture**: prescribed culture blends per stage — Launch →
  Sales/Entrepreneurial/Gambler/Deal Maker; Course Find →
  Sales/Marketing/Experimental; Auto Pilot → Sales/Marketing/Professional;
  Acceleration → Sales/Marketing/Deal Maker; Projectile →
  Sales/Marketing/Entrepreneurial/Deal Maker; Modulation →
  Marketing/Experimental/Professional; Refuel →
  Marketing/Experimental/Entrepreneurial (with the note that *"Political,
  Bureaucratic and Paternalistic cultures get in the way of organizational
  revitalization"*); Stall → Marketing/Entrepreneurial/Deal Maker/Gambler.
- **Stage vs Leadership**: prescribed CEO profile per stage (Launch/Course Find
  → a fair, tough-minded Striver; Auto Pilot/Acceleration → balanced
  task/people; Projectile → control with autonomy; Modulation → "benevolent
  dictator" who develops leaders; Refuel → strong cultural leader blending
  teamwork with rigor; Stall → very strong, task-focused decision-maker).
- **Strat/Structure, Strat/Culture, Struc/Culture, Cultural Blends**: a library
  of specific pairwise incongruity write-ups, e.g. *"The FUNCTIONAL HIERARCHY
  does not support a strategy of RISK ACCEPTANCE"*, *"The Gambler culture
  encourages employees to make rapid fire decisions… The Simple structure,
  however, tends to break down when too many people are initiating activities
  which put the organization at risk."*

**Same across industries?** Verified, not assumed: we dumped the full prose of
GPMRISK (Manufacturing), GPSRISK (Service) and GPARISK (Large Manufacturing)
and diffed them. GPM vs GPA: 4 differing lines, all trivial. GPM vs GPS: ~30
line-pairs differ, every one a single-word or whitespace edit ("suffers at
least somewhat" vs "suffers somewhat", "slightly" vs "somewhat"). **The risk
and fit write-up library is substantively one shared text across all
industries.** What *does* differ per industry is the scoring calibration — the
risk engine reads industry-specific R-MIN/R-MAX normalization tables, and the
stage triplet criteria (components [11]–[34]: per-stage "Issues Factors, Issue
Criteria, Situation Criteria") carry industry-tuned weights. The enhanced-risk
weighting found in the engine: the four stage-fit dimensions are weighted
10 / 20 / 8 / 15 (Stage-vs-Strategy getting the heaviest, 20).

## 5. The growth-stage transition chart (GNGRAPH.ASF)

GNGRAPH.ASF is a chart-definition file for two 1980s charting packages
(Graphwriter and Harvard Graphics; the report menu offers "Create Graphic File
for GRAPHWRITER / HARVARD GRAPHICS"). Its own directory says: *"Stage Names,
Shading Patterns, X Positions, Y Posititions."* The chart itself (drawn in the
SCORE files as ASCII too) plots the stage ladder **Launch → Course Find → Auto
Pilot → Acceleration → Projectile → Modulation → Refuel / Stall** against an X
axis labeled **"RATE OF GROWTH/CHANGE" (LO → HI)**.

The transition map is explicit — each named state gets its own chart variant,
and the named transitions are:

- LAUNCH → COURSE FIND
- COURSE FIND → AUTO PILOT
- COURSE FIND → ACCELERATION (a fast path that skips Auto Pilot)
- AUTO PILOT → ACCELERATION
- ACCELERATION → PROJECTILE
- PROJECTILE → MODULATION
- MODULATION → REFUEL (the healthy renewal path)
- MODULATION → STALL (the decline path)
- REFUEL → MODULATION (renewal cycles back)
- STALL → REFUEL (recovery from stall)

plus two extra states: **SLOW GROWTH** and **"No Clear Stage"** (used when
stage scoring is inconclusive). So the model is: a main sequence of six stages,
a fork at Modulation into either Refuel (revitalize) or Stall (decline), and a
recovery edge from Stall back through Refuel. Chart filenames in the file
(LAUN.CHT, L-CF.CHT, CF-ACC.CHT, MOD-ST.CHT, ST-REF.CHT, NOSTAGE.CHT, …) match
one-to-one.

## 6. How much the question text changes per industry

Verified by diffing full dumps of the question files:

- **Large vs small of the same industry: the question text is identical.**
  GPM vs GPA (Manufacturing vs Large Manufacturing): every substantive line
  matched. GPS vs GPB: 171 of 174 lines matched. The large/small split lives in
  the scoring calibration and demographics bands, not the questions.
- **Across industries the org-facing modules are genuinely adapted**, not
  find-and-replace: Manufacturing vs Service share about 63% of lines; Service
  swaps product items for service-specific ones (e.g. "high tech vs high touch"
  industry descriptor, "procedural guidelines which enable less experienced
  people to perform the service", leverage-of-expensive-talent items).
  Restaurant is the most heavily rewritten (only ~20% of lines shared with
  Manufacturing). So: do **not** treat one industry's Dev
  Stage/Strategy/Structure/Culture bank as canonical for all eight; treat GPM
  (or GPA — same text) as the base and diff in the others.
- **Leadership Style and Client Relationship are the same across all eight**
  (two single-word wording differences in Leadership between M and S; zero in
  Client Relationship).

## 7. The Touche Ross CSP program, now fully characterized

The CSP bundle = one questionnaire engine (GPCSP.AWS, version 1988-06-01,
screen header "The Organization Reappraisal") + two combine/report workspaces
(GPDDMS.AWS and GPDDRR.AWS, both version GP9106, screen header "Touche Ross -
CSP System") + help, maintenance, and chart files. The engines don't carry
questions; they load the same eight GP?QUEST/SCORE/RISK banks (the sysid list
inside GPDDMS.ASF/GPDDRR.ASF names all eight). The DD workspaces add the
**multi-rater machinery**: a "Combine files" menu item, LOW/HIGH/COMB/RELC/AVG/
RELA statistics per subscale, significant agreement/disagreement flags, and
chart export — this is what produced the dated 1992 eight-rater COMBO report
(MV6COMBO.ASC/.HGF). The ~20 small saved-assessment files follow the pattern
`<industry letter><GP><rater initials>.ASF` (MGPJIMK = Manufacturing, rater
JIMK; SGPDICK = Service, rater DICK; TGPWILC = Restaurant, rater WILC).
We could not determine what the MS / RR suffixes on the two workspaces stand
for (the code itself jokes "# SAME FUNCTION IN RR AND MS"); the only functional
difference we found is that the MS data file carries separate Manufacturing and
Service R-MIN/R-MAX risk tables while RR carries a single RMIN/RMAX pair.

**One discrepancy worth knowing about:** the CSP help file describes an older,
different battery — "DIAGNOSING YOUR CLIENT ORGANIZATION", Part One = questions
1–9, Part Two = questions 10–131, "approximately one hundred items" across the
six topics. **That 131-question file is not in this file set.** Everything
actually present runs the 180-question banks. We think the help text is a
leftover from the 1986–87 Touche Ross edition whose question file was never
copied forward; the content that exists today is the 180-item version.

## 8. What we could not open or decode (and what we didn't need to)

- The APL function bodies are stored tokenized; APL's symbol glyphs don't
  survive ASCII extraction, so the code logic is only partially readable. All
  *stored text* (questions, report narratives, menus, help) is plain ASCII
  inside the component files and came out cleanly — nothing content-bearing is
  locked up. Exact re-derivation of the arithmetic would need an APL*PLUS
  component-file decoder; the prior pass already decoded the three main scoring
  bit-matrices into `matrices/*_decoded.json`, which covers Dev Stage, Culture
  and the stage risk flags. The Strategy/Structure/Leadership/Relationship
  activation tables are in the same files and decodable by the same method —
  that's the one real piece of remaining decode work.
- COMBO.PRN and WILC.PRN are 1 byte each — confirmed empty print placeholders.
- No nonprofit variant appears in any archive's internal file list either
  (the PKSFX directories enumerate everything that was ever shipped in these
  bundles).

## 9. What this means for Toddito facet-mining

Everything needed for five more facets is on disk and readable today:

1. **Development Stage** — 24 items + 9 descriptors, 8-stage model with a real
   transition map (§5), per-stage crisis texts, decoded scoring matrix already
   in the repo.
2. **Strategy** — 25 items, 5 bipolar axes, per-stage prescribed strategic
   profiles.
3. **Structure** — 30 items, 5 forms + 5 impact dimensions + "need for change"
   reading, per-stage ideal-structure prose.
4. **Culture** — 28 items, 11 types, decoded scoring matrix, plus a
   culture-conflict library.
5. **Leadership Style** — 21 items about one named leader, style grid +
   influence modes, per-stage ideal-leader prose.

Plus two bonus assets: the **33-dimension risk/fit library** (shared across
industries — mine once) and the **Saleability Index** (stage-aware
sell-to-this-client advice — arguably the most Toddito-shaped content in the
whole system, and previously uncatalogued).
