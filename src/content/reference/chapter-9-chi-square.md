# Chapter 9 — Chi-Square Tests

## Core concepts

- **Chi-square (χ²) statistic**: A single number measuring how far a set of observed counts falls from the counts expected under a null hypothesis. Larger values mean a bigger mismatch.
- **Chi-square distribution**: The right-skewed sampling distribution used to find p-values. Its shape depends only on the degrees of freedom; it becomes more symmetric as df grows. All chi-square tests are **right-tailed**.
- **Categorical data**: These tests work on *counts* in categories, never on means or raw measurements.
- **Goodness-of-fit (GOF) test**: Checks whether **one** categorical variable matches a *claimed* distribution (e.g., "candies come 30% red, 50% brown, 20% green").
- **Test for independence**: Uses **one** sample classified by **two** variables to ask whether the two variables are associated.
- **Test for homogeneity**: Uses **separate** samples (or treatment groups) to ask whether one variable's distribution is the same across the groups. Independence and homogeneity use the same formula and df; only the design and question differ.
- **Two-way (contingency) table**: A table of counts cross-classified by rows and columns, used for independence and homogeneity tests.
- **Expected count**: The count a cell *should* have if the null hypothesis were exactly true.
- **Degrees of freedom (df)**: The number of independent pieces of information in the statistic; it sets which chi-square curve to use.

## Key formulas

- **χ² = Σ (observed − expected)² / expected** — the test statistic for *all three* chi-square tests; sum over every category/cell.
- **Expected count (GOF) = n × p₀** — sample size times the null proportion for that category; use in goodness-of-fit.
- **Expected count (two-way) = (row total × column total) / grand total** — use for independence and homogeneity.
- **df = k − 1** (k = number of categories) — degrees of freedom for goodness-of-fit.
- **df = (rows − 1)(columns − 1)** — degrees of freedom for independence and homogeneity.

**Conditions (check for every test):** (1) data from a random sample or randomized experiment; (2) 10% condition when sampling without replacement; (3) **Large Counts**: every *expected* count ≥ 5.

## Common mistakes

- **Using df = n − 1 or counting the sample size.** df comes from the number of *categories* (k − 1) or table dimensions (r − 1)(c − 1), never the sample size.
- **Applying the Large Counts condition to observed counts.** The "≥ 5" rule is about *expected* counts; an observed count can be 0 and still be fine.
- **Plugging proportions or percentages into the formula.** χ² must use actual *counts*, not percents.
- **Confusing independence vs. homogeneity.** One sample classified two ways → independence; several samples/groups compared → homogeneity.
- **Treating the test as two-tailed.** Chi-square is always right-tailed, so the p-value is the area *above* the statistic.

## Worked examples

**Example 1 (Goodness-of-fit).** A die is rolled 60 times: 1→7, 2→9, 3→14, 4→8, 5→13, 6→9. Is the die fair (α = 0.05)?
- H₀: each face has p = 1/6; Hₐ: at least one differs.
- Expected each = 60 × (1/6) = 10.
- χ² = (7−10)²/10 + (9−10)²/10 + (14−10)²/10 + (8−10)²/10 + (13−10)²/10 + (9−10)²/10 = (9+1+16+4+9+1)/10 = 40/10 = **4.0**.
- df = 6 − 1 = 5. For χ² = 4.0, p ≈ 0.55.
- **Conclusion:** p > 0.05, fail to reject H₀ — no evidence the die is unfair.

**Example 2 (Independence).** In one sample of 200 students, classify by Grade (Pass/Fail) and Studied (Yes/No):

| | Pass | Fail | Row total |
|---|---|---|---|
| Studied | 80 | 20 | 100 |
| Did not | 60 | 40 | 100 |
| **Col total** | 140 | 60 | 200 |

- H₀: studying and passing are independent; Hₐ: they are associated.
- Expected (Studied, Pass) = 100×140/200 = 70; (Studied, Fail) = 30; (Did not, Pass) = 70; (Did not, Fail) = 30.
- χ² = (80−70)²/70 + (20−30)²/30 + (60−70)²/70 + (40−30)²/30 = 100/70 + 100/30 + 100/70 + 100/30 ≈ 1.43 + 3.33 + 1.43 + 3.33 = **9.52**.
- df = (2−1)(2−1) = 1. For χ² = 9.52, p ≈ 0.002.
- **Conclusion:** p < 0.05, reject H₀ — studying and passing are associated.
