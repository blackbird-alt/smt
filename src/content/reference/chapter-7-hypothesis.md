## Core concepts

- **Null hypothesis (H₀):** A specific "no effect / no change" claim about a population parameter, written as an equality, e.g. H₀: μ = μ₀ or H₀: p = p₀. It is what we assume true while testing.
- **Alternative hypothesis (Hₐ):** The competing claim we look for evidence of; it is one-sided (μ > μ₀ or μ < μ₀) or two-sided (μ ≠ μ₀). Hypotheses are about parameters, never about sample statistics.
- **Test statistic:** A standardized measure of how far the sample estimate falls from the null value, in standard-error units (a z- or t-score). Larger magnitude means stronger evidence against H₀.
- **p-value:** The probability of getting a test statistic at least as extreme as the observed one, *assuming H₀ is true*. Small p-values mean the data would be surprising if H₀ held.
- **Significance level α:** A threshold chosen in advance (often 0.05). If p ≤ α we reject H₀; if p > α we fail to reject H₀. We never "accept" H₀.
- **Type I error:** Rejecting a true H₀ (a false alarm); its probability equals α. **Type II error (β):** Failing to reject a false H₀ (a missed effect).
- **Power:** 1 − β, the probability of correctly detecting a real effect. Power rises with larger sample size, larger true effect, and larger α.
- **Conditions for inference:** *Random* sampling/assignment; *Independence* (10% condition when sampling without replacement); *Normality* — for proportions np₀ ≥ 10 and n(1−p₀) ≥ 10, for means n ≥ 30 or roughly symmetric data with no strong outliers.

## Key formulas

- **z-test for a proportion:** z = (p̂ − p₀) / √(p₀(1−p₀)/n) — tests a claim about one population proportion; uses p₀ (not p̂) in the standard error.
- **z-test for a mean (σ known):** z = (x̄ − μ₀) / (σ/√n) — for a single mean when the population standard deviation σ is known (rare in practice).
- **t-test for a mean (σ unknown):** t = (x̄ − μ₀) / (s/√n), with df = n − 1 — the usual one-sample mean test; use the sample s and the t-distribution.
- **Standard error reminders:** SE(p̂) = √(p₀(1−p₀)/n); SE(x̄) = s/√n — the denominators measuring sampling variability.
- **Decision rule:** reject H₀ if p-value ≤ α — converts the test statistic's p-value into a conclusion.

## Common mistakes

- **Misreading the p-value:** It is *not* the probability that H₀ is true (or false). It is the chance of data this extreme *given* H₀ is true.
- **"Accepting" H₀:** A large p-value means we *fail to reject* H₀, not that H₀ is proven true — absence of evidence isn't proof.
- **Using p̂ in the proportion SE:** The z-test uses the null value p₀ in √(p₀(1−p₀)/n); using p̂ is the interval formula, not the test.
- **Hypotheses about statistics:** Writing H₀: x̄ = 10 is wrong; hypotheses describe parameters (μ, p), not sample values.
- **Skipping conditions / one-vs-two tails:** Forgetting Random/Independent/Normal checks, or not doubling a two-sided p-value, gives invalid conclusions.

## Worked examples

**Example 1 (proportion).** A company claims 90% of orders ship on time. A random sample of 200 orders shows 168 on time. Test at α = 0.05 whether the true rate is less than 90%.
- H₀: p = 0.90; Hₐ: p < 0.90. Conditions: random sample; np₀ = 180 ≥ 10, n(1−p₀) = 20 ≥ 10. ✓
- p̂ = 168/200 = 0.84. z = (0.84 − 0.90)/√(0.90·0.10/200) = −0.06/0.02121 ≈ **−2.83**.
- p-value = P(Z < −2.83) ≈ 0.0023. Since 0.0023 < 0.05, **reject H₀**. There is convincing evidence the on-time rate is below 90%.

**Example 2 (mean, t-test).** A bottling line should fill 500 mL. A random sample of 16 bottles has x̄ = 497 mL, s = 5 mL. Test at α = 0.05 whether the mean differs from 500 mL.
- H₀: μ = 500; Hₐ: μ ≠ 500. Conditions: random; n < 10% of output; assume roughly symmetric, no outliers. ✓
- t = (497 − 500)/(5/√16) = −3/1.25 = **−2.40**, df = 15.
- Two-sided p-value ≈ 2 × P(T₁₅ < −2.40) ≈ 0.030. Since 0.030 < 0.05, **reject H₀**. Evidence suggests the mean fill differs from 500 mL.
