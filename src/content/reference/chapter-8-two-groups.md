# Chapter 8 — Comparing Two Groups

## Core concepts

- **Independent samples:** Two groups whose observations have no natural pairing (e.g., a treatment group vs. a separate control group). Each subject appears in only one group.
- **Paired data:** Two measurements linked to the same subject or matched pair (before/after, twins, left/right). You analyze the single column of differences, not two separate samples.
- **Difference of means (μ₁ − μ₂):** The parameter estimated by a two-sample t-procedure when comparing the centers of two independent quantitative groups.
- **Mean of differences (μ_d):** The parameter for paired data; the average within-pair change.
- **Difference of proportions (p₁ − p₂):** The parameter for comparing two independent categorical (success/failure) groups, estimated with z-procedures.
- **Standard error (SE):** The estimated standard deviation of a statistic's sampling distribution; the denominator of every test statistic and the spread term in every interval.
- **Pooled proportion (p̂_c):** A combined success rate used *only* in the two-proportion z-**test**, where H₀ assumes p₁ = p₂. Intervals do **not** pool.
- **Conditions (Random, Independent/10%, Normal/Large Counts):** Requirements that must hold for the sampling distribution to be approximately normal/t so inference is valid.

## Key formulas

- **Two-sample t statistic:** t = (x̄₁ − x̄₂) / √(s₁²/n₁ + s₂²/n₂) — tests H₀: μ₁ = μ₂ for **independent** means; use conservative df = min(n₁−1, n₂−1).
- **Two-sample t interval:** (x̄₁ − x̄₂) ± t* · √(s₁²/n₁ + s₂²/n₂) — estimates μ₁ − μ₂; use when you want a range, not a test.
- **Paired t statistic:** t = (x̄_d − 0) / (s_d/√n) — tests H₀: μ_d = 0 using the differences; use when data are matched. Interval: x̄_d ± t* · (s_d/√n), df = n − 1.
- **Two-proportion z (test):** z = (p̂₁ − p̂₂) / √(p̂_c(1−p̂_c)(1/n₁ + 1/n₂)), with p̂_c = (x₁ + x₂)/(n₁ + n₂) — tests H₀: p₁ = p₂.
- **Two-proportion z interval:** (p̂₁ − p̂₂) ± z* · √(p̂₁(1−p̂₁)/n₁ + p̂₂(1−p̂₂)/n₂) — estimates p₁ − p₂; **unpooled** SE.
- **Conditions to cite:** random samples/assignment; independence (each n < 10% of its population); normality (each n ≥ 30 or roughly symmetric data for t) or large counts (n₁p̂_c, n₁(1−p̂_c), n₂p̂_c, n₂(1−p̂_c) all ≥ 10 for z).

## Common mistakes

- **Treating paired data as two independent samples** (or vice versa). Before/after on the *same* people is paired — analyze the differences.
- **Forgetting to pool** for the two-proportion *test*, or wrongly pooling in the *interval*. Pool only when H₀ assumes equal proportions.
- **Skipping conditions** or checking large-counts with p̂₁, p̂₂ instead of p̂_c in the test.
- **Misreading the interval:** if a difference interval contains 0, you have no significant difference — don't claim one.
- **Mixing up subtraction order**, then misstating direction (which group is larger).

## Worked examples

**Example 1 (two-sample t-test).** A study randomly assigns 32 students to study method A (x̄ = 82, s = 6) and 30 to method B (x̄ = 78, s = 7). Is mean score higher for A? Use α = 0.05.

*Solution.* H₀: μ_A = μ_B vs. Hₐ: μ_A > μ_B. Conditions: random assignment ✓; independent groups ✓; both n ≥ 30 ✓. SE = √(6²/32 + 7²/30) = √(1.125 + 1.633) = √2.758 ≈ 1.661. t = (82 − 78)/1.661 ≈ 2.41, df = min(31, 29) = 29. One-tailed p ≈ 0.011 < 0.05. **Reject H₀** — convincing evidence method A has a higher mean score.

**Example 2 (paired t-interval).** Ten runners' times are measured before and after training; differences (before − after) have x̄_d = 1.4 min, s_d = 1.1 min. Build a 95% CI for the mean improvement.

*Solution.* Data are paired (same runners). Conditions: random/representative ✓; differences roughly symmetric ✓. df = 9, t* ≈ 2.262. SE = 1.1/√10 ≈ 0.348. CI = 1.4 ± 2.262(0.348) = 1.4 ± 0.787 → **(0.61, 2.19) minutes**. Since 0 isn't in the interval, training plausibly reduces times.

**Example 3 (two-proportion z-test).** Drug: 45 of 200 recover; placebo: 30 of 200. Does the drug differ in recovery rate? α = 0.05.

*Solution.* H₀: p₁ = p₂ vs. Hₐ: p₁ ≠ p₂. p̂₁ = 0.225, p̂₂ = 0.15, p̂_c = 75/400 = 0.1875. Large counts: 200(0.1875)=37.5 and 200(0.8125)=162.5 (both groups) ≥ 10 ✓. SE = √(0.1875·0.8125·(1/200+1/200)) = √(0.001523) ≈ 0.0390. z = (0.225 − 0.15)/0.0390 ≈ 1.92. Two-tailed p ≈ 0.055 > 0.05. **Fail to reject H₀** — not quite enough evidence of a difference in recovery rates.
