# Chapter 1 — Averages and Variation

## Core concepts

- **Mean (x̄ or μ):** the arithmetic average; add all values and divide by the count. It uses every data point, so it is *nonresistant* (sensitive to outliers).
- **Median:** the middle value of ordered data (average of the two middle values if n is even). It depends on position, not magnitude, so it is *resistant* to outliers.
- **Mode:** the most frequently occurring value(s); the only center usable for categorical data. A set can have no mode or several.
- **Weighted mean:** an average where each value carries a weight (e.g., credit hours, percentages); used when observations should not count equally.
- **Range and IQR:** range = max − min (very sensitive to extremes); IQR = Q3 − Q1 captures the spread of the middle 50% and is *resistant*.
- **Variance and standard deviation:** average squared distance from the mean (variance) and its square root (standard deviation, in original units); a typical distance of points from the mean.
- **z-score:** the number of standard deviations a value lies above (+) or below (−) the mean; lets you compare values from different distributions.
- **Outlier (1.5×IQR rule):** a value below Q1 − 1.5·IQR or above Q3 + 1.5·IQR is flagged as a potential outlier.
- **Choosing a center:** for **symmetric** data use **mean and standard deviation**; for **skewed** data or data with outliers use **median and IQR** because they are resistant.

## Key formulas

- **Mean:** x̄ = (Σxᵢ) / n — typical value; best for roughly symmetric data.
- **Weighted mean:** x̄_w = (Σ wᵢxᵢ) / (Σ wᵢ) — when values have unequal importance (GPA, weighted scores).
- **IQR:** IQR = Q3 − Q1 — resistant measure of spread; basis of the outlier rule.
- **Sample variance:** s² = Σ(xᵢ − x̄)² / (n − 1) — spread in squared units (use n − 1 for samples, N for a population).
- **Sample standard deviation:** s = √[ Σ(xᵢ − x̄)² / (n − 1) ] — spread in original units; pairs with the mean.
- **z-score:** z = (x − μ) / σ — standardize a value to compare across distributions or flag values ≥ |2| (or |3|) as unusual.
- **1.5×IQR fences:** Lower = Q1 − 1.5·IQR, Upper = Q3 + 1.5·IQR — any value outside is a potential outlier.

## Common mistakes

- Dividing the variance by **n instead of n − 1** for a sample, or forgetting to take the square root to get the standard deviation.
- Using the **mean to describe skewed data**; with a long tail or outliers, report the median and IQR instead.
- Treating any value that "looks big" as an outlier without computing the **fences**; the AP exam requires showing the 1.5×IQR work.
- Confusing **range and IQR**, or thinking a larger range always means more typical variability (one outlier inflates the range).
- Sign errors on z-scores — a **negative z means below the mean**, and z is unitless.

## Worked examples

**Example 1 — Center, spread, and outliers.**
Data: 4, 7, 7, 9, 12, 13, 40. Find the median, IQR, and check for outliers.
- Ordered already; n = 7, median = 4th value = **9**.
- Lower half (4, 7, 7) → Q1 = 7; upper half (12, 13, 40) → Q3 = 13. **IQR = 13 − 7 = 6.**
- Fences: lower = 7 − 1.5(6) = −2; upper = 13 + 1.5(6) = **22**. Since 40 > 22, **40 is an outlier.**
- Because of the outlier/skew, report **median 9 and IQR 6** (resistant). ✔

**Example 2 — Standard deviation and z-score.**
Sample: 2, 4, 6, 8. Find the mean, sample standard deviation, and the z-score of 8.
- Mean = (2+4+6+8)/4 = **5**.
- Deviations: −3, −1, 1, 3; squares: 9, 1, 1, 9; sum = 20.
- s² = 20/(4−1) = 6.67, so s = √6.67 ≈ **2.58**.
- z = (8 − 5) / 2.58 ≈ **1.16** — 8 is about 1.16 SD above the mean. ✔

**Example 3 — Weighted mean.**
A grade is 30% homework (88), 30% midterm (74), 40% final (91). Find the course average.
- x̄_w = (0.30·88 + 0.30·74 + 0.40·91) / (0.30 + 0.30 + 0.40)
- = (26.4 + 22.2 + 36.4) / 1 = **85.0**. ✔
