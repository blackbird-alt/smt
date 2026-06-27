# Chapter 2 — Correlation and Regression

## Core concepts

- **Bivariate data**: paired measurements on two quantitative variables. The **explanatory variable** (x) is used to predict the **response variable** (y).
- **Scatterplot**: a plot of (x, y) pairs. Describe four things: **form** (linear vs. curved), **direction** (positive or negative), **strength** (how tightly points cluster around a pattern), and **unusual features** (outliers, clusters, gaps).
- **Correlation coefficient r**: a number from −1 to 1 measuring the direction and strength of a *linear* association only. Near ±1 means strong linear; near 0 means weak/no linear relationship.
- **Properties of r**: unitless, unaffected by switching x and y, and unchanged by linear rescaling of either variable. It is *not* resistant—outliers can distort it heavily.
- **Least-squares regression line (LSRL)**: the line ŷ = a + bx that minimizes the sum of squared residuals. It always passes through the point (x̄, ȳ).
- **Slope b**: the predicted change in y for each one-unit increase in x. **Intercept a**: the predicted y when x = 0 (often not meaningful in context).
- **Residual**: observed minus predicted, y − ŷ. A **residual plot** with random scatter supports a linear model; a curved or fan-shaped pattern means a linear model is a poor fit. Residuals always sum to zero for the LSRL.
- **Coefficient of determination r²**: the proportion (0 to 1) of the variation in y explained by the linear model with x.
- **Extrapolation / influential points**: predicting outside the observed x-range is unreliable (extrapolation). High-leverage or outlier points can be **influential**, sharply changing the line or r.

## Key formulas

- **ŷ = a + bx** — the regression line; use it to predict y from a given x.
- **b = r · (sᵧ / sₓ)** — slope from correlation and standard deviations; connects r to the line.
- **a = ȳ − b·x̄** — intercept; guarantees the line passes through (x̄, ȳ).
- **r = (1/(n−1)) · Σ[(xᵢ − x̄)/sₓ][(yᵢ − ȳ)/sᵧ]** — correlation as the average product of z-scores.
- **residual = y − ŷ** — prediction error for one point; used to build residual plots.
- **r² = (square of r)** — fraction of variation in y explained by x.

## Common mistakes

- **Confusing correlation with causation**: a strong r does not prove x causes y; a lurking variable may be responsible.
- **Mixing up r and r²**: if r = 0.6, then r² = 0.36, not 0.6. They measure different things.
- **Assuming r = 0 means "no relationship"**: r only measures *linear* association; a strong curved pattern can give r ≈ 0.
- **Trusting extrapolated predictions**: plugging in x-values far outside the data range gives unreliable answers.
- **Judging fit from r alone**: always check a residual plot—random scatter, not just a high r, confirms a linear model is appropriate.

## Worked examples

**Example 1 — Building and using the line.**
A study of 10 students finds x̄ = 4 study hours, ȳ = 78 test score, sₓ = 2, sᵧ = 8, and r = 0.75. Find the LSRL and predict the score for a student who studies 6 hours.

*Solution.*
- Slope: b = r·(sᵧ/sₓ) = 0.75·(8/2) = 0.75·4 = **3**.
- Intercept: a = ȳ − b·x̄ = 78 − 3·4 = 78 − 12 = **66**.
- Line: **ŷ = 66 + 3x**.
- Predict at x = 6: ŷ = 66 + 3·6 = **84**.

**Answer:** ŷ = 66 + 3x; predicted score ≈ 84. (Each extra study hour adds about 3 predicted points.)

**Example 2 — Residual and r² interpretation.**
Using ŷ = 66 + 3x, a student who studied 6 hours actually scored 80. Also, r² = 0.5625. Find the residual and interpret r².

*Solution.*
- Predicted: ŷ = 66 + 3·6 = 84.
- Residual = y − ŷ = 80 − 84 = **−4**: the actual score is 4 points *below* the prediction.
- r² = 0.5625 → about **56.3% of the variation in test scores is explained** by the linear model with study hours; the rest is due to other factors or random variation.

**Answer:** Residual = −4; r² means ~56% of score variability is explained by study hours.

**Example 3 — Influential point / extrapolation caution.**
A near-zero correlation dataset gains one new point far to the upper right that lines up the cloud, jumping r to 0.9. What happened, and should you predict y at x far beyond the data?

*Solution.*
- The added point has high leverage (extreme x) and is **influential**: it single-handedly inflated r and reoriented the line, so r no longer reflects the bulk of the data.
- Predicting at x far outside the observed range is **extrapolation** and is unreliable—the linear pattern may not continue.

**Answer:** The outlier is an influential point distorting r; avoid extrapolating beyond the data.
