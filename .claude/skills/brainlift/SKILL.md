---
name: brainlift
description: Build a BrainLift — structured, curated knowledge (Owners, Purpose, Spiky POVs, Experts, Insights, Knowledge Tree) designed to be pasted into AI conversations as context. Use when the user asks to write, draft, structure, or critique a BrainLift, brainlift, SPOV, spiky point of view, or DOK 1-4 knowledge tree.
---

# BrainLift

A BrainLift is curated, structured context that a human builds by passing information through their own brain, then hands to an AI in conversation. It is NOT an AI-generated summary. The deliverable is a document organized by Depth of Knowledge (DOK 1-4) that climbs from raw facts to genuinely contrarian, defensible points of view.

## What a BrainLift is for (and is not)

- **For**: developing knowledge and "spiky points of view" an AI cannot generate on its own; building structured context to paste directly into AI conversations.
- **Not for**: using AI to synthesize/summarize the knowledge for the user; replacing the user's own thinking; building a RAG pipeline (this is direct context, not a retrieval database).

Your job as the agent: help the user *structure and pressure-test* their thinking. Do NOT invent insights or POVs and present them as the user's. Ask for their raw material, sources, and opinions, then organize and challenge them.

## The single most important rule: SPOVs must be genuinely controversial

A Spiky POV is the pinnacle (DOK 4). "Spiky" means it would make an informed expert in the field *want to argue back*. If a knowledgeable practitioner reads it and nods "sure, obviously," it has failed and must be rewritten or cut.

Apply the **controversy test** to every SPOV before keeping it:

1. **The contradiction test** — Does a real, credentialed group currently believe and act on the opposite? Name them. If no serious person holds the opposing view, it is not spiky.
2. **The "duh" test** — Could a generic LLM produce this in one shot from common knowledge? If yes, it is a platitude, not a spiky POV. Kill it.
3. **The skin-in-the-game test** — Does acting on this POV change a real, expensive decision (what to build, how to teach, what to cut)? A POV with no operational consequence is an observation, not a stance.
4. **The enemy test** — Can you state, in one sentence, the respectable position this POV attacks? If you can't name the enemy, the POV isn't taking a side.

Phrase SPOVs as **strong, declarative assertions**, often naming the thing they reject. Good spiky phrasing patterns:
- "Most X is actively harmful, not just ineffective, because..."
- "The entire X debate is a red herring; the real question is Y."
- "We treat X like a casual craft, but it demands the rigor of Y."
- "The belief in universal X is a design flaw."

Weak, non-spiky phrasing to avoid: "X can be beneficial," "It's important to consider X," "X has both pros and cons," "A balanced approach to X."

Every SPOV needs an **Elaboration** that defends it by synthesizing specific DOK 3 Insights and DOK 2 evidence — name the studies/experts, state effect sizes when available, and explain the implication. A spiky claim without evidence is just a hot take.

## Build order (bottom-up — facts first, POVs last)

Build from the foundation up. You cannot write defensible SPOVs without the layers beneath them.

```
Build:   DOK 1 facts → DOK 2 knowledge tree → DOK 3 insights → DOK 4 SPOVs
Present:  Owners → Purpose → DOK 4 SPOVs → Experts → DOK 3 Insights → DOK 2 Knowledge Tree
```

(The document is *presented* SPOVs-first because that's the highest-value context for the AI, but it is *built* facts-first.)

| Layer | What it is | The skill being exercised |
|-------|-----------|---------------------------|
| DOK 1 – Facts | Raw, objective statements lifted from a source | Recall |
| DOK 2 – Knowledge Tree | Facts organized into categories + summarized in your own words | Comprehension / synthesis |
| DOK 3 – Insights | Original conclusions/connections you drew across sources | Critical thinking |
| DOK 4 – SPOVs | Contrarian, actionable stances built by overlapping insights | Original argument |

An Insight (DOK 3) is the bridge: it must be *your* new connection across sources, not a restatement of one fact. SPOVs are forged by **overlapping multiple insights**, often from different domains.

## Workflow

Copy this checklist and track progress:

```
- [ ] 1. Establish Owners + Purpose (the North Star), In/Out of Scope
- [ ] 2. Gather sources; extract DOK 1 facts into the DOK 2 Knowledge Tree
- [ ] 3. Identify Experts whose work grounds the domain
- [ ] 4. Derive DOK 3 Insights (original connections across sources)
- [ ] 5. Forge DOK 4 SPOVs by overlapping insights
- [ ] 6. Run the controversy test on every SPOV; cut/sharpen failures
- [ ] 7. Verify each SPOV's Elaboration cites real DOK 2/DOK 3 evidence
```

1. **Purpose & scope** — Write one crisp "North Star" sentence. Then list concrete In Scope and Out of Scope bullets. Tight scope is what prevents the BrainLift from drifting into a generic survey.
2. **Knowledge Tree** — Organize broad Category → Subcategory → Source. Under each source list DOK 1 facts (verbatim-ish, objective), then a DOK 2 summary in the user's own words, then the link. Prefer primary research over blogs; replace commercial/SEO posts with peer-reviewed sources where possible.
3. **Experts** — For each: Who (name + title), Focus, Why Follow (tie explicitly to this BrainLift's purpose), Where (Scholar/site/profile links).
4. **Insights** — Group thematically (often by Knowledge Tree category). Each is one complete original thought. Mark contrarian ones.
5. **SPOVs** — Combine insights into strong assertions + evidence-backed elaborations. This is where the controversy test gates everything.

## Output template

Produce the BrainLift in this structure (Markdown). Keep the user's exact wording verbatim where they supplied it.

```markdown
# BrainLift: [Title]

## Owners
- [Name(s)]

## Purpose
**Core goal:** [One North Star sentence defining the central question/mission.]

### In Scope
- [Specific topic / domain / deliverable]

### Out of Scope
- [What you deliberately exclude]

## DOK 4 — Spiky Points of View

**SPOV 1: [Strong, contrarian, declarative assertion that names what it rejects.]**
Elaboration: [Defend it. Synthesize specific DOK 3 insights + DOK 2 evidence (name studies, experts, effect sizes). State the implication and why it's novel/important. Name the respectable position it attacks.]

**SPOV 2: [...]**
Elaboration: [...]

## Experts

### [Expert Name]
- **Who:** [Name + title/affiliation]
- **Focus:** [Primary expertise / known theories]
- **Why Follow:** [How their work grounds THIS BrainLift's purpose]
- **Where:** [Links: Google Scholar, site, profile]

## DOK 3 — Insights

**From [Theme / Knowledge Tree category]**
- Insight 1: [Original conclusion or cross-source connection.]
- Insight 2 (Contrarian): [...]

## DOK 2 — Knowledge Tree

### Category 1: [Broad topic]
#### Subcategory 1.1: [Specific topic]
- **Source:** [Title of article/book/study]
  - **DOK 1 — Facts:**
    - [Objective fact]
    - [Objective fact]
  - **DOK 2 — Summary:** [Synthesis in the user's own words.]
  - **Link:** [URL]
```

## Quality bar before finishing

- [ ] Every SPOV passes the contradiction, "duh", skin-in-the-game, and enemy tests.
- [ ] Every SPOV elaboration cites specific evidence (named experts/studies, ideally with numbers).
- [ ] Each DOK 3 insight is an original connection, not a paraphrased fact.
- [ ] Knowledge Tree sources are primary/credible and every source has a working link.
- [ ] Purpose has explicit In/Out of Scope; nothing in the doc drifts outside it.
- [ ] No claim was invented by the agent and attributed to the user. Flag any gaps for the user to fill.

For three fully worked BrainLifts (with examples of strong vs. weak SPOVs), see [examples.md](examples.md).
