# Chapter 5 — The Normal Distribution

## Core concepts

- **Density curve**: A smooth curve that models a distribution. It is always on or above the horizontal axis, and the total area underneath equals exactly 1. Area under the curve over an interval represents the proportion (probability) of values in that interval.
- **Normal distribution**: A symmetric, single-peaked, bell-shaped density curve fully described by its mean μ (center) and standard deviation σ (spread). Written X ~ N(μ, σ).
- **Standard normal distribution**: The special normal curve with μ = 0 and σ = 1, denoted Z. Any normal value can be converted to it by standardizing.
- **z-score (standardized value)**: How many standard deviations a value sits above (+) or below (−) the mean. Being unit-free, z-scores let you compare values from different distributions.
- **Empirical (68-95-99.7) rule**: For a normal distribution, about 68% of values lie within 1σ of μ, about 95% within 2σ, and about 99.7% within 3σ.
- **normalcdf**: Calculator/table tool that returns the **area** (probability) between two values — used when you know the boundaries and want a proportion.
- **invNorm**: The reverse tool — given an area (percentile) to the **left**, it returns the boundary **value** or z-score. Used for "find the cutoff" problems.
- **Percentile**: The percent of observations at or below a given value (area to the left).
- **Assessing normality**: Decide whether a normal model fits by checking for a roughly symmetric, bell-shaped histogram, comparing data to the empirical rule, or looking for a straight-line pattern in a normal probability (Q-Q) plot.

## Key formulas

- **z = (x − μ) / σ** — Standardize a raw value; use to compare values or to look up areas. Positive z is above the mean, negative below.
- **x = μ + z·σ** — Unstandardize; use to convert a z-score (e.g., from invNorm) back to the original units when finding a cutoff value.
- **P(a < X < b) = normalcdf(a, b, μ, σ)** — Area/probability between two raw values.
- **P(X < a) = normalcdf(−1E99, a, μ, σ)** and **P(X > a) = normalcdf(a, 1E99, μ, σ)** — One-sided areas; use ±1E99 for an unbounded side.
- **value = invNorm(p, μ, σ)** — Returns the value with proportion p to its left (a percentile cutoff).
- Useful z benchmarks: 90th percentile ≈ 1.28, 95th ≈ 1.645, 97.5th ≈ 1.96.

## Common mistakes

- **Mixing up normalcdf and invNorm**: Use normalcdf when you have boundaries and want an area; use invNorm when you have an area and want a value.
- **Forgetting invNorm uses area to the LEFT**: For a top-10% cutoff, enter 0.90, not 0.10.
- **Applying the empirical rule to non-round distances**: 68-95-99.7 only works at exactly 1, 2, or 3 σ. Otherwise standardize and use normalcdf.
- **Sign errors in z**: A value below the mean must give a negative z; don't drop the sign.
- **Assuming normality automatically**: Always check (shape, empirical rule, or Q-Q plot) before using normal methods; skewed data break them.

## Worked examples

**Example 1 (empirical rule).** Adult resting heart rates are approximately N(μ = 70, σ = 8) bpm. What percent have rates between 54 and 86 bpm?

- 54 = 70 − 2(8) and 86 = 70 + 2(8), so this is μ ± 2σ.
- By the empirical rule, about **95%** lie within 2 standard deviations.
- **Answer: ≈ 95%.**

**Example 2 (z-score and normalcdf).** Scores are N(μ = 500, σ = 100). Find the probability a randomly chosen score exceeds 650.

- Standardize: z = (650 − 500) / 100 = 1.5.
- P(X > 650) = P(Z > 1.5) = normalcdf(650, 1E99, 500, 100) ≈ 0.0668.
- **Answer: ≈ 0.067, or about 6.7% of scores exceed 650.**

**Example 3 (invNorm, percentile to value).** Heights of women are N(μ = 64, σ = 2.7) inches. How tall must a woman be to be in the tallest 10%?

- Tallest 10% means area 0.90 to the left, so find the 90th percentile.
- z for 0.90 ≈ 1.28 (or invNorm(0.90) ≈ 1.2816).
- Unstandardize: x = 64 + 1.28(2.7) ≈ 64 + 3.46 = 67.46 in. (invNorm(0.90, 64, 2.7) ≈ 67.46.)
- **Answer: about 67.5 inches or taller.**
