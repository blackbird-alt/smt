# Chapter 6 — Estimation

## Core concepts

- **Sampling distribution**: the probability distribution of a statistic (like x̄ or p̂) over all possible samples of a fixed size n. It describes how an estimate varies from sample to sample, not the spread of raw data.
- **Central Limit Theorem (CLT)**: for a large enough sample (rule of thumb n ≥ 30), the sampling distribution of x̄ is approximately Normal regardless of the population's shape. The bigger n is, the more Normal it becomes.
- **Sampling distribution of x̄**: centered at the population mean μ, with standard deviation (standard error) σ/√n. It is exactly Normal if the population is Normal, and approximately Normal by the CLT otherwise.
- **Sampling distribution of p̂**: centered at the population proportion p, with standard deviation √(p(1−p)/n), and approximately Normal when there are enough successes and failures.
- **Confidence interval (CI)**: a range of plausible values for an unknown parameter, built as point estimate ± margin of error.
- **Margin of error (ME)**: critical value × standard error. It captures sampling variability; it shrinks as n grows and grows as confidence increases.
- **Confidence level**: the long-run success rate of the method — e.g., 95% means about 95% of intervals built this way capture the true parameter.
- **Critical value (z\* or t\*)**: the multiplier set by the confidence level. Use t\* (heavier tails) for means when σ is unknown; use z\* for proportions.

## Key formulas

- **SE of the mean: σ/√n (or s/√n)** — spread of x̄'s sampling distribution; use s/√n when σ is unknown.
- **SE of a proportion: √(p̂(1−p̂)/n)** — spread of p̂'s sampling distribution; used in proportion intervals.
- **t-interval for a mean: CI = x̄ ± t\* · (s/√n)**, df = n − 1 — estimate μ when σ is unknown (the usual case).
- **z-interval for a proportion: CI = p̂ ± z\* · √(p̂(1−p̂)/n)** — estimate p for categorical (success/failure) data.
- **z-interval for a mean: CI = x̄ ± z\* · (σ/√n)** — only when σ is genuinely known (rare).
- **Margin of error: ME = critical value · SE** — half-width of any of the intervals above.

## Common mistakes

- **Misinterpreting the level**: "95% confident" does NOT mean a 95% probability the parameter is inside this specific interval. The parameter is fixed; 95% refers to the method's long-run capture rate.
- **Talking about individuals**: a CI estimates a population parameter (μ or p), not the range of individual data values.
- **Using z when you should use t**: for a mean, unless σ is explicitly given, use the t-interval with s — t has heavier tails to account for estimating σ.
- **Skipping conditions**: forgetting Random, Independence (10% rule when sampling without replacement), and Normal/Large-sample checks (n ≥ 30 for means; np̂ ≥ 10 and n(1−p̂) ≥ 10 for proportions).
- **Thinking bigger ME is better**: a wider interval is less precise, not "safer." Increasing n is what improves precision.

## Worked examples

**Example 1 — Mean (t-interval).** A random sample of 25 batteries has mean life x̄ = 40 hours with s = 5 hours; lifetimes are roughly symmetric with no outliers. Build a 95% CI for μ.

*Solution.* Conditions: random sample ✓; sample < 10% of all batteries ✓; n < 30 but data show no skew/outliers ✓. Use a t-interval, df = 24, so t\* ≈ 2.064. SE = s/√n = 5/√25 = 1. ME = 2.064 × 1 = 2.064. CI = 40 ± 2.06 = **(37.94, 42.06) hours.** We are 95% confident the true mean battery life is in this range.

**Example 2 — Proportion (z-interval).** In a random poll of 400 voters, 220 support a measure. Find a 90% CI for p.

*Solution.* p̂ = 220/400 = 0.55. Check: np̂ = 220 ≥ 10 and n(1−p̂) = 180 ≥ 10 ✓; random ✓; sample < 10% of population ✓. z\* = 1.645. SE = √(0.55·0.45/400) = √0.000619 ≈ 0.0249. ME = 1.645 × 0.0249 ≈ 0.041. CI = 0.55 ± 0.041 = **(0.509, 0.591),** i.e., about 51% to 59% support.

**Example 3 — Interpreting confidence.** A 95% CI for mean commute time is (28, 34) minutes. What does "95% confident" mean?

*Solution.* It means the procedure works 95% of the time: if we repeatedly took random samples and built intervals this way, about 95% would contain the true mean μ. For this one interval, μ is either inside (28, 34) or not — we just trust the reliable method. **It is not a 95% probability that μ is between 28 and 34.**
