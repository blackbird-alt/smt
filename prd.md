# Brillyant — Product Requirements Document

**Product:** Brillyant — a learn-by-doing course in **Probability & Statistics**
**Status:** Phase 1 (MVP) — built, deployed, and public
**Live:** https://stuff-18453.web.app
**Last updated:** 2026-06-24

---

## 1. Summary

Brillyant is a single-subject, learn-by-doing web app modeled on Brilliant. It teaches **Probability & Statistics** by dropping the learner into a problem, letting them poke at it, giving instant hand-written feedback, and only then revealing the idea behind it. There are no videos and no walls of text — the learner taps charts, drags outliers, moves sliders, runs simulations, and reads worked solutions.

The project is built in three phases, in a strict order:

| Phase | Deadline | Scope |
|-------|----------|-------|
| **1 — MVP** | Wednesday | The core learn-by-doing app. **No AI.** |
| **2 — AI** | Friday | Decide what AI should do here, then build it. |
| **3 — Learning science** | Sunday | Layer evidence-based techniques (spacing, adaptive review) on top. |

This document specifies Phase 1 in full and sketches Phases 2–3. The guiding rule: **if the app doesn't teach without AI, no AI will save it.**

## 2. Problem & vision

Passive content does not stick; active problem-solving does. Most "interactive" courseware is really a click-next slideshow with a quiz at the end. The hard ideas in statistics — why the median resists outliers, why correlation isn't causation, what a p-value actually means, why a confidence interval is about the *method* — only click when the learner can manipulate them and watch the result change.

**Vision:** a course where someone who starts knowing little finishes understanding something real, because every idea was something they *did*, not something they read.

**The deciding principle is depth over breadth.** Five excellent lessons that build on each other beat thirty thin ones. Brillyant maps one real learning path through Probability & Statistics and makes each step teach.

## 3. Subject choice & rationale

**Chosen subject: Probability & Statistics.** It is an ideal fit for learn-by-doing because nearly every concept has a manipulable visual:

- Centers and spread → drag a point and watch the mean chase it while the median holds.
- Correlation → drag scatter points and watch *r* and the regression line update live.
- Probability → sample from a bag or flip coins many times and watch empirical rates converge to theory.
- Distributions → adjust parameters and watch the shape respond.
- Inference → shade areas under a normal curve; run repeated confidence intervals and see the capture rate.

These are causal, immediate, and visual — exactly the interactions the brief asks for.

## 4. The learner: math level → persona

Brillyant is built for **one** clearly-defined learner. To find that person, first pin down the actual mathematical level of the content, then design for whoever lives at exactly that level.

### 4.1 The math level of Brillyant

The course is **introductory, algebra-based Probability & Statistics — the AP Statistics / first-college "Stats 101" level.** Concretely:

- **Prerequisite math:** arithmetic, fractions and percentages, and comfort with basic algebra — substitute values into a formula, evaluate it, take a square root, and solve a one-step equation.
- **What it teaches at that level:** sample standard deviation (dividing by n − 1), z-scores, the 1.5 × IQR outlier rule and five-number summary; least-squares regression read for slope/intercept, r and r²; probability rules, tree diagrams, and counting with permutations/combinations; binomial probabilities with C(n, k), mean = np and SD = √(np(1 − p)); the empirical rule, normal areas from a table, the Central Limit Theorem and standard error; confidence intervals as estimate ± z*·SE with sample-size planning; and (premium) z-tests with p-values, two-sample comparisons, chi-square with degrees of freedom, and inference for a regression slope.
- **The emphasis is conceptual, not theoretical:** pick the right tool, apply the formula correctly, and — above all — explain what the result *means*. It uses standard tools (z-tables, given critical values) and does not ask the learner to derive or prove the formulas.

This scope is, almost line for line, the **College Board AP Statistics syllabus** (exploring data → regression → probability → random variables/binomial → normal & sampling → confidence intervals → significance tests → chi-square → inference for regression).

### 4.2 The persona this level attracts

Maya Chen — "the AP Statistics student"

- **Snapshot:** 17, high-school junior taking AP Statistics. Comfortable with algebra and plugging numbers into formulas, but quietly convinced she's "not a math person."
- **Where she's at:** she can compute an answer — evaluate a formula, find a mean — but she struggles to say what the number *means* or how to visualize and put the math into practice. The mechanics are fine; the understanding is shaky.
- **Context:** studies on her phone in 10–20 minute pockets — after practice, before bed — plus heavier review the night before a quiz. The AP exam looms in May.
- **Goals:** move past "plug and chug" to actually *understand and interpret*, because AP free-response rewards explaining what a confidence interval or p-value means, not just computing it. Build intuition for the abstract parts (sampling distributions, the CLT, inference) that the textbook makes opaque.
- **Frustrations:** the textbook is a dense wall of symbols; formulas feel arbitrary and disconnected; she can compute an SD but can't say *why* it matters; a bare "incorrect" with no explanation makes her shut the book; long videos don't fit her schedule.
- **What success looks like:** keeps a streak alive, finishes chapters in order, and can explain out loud why the median resists an outlier, why r isn't causation, and what 95% confidence actually refers to — walking into the AP exam with the mechanics *and* the interpretation automatic.
- **Why Brillyant fits her exactly:** the level meets her where she is — the same tools she already uses (z-tables, a given z*) and a chapter path that mirrors her syllabus; the hands-on figures build the interpretation skill the AP rewards; instant hand-written feedback turns a wrong answer into a recovery instead of a dead end; and short steps with XP, levels, and streaks fit a busy teenager and pull her back tomorrow.

> *"I can do the formula. I just don't get what it's telling me — and the test wants me to explain it."* — Maya

## 5. Product principles

1. **Learn by doing.** Every step makes the learner act, then explains. No video, no text walls.
2. **Depth over breadth.** One subject, a real path, each lesson teaches.
3. **Instant, specific, human feedback.** Hand-written hints and explanations, never a bare red X.
4. **No AI in the MVP.** All content and grading are hand-built (hard Phase-1 rule).
5. **Mobile-first.** Touch interactions, short sessions, fast loads.
6. **Make coming back feel good.** XP, levels, streaks, and visible progress.

## 6. Phase 1 — MVP scope & acceptance

### 6.1 Acceptance criteria (gate traceability)

| # | Requirement | How Brillyant satisfies it |
|---|-------------|----------------------------|
| 1 | No AI features | Zero model calls / generated content; dependencies are only `firebase`, `react`, `react-dom`. |
| 2 | Chosen subject + persona, stated clearly | Subject shown on login, page title, and `course.json`; the persona (Maya, an AP Statistics student) is defined in §4. |
| 3 | Interactive lesson on a real concept | Chapters 1–6 are sequences of typed interactive steps, not video/text. |
| 4 | ≥1 directly-manipulated problem | Drag an outlier, drag scatter points, move sliders, tap chart bars / number-line points. |
| 5 | Interactive visual that responds | Live dot plots, draggable scatter + least-squares line, normal-curve shading, simulators. |
| 6 | Instant, specific, hand-written feedback | Client-side grading (<100ms); authored `feedback.wrong`, progressive hints, gated `solution` + takeaway. |
| 7 | Progress persists across sessions/devices | Firestore-backed progress; resume mid-chapter. |
| 8 | Accounts and names | Username+password or Google sign-in; display name captured. |
| 9 | Works on mobile | Responsive layout, viewport meta, touch (pointer) interactions. |
| 10 | Deployed and public | Firebase Hosting at the live URL above. |

### 6.2 Non-goals (MVP)

- **No AI of any kind** — no model calls, generated content, or chatbot tutor.
- No real payments (the "premium" paywall is a deliberate joke and charges nothing).
- No content-authoring UI; lessons are authored as JSON in the repo.
- No **native** mobile apps (no separate iOS/Android App Store build). Mobile is fully supported and required — the app is a responsive, touch-friendly web app that works on phone screen sizes (see §9 and §13).

## 7. The course (depth path)

The subject is delivered as a course path (`src/content/course.json`). Each chapter is a short sequence of interactive steps and opens with a concept intro plus a **Key terms** glossary. The free chapters build deliberately on one another — averages → relationships → probability → distributions → inference — so a beginner can start at zero and arrive at real statistical reasoning.

| # | Chapter | Core concepts | Tier |
|---|---------|---------------|------|
| 1 | Averages & Variation | mean, median, mode, weighted mean, SD, z-scores, IQR outlier rule | Free |
| 2 | Correlation & Regression | scatterplots, r, regression line, prediction, r², causation | Free |
| 3 | Elementary Probability | complements, addition with overlap, independence, conditional, trees, counting | Free |
| 4 | Binomial Distribution | binomial settings, combinations, P(k), mean, SD, shape | Free |
| 5 | Normal Curves & Sampling | empirical rule, z-scores, areas, CLT, sampling distributions | Free |
| 6 | Estimation | point estimates, standard error, margin of error, confidence intervals, sample size | Free |
| 7–10 | Hypothesis testing, two-group comparison, chi-square, regression inference | — | Premium (gated) |

> Premium chapters (7–10) are intentionally locked behind a joke paywall and are not part of the graded free experience. Selecting one shows the paywall and returns to the dashboard. They can be un-gated by flipping the `premium` flag in `course.json`.

## 8. Content model

A chapter is a JSON object with an ordered `steps` array. Each step is **typed** — `type` maps to a dedicated React renderer — and is self-describing, so new lessons can be authored without touching component code. This is the model that lets content scale fast now and lets AI generate lessons in Phase 2.

Common step fields:
- `id`, `type`, `title`
- `context` / `prompt` — the situation and question (light markdown: `**bold**`, `*italic*`).
- `hints` — ordered array, revealed one at a time on request.
- `feedback.wrong` — a short, hand-written nudge shown on an incorrect answer.
- `solution.body` + `solution.takeaway` — the gated worked solution shown after a correct answer.
- Type-specific data (`options`, `bars`, `cells`, `points`, `seriesA/seriesB`, `preset`, …).
- `synthesis: true` — marks capstone problems (worth more XP).
- On `intro` steps: `definitions: [{ term, definition }]` renders the Key terms glossary.

### Step types (representative)

| Category | Types |
|----------|-------|
| Concept | `intro` (with optional definitions glossary) |
| Choice | `tap-choice`, `distribution-choice`, `outcome-select` |
| Numeric | `number-input` |
| Direct manipulation | `outlier-drag`, `slider-prediction`, `correlation-sandbox`, `weight-slider`, `drag-sort` |
| Tap-on-visual | `bar-chart-tap`, `z-compare`, `venn-tap`, `contingency-table` (with a fraction follow-up) |
| Simulations / figures | `bag-simulator`, `coin-flip-explore`, `binomial-explore`, `ci-simulator`, `normal-shade`, `normal-probe`, `scatter-match`, `scatter-display`, `dot-plot-compare`, `box-plot`, `prob-tree` |

## 9. Functional requirements

### 9.1 Lessons & grading
- Render any chapter from its content model as a step-by-step flow with a page-progress indicator.
- Capture the learner's interaction and grade it **client-side in under 100ms**.
- Wrong answer → show the hand-written `feedback.wrong` and offer progressive hints; never a bare red X.
- Correct answer → show the worked `solution` and a one-line takeaway, then continue.
- Resume a chapter at the saved step, restoring prior answers; completing a problem saves forward progress immediately (leaving without "Continue" still advances).
- "Review mode" for completed chapters: replay with answers and solutions shown, no new XP.

### 9.2 Direct manipulation & visuals
- At least one problem per relevant chapter uses drag / slider / tap-to-plot.
- Interactive figures update live as the learner acts (the mean marker slides as an outlier is dragged; r and the regression line update as scatter points move; empirical rates converge as a simulation runs).

### 9.3 Accounts
- Sign up / sign in with **username + password** (mapped to an internal Firebase email/password account) or **Google**.
- Capture a display name (the username, or the Google profile name).
- In-app password change and account deletion; sign-out always returns to the dashboard.
- No email verification (removed in MVP to keep onboarding frictionless).

### 9.4 Course path & mastery
- Dashboard shows chapters, per-chapter status (Start / Continue / Review / Locked), and an **"Up next"** recommendation (first incomplete chapter).
- Per-chapter completion is tracked as a milestone; progress survives across sessions and devices.
- *Planned (Phase 3):* surface a review or easier step after a problem is missed repeatedly.

### 9.5 Habit loop
- **XP:** +10 for a standard correct answer, +25 for a synthesis/capstone, awarded **once per problem** (re-answering an already-solved problem awards nothing).
- **Levels & celebration:** a transient XP bar animates the gain on each correct answer; every 100 XP is a new level, triggering a level-up popup and a confetti burst.
- **Streaks & milestones:** daily streak based on last-active date; completed chapters recorded as milestones; stat cards show XP, streak, and progress at a glance.

### 9.6 Theming
- Light and dark themes, system-aware on first visit, with a manual toggle; choice persists in `localStorage` and is applied pre-paint to avoid flashes.

## 10. UX / screens

- **Login** — subject pitch, sign in / sign up tabs (username + password), Google option, theme toggle.
- **Course home (dashboard)** — XP / streak / progress stat cards, "Up next" card, full chapter list, profile chip.
- **Lesson player** — page progress, current step, hints, feedback/solution, transient XP toast, previous-step navigation, restart.
- **Profile** — display-name edit, change password, sign out, delete account, theme toggle.

All screens are responsive and touch-friendly, centered with a mobile-first max width.

## 11. Technical architecture

- **Frontend:** React 19 + Vite 8 (SPA). Plain CSS with a CSS-variable design-token system powering light/dark themes.
- **Auth:** Firebase Authentication (Email/Password + Google).
- **Data:** Cloud Firestore (per-user profile and per-chapter progress).
- **Hosting:** Firebase Hosting (SPA rewrite to `index.html`).
- **No backend services or AI APIs.** Grading and all logic run in the client from the content model.

```
src/
├── content/{course.json, lessons/*.json}   # course path + per-chapter content
├── components/                              # screens, step renderers, XP/theme/icons
├── hooks/{useAuth, useProgress, useTheme}
├── lib/{grading, stats, binomial, normalTable, auth, account, profile, progress, review}
└── firebase.js
```

## 12. Data model (Firestore)

```
users/{uid}
  displayName, email, photoURL, xp, streak, lastActiveDate, milestones[], createdAt, updatedAt

users/{uid}/progress/{lessonId}
  currentStepIndex, stepStates{ [index]: stepState }, completed, completedAt, updatedAt
```

**Security:** a user may read and write only their own `users/{uid}` document and its `progress` subcollection (`request.auth.uid == userId`).

## 13. Non-functional / performance targets

| Area | Target |
|------|--------|
| Answer feedback | < 100 ms (client-side grading) |
| Interactive visuals | smooth at ~60 FPS while manipulating |
| First interaction | < 2 s on a typical mobile connection |
| Concurrency | many simultaneous learners with no slowdown (static hosting + per-user docs) |
| Devices | works on phone-sized screens with touch input |
| Accessibility | semantic controls, ARIA labels on icon buttons, `prefers-reduced-motion` respected |

## 14. MVP testing scenarios

These mirror how the gate will be tested:

1. **Complete a lesson end to end, get some wrong, recover.** Learner works a chapter, sees hand-written feedback + hints on misses, and reaches the worked solution. ✔
2. **Manipulate the interactive element and watch the visual respond in real time.** e.g., drag the outlier and watch mean vs median; drag scatter points and watch r/line update. ✔
3. **Leave mid-lesson and return; progress and streak persist.** Resume at the saved step on any device. ✔
4. **Finish a lesson; the path recommends a sensible next step.** Dashboard "Up next" points to the next incomplete chapter. ✔
5. **The whole thing on a phone-sized screen.** Responsive, touch-friendly. ✔

## 15. Phase 2 (AI) — direction

Layered on the same content model, with the MVP fully functional without it:
- **AI lesson/problem generation** into the existing typed-step schema, with human review.
- **An on-demand tutor/explainer** for hints that go beyond the authored ones.
- **Adaptive difficulty** suggestions based on a learner's misses.

## 16. Phase 3 (Learning science) — direction

- **Spaced repetition** of previously-mastered concepts.
- **Adaptive review:** detect repeated errors and insert an easier step or a review before moving on.
- **Mastery modeling** per concept to drive the path and recommendations.

## 17. Risks & open questions

- **Adaptive remediation** is not in the MVP (unlimited hints, no auto-review); it's slated for Phase 3.
- **Bundle size:** ~275 KB gzipped — fine for the < 2 s target, but code-splitting is a candidate as content grows.
- **Username scheme:** usernames map to internal email addresses for Firebase; invisible to users, but worth documenting if real email is ever needed.
- **Premium framing:** the joke paywall is intentional; chapters 7–10 can be un-gated if reviewers expect them playable.

## 18. Release & deployment

```bash
npm run build
npx -y firebase-tools@latest deploy --only hosting,firestore:rules
```

The app is deployed to Firebase Hosting and publicly reachable at the live URL above.
