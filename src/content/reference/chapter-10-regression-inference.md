# Chapter 10 — Inference for Regression

## Core concepts

- **Population regression line**: The true line μ_y = α + βx that describes the mean of y for each x. We never see it directly; we estimate it from a sample.
- **Sample slope (b)**: The slope of the least-squares line ŷ = a + bx computed from data. It is a statistic that estimates the population slope β.
- **Population slope (β)**: The parameter we make inferences about. β = 0 means x has no linear relationship with y; testing β is the main goal of this chapter.
- **Sampling distribution of b**: If we took many random samples, the slopes b would vary. This distribution is centered at β with spread measured by the standard error SE_b, and it follows a t-distribution with n − 2 degrees of freedom.
- **Standard error of the slope (SE_b)**: Estimates how much b typically varies from sample to sample. Smaller SE_b means a more precise estimate. On the AP exam you usually read it from the "SE Coef" column of output.
- **t-test for slope**: A significance test of H₀: β = 0 (or β = β₀) versus an alternative, using the statistic t = (b − β₀)/SE_b.
- **Confidence interval for β**: Gives a plausible range for the true slope: b ± t* · SE_b.
- **LINER conditions**: Linearity, Independence, Normality (of residuals), Equal variance, and Random data — the requirements that make regression inference valid.
- **Reading regression output**: Software reports the slope ("Coef"), its standard error ("SE Coef"), a t value, a p-value, and s (residual standard deviation) plus R².

## Key formulas

- **t = (b − β₀) / SE_b** — test statistic for the slope; use after conditions are met. With H₀: β = 0 this is just t = b/SE_b.
- **df = n − 2** — degrees of freedom for every regression t-procedure (two parameters, slope and intercept, are estimated).
- **CI: b ± t* · SE_b** — confidence interval for β; use t* from the t-table with df = n − 2.
- **SE_b = s / (s_x · √(n − 1))** — standard error of the slope by hand; s is the residual standard deviation. Usually read SE_b directly from output instead.
- **Decision rule**: reject H₀ if p-value < α; a CI that excludes 0 is evidence of a real linear relationship.

## Common mistakes

- Writing hypotheses about the sample slope b instead of the parameter β (always use β).
- Using df = n − 1 instead of the correct df = n − 2.
- Claiming a significant slope proves causation — association from observational data is not cause and effect.
- Skipping or rubber-stamping the LINER conditions; you must justify each (residual plot for linearity/equal variance, random sample for independence).
- Confusing a high R² with statistical significance; they answer different questions.

## Worked examples

**Example 1 — t-test from output.** A study of 22 students regresses exam score on hours studied. Output: slope Coef = 4.20, SE Coef = 1.50. Test whether study hours predict score (α = 0.05).

*Solution.* H₀: β = 0; Hₐ: β ≠ 0, where β is the true slope. Assume LINER met. Compute t = 4.20/1.50 = 2.80, df = 22 − 2 = 20. For a two-tailed test, p-value ≈ 0.011. Since 0.011 < 0.05, reject H₀.

*Answer.* There is convincing evidence (t = 2.80, df = 20, p ≈ 0.011) that study hours are linearly associated with exam score.

**Example 2 — confidence interval.** Using the same data (b = 4.20, SE_b = 1.50, df = 20), build a 95% CI for β.

*Solution.* t* for 95% with df = 20 is 2.086. CI = 4.20 ± 2.086(1.50) = 4.20 ± 3.13 = (1.07, 7.33).

*Answer.* We are 95% confident the true slope is between 1.07 and 7.33 points per hour. Because the interval excludes 0, it agrees with the test: a real positive relationship.

**Example 3 — checking conditions.** A residual plot shows a clear U-shaped curve. Is the t-test valid?

*Solution.* The U-shape signals a curved (non-linear) relationship, so the Linearity condition fails. The residuals are not randomly scattered around zero.

*Answer.* No — regression inference is not appropriate; consider transforming a variable before testing the slope.
