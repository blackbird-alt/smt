# Chapter 4 — Binomial and Discrete Random Variables

## Core concepts

- **Random variable (X):** A numerical outcome of a chance process. A *discrete* random variable can only take separate, countable values (0, 1, 2, …).
- **Probability distribution:** A list or table pairing every possible value of X with its probability. The probabilities must each be between 0 and 1 and must sum to exactly 1.
- **Expected value (mean), μ:** The long-run average value of X if the process were repeated many times. It is a weighted average of the outcomes, weighted by their probabilities.
- **Standard deviation, σ:** A measure of how much X typically varies from its mean. The variance is σ², the square of the standard deviation.
- **Binomial random variable:** Counts the number of *successes* in a fixed number of trials. Written X ~ B(n, p).
- **The four binomial conditions (BINS):** **B**inary (each trial is success/failure), **I**ndependent trials, **N**umber of trials n is fixed in advance, **S**ame probability of success p on every trial.
- **Geometric random variable:** Counts the number of trials needed to get the *first* success. Same per-trial conditions as binomial, but the number of trials is **not** fixed — you stop at the first success. Written X ~ G(p).

## Key formulas

- **Mean of any discrete RV:** μ = Σ [xᵢ · P(xᵢ)] — the expected value; multiply each outcome by its probability and add.
- **Standard deviation of any discrete RV:** σ = √( Σ (xᵢ − μ)² · P(xᵢ) ) — typical spread around the mean; take the square root last.
- **Binomial probability:** P(X = k) = C(n,k) · pᵏ · (1−p)^(n−k) — chance of *exactly* k successes in n trials; C(n,k) = n! / [k!(n−k)!].
- **Binomial mean:** μ = np — expected number of successes; use whenever the four conditions hold.
- **Binomial standard deviation:** σ = √(np(1−p)) — spread of the count of successes; note it's one square root, not two.
- **Geometric probability:** P(X = k) = (1−p)^(k−1) · p — chance the first success happens on trial k.
- **Geometric mean:** μ = 1/p — expected number of trials until the first success.

## Common mistakes

- **Using binomial when trials aren't independent or n isn't fixed.** Drawing without replacement from a small group, or "keep trying until success," breaks the conditions (the latter is geometric).
- **Confusing P(X = k) with P(X ≤ k).** "Exactly k" uses one term; "at most/at least k" requires adding several terms (cumulative probability).
- **Forgetting the square root, or taking it twice.** Variance = np(1−p); standard deviation = √(np(1−p)).
- **Mixing up p and 1−p**, or forgetting that probabilities in a distribution must sum to 1.
- **Reporting bare numbers without context** on the AP exam — always say what the mean or SD represents.

## Worked examples

**Example 1 (binomial probability).** A free-throw shooter makes 80% of shots. She takes 5 shots. What is the probability she makes exactly 4?

*Solution.* Check conditions: fixed n = 5, two outcomes (make/miss), p = 0.8 constant, shots independent — binomial. Use the formula with k = 4:
P(X = 4) = C(5,4) · 0.8⁴ · 0.2¹ = 5 · 0.4096 · 0.2 = 0.4096.
**Answer: ≈ 0.410.**

**Example 2 (binomial mean and SD).** A factory's items are defective 2.5% of the time. In a random sample of 40 items, find the expected number of defectives and the standard deviation.

*Solution.* n = 40, p = 0.025.
μ = np = 40 · 0.025 = 1 defective expected.
σ = √(np(1−p)) = √(40 · 0.025 · 0.975) = √(0.975) ≈ 0.987.
**Answer: μ = 1 defective, σ ≈ 0.99.**

**Example 3 (geometric).** Each lottery scratch ticket wins with probability p = 0.1, independently. What is the probability your first win comes on the 3rd ticket, and how many tickets do you expect to buy until a win?

*Solution.* Geometric with p = 0.1. First success on trial 3:
P(X = 3) = (1−0.1)² · 0.1 = 0.9² · 0.1 = 0.81 · 0.1 = 0.081.
Expected number of tickets: μ = 1/p = 1/0.1 = 10.
**Answer: P = 0.081; expect 10 tickets.**
