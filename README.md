# Brillyant

**Subject: Probability & Statistics**

Brillyant is a learn-by-doing app modeled (very closely, with a suspicious "y") on Brilliant focusing on one subject taught deeply through interactive problems. Instead of reading walls of text, learners tap bar charts, drag outliers, run simulations, fit regression lines, shade normal curves, and read confidence intervals, with instant client-side feedback and gated, worked solutions.

**Persona:** Alex, a curious student who learns best by experimenting rather than memorizing formulas.

## Live demo

**https://stuff-18453.web.app**

## The course

A full Probability & Statistics path. Each chapter opens with a short concept intro plus a **Key terms** glossary, then a sequence of interactive problems with progressive hints and a gated solution + takeaway.

| # | Chapter | Topics |
|---|---------|--------|
| 1 | Averages & Variation | mean, median, mode, weighted mean, standard deviation, z-scores, IQR outlier rule |
| 2 | Correlation & Regression | scatterplots, r, regression line, prediction, r², correlation ≠ causation |
| 3 | Elementary Probability | complements, addition with overlap, independence, conditional probability, trees, counting |
| 4 | Binomial Distribution | binomial settings, combinations, P(k), mean, SD, shape |
| 5 | Normal Curves & Sampling | empirical rule, z-scores, areas, CLT, sampling distributions |
| 6 | Estimation | point estimates, standard error, margin of error, confidence intervals, sample size |
| 7–10 | Premium chapters | hypothesis testing, two-group comparison, chi-square, regression inference — gated behind a (joke) paywall |

## Features

- **Typed, interactive steps** — one React renderer per step type (bar-chart tap, dot-plot compare, contingency tables, z-score number line, scatter match/sandbox, bag/coin/binomial/CI simulators, normal-curve shading, sliders, number entry, and more).
- **Instant grading** — answers are checked client-side (<100ms); no server round-trip to find out if you're right.
- **Progressive hints & gated solutions** — each problem reveals hints on request, then a full worked solution and a one-line takeaway after a correct answer.
- **Gamified XP** — correct answers earn XP via an animated toast; every 100 XP is a new level with a confetti celebration.
- **Streaks & progress** — daily streaks, per-chapter progress, and resume-where-you-left-off.
- **Light & dark mode** — system-aware theme with a manual toggle, fully tokenized colors.
- **Accounts** — username + password (Firebase email/password under the hood) or Google sign-in.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Firebase

1. Create or use a Firebase project with **Email/Password** and **Google** sign-in providers and **Firestore** enabled.
2. Copy `.env.example` to `.env.local` and fill in your Firebase web config (optional — defaults to project `stuff-18453`).
3. Deploy Firestore rules:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules
```

4. Add your domain to Firebase Auth authorized domains after deploying.

## Architecture

```
src/
├── content/
│   ├── course.json              # Course path & chapter metadata
│   └── lessons/                 # One JSON file per chapter (typed steps)
├── components/
│   ├── CourseHome.jsx           # Path, stats, next-chapter recommendation
│   ├── LessonPlayer.jsx         # Renders steps, hints, solutions, XP
│   ├── Login.jsx / Profile.jsx  # Auth & account management
│   ├── XpBar.jsx / Confetti.jsx # XP toast, level-ups, confetti
│   ├── ThemeToggle.jsx / Icon.jsx
│   └── steps/                   # One component per interactive step type
├── hooks/
│   ├── useAuth.js               # Firebase auth state
│   ├── useProgress.js           # Progress, XP & streak persistence
│   └── useTheme.js              # Light/dark theme
├── lib/
│   ├── grading.js               # Client-side answer checking
│   ├── stats.js / binomial.js / normalTable.js  # Math helpers
│   ├── auth.js / account.js / profile.js        # Auth & profile logic
│   ├── progress.js              # Firestore read/write
│   └── review.js                # Review-mode feedback
└── firebase.js
```

### Content model

Chapters are JSON arrays of typed steps — not HTML blobs. Each step has a `type` that maps to a React renderer, plus its prompt, hints, `feedback`, and a `solution` (`body` + `takeaway`). The opening `intro` step can include a `definitions` array that renders as the Key terms glossary. Feedback and correct answers live in the JSON, and grading runs client-side for instant response.

### Progress & mastery

Firestore schema:

```
users/{uid}                     → displayName, email, xp, streak, lastActiveDate, milestones
users/{uid}/progress/{lessonId} → currentStepIndex, stepStates, completed
```

Learners resume mid-chapter; finishing a problem saves forward progress immediately, and XP is awarded once per problem (no farming by re-answering).

## Deploy

```bash
npm run build
npx -y firebase-tools@latest deploy --only hosting,firestore:rules
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
