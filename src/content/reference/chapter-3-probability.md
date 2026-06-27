# Chapter 3 — Probability

## Core concepts

- **Sample space (S):** the set of all possible outcomes of a random process; an **event** is any subset of S. The probability of any event is between 0 and 1, and all outcome probabilities sum to 1.
- **Probability of an event:** for equally likely outcomes, P(event) = (number of favorable outcomes) / (total outcomes). Probabilities can also come from long-run relative frequencies or models.
- **Complement:** the event "A does not happen," written Aᶜ. Its probability is 1 − P(A); useful for "at least one" problems.
- **Mutually exclusive (disjoint) events:** events that cannot both occur in the same trial, so P(A and B) = 0.
- **Independent events:** the occurrence of one does not change the probability of the other; formally P(A | B) = P(A).
- **Conditional probability P(A | B):** the probability of A given that B has already occurred—you restrict attention to the outcomes where B is true.
- **Two-way (contingency) table:** a grid cross-classifying individuals by two categorical variables; row/column totals (marginals) and cell counts (joint) make probabilities easy to read.
- **Counting:** **permutations** count ordered arrangements; **combinations** count unordered selections.

## Key formulas

- **Complement:** P(Aᶜ) = 1 − P(A) — find "at least one" by subtracting "none" from 1.
- **General addition rule:** P(A or B) = P(A) + P(B) − P(A and B) — probability that A, B, or both happen; subtract the overlap so it isn't double-counted.
- **Addition (mutually exclusive):** P(A or B) = P(A) + P(B) — only valid when events can't both occur.
- **Conditional probability:** P(A | B) = P(A and B) / P(B), for P(B) > 0 — probability of A within the subgroup where B is true.
- **General multiplication rule:** P(A and B) = P(A) · P(B | A) — joint probability for sequential or dependent events.
- **Multiplication (independent):** P(A and B) = P(A) · P(B) — only when events are independent.
- **Independence check:** A and B are independent iff P(A | B) = P(A), equivalently P(A and B) = P(A)·P(B).
- **Permutations:** ₙPᵣ = n! / (n − r)! — count ordered arrangements of r items from n.
- **Combinations:** ₙCᵣ = n! / [r!(n − r)!] — count unordered groups of r items from n.

## Common mistakes

- Adding probabilities with P(A) + P(B) while forgetting to subtract P(A and B) when events overlap.
- Confusing **mutually exclusive** with **independent**—disjoint events with nonzero probabilities are actually *dependent*, since one occurring forces the other to 0.
- Multiplying P(A)·P(B) for dependent events instead of using P(A)·P(B | A).
- Reversing the condition: treating P(A | B) as if it equals P(B | A).
- Using permutations when order doesn't matter (or vice versa).

## Worked examples

**Example 1 (Addition / overlap).** In a class, P(plays a sport) = 0.50, P(in band) = 0.30, P(both) = 0.10. Find P(sport or band).
*Solution:* Use the general addition rule: P(A or B) = 0.50 + 0.30 − 0.10 = 0.70.
**Answer: 0.70.**

**Example 2 (Two-way table + conditional).** Of 200 students: 120 own a laptop, and of those 90 also own a tablet; 20 of the 80 non-laptop owners own a tablet. Find P(owns tablet | owns laptop), and check independence with tablet ownership.
*Solution:* P(tablet | laptop) = 90/120 = 0.75. Overall tablet owners = 90 + 20 = 110, so P(tablet) = 110/200 = 0.55. Since 0.75 ≠ 0.55, the events are **dependent**.
**Answer: P(tablet | laptop) = 0.75; not independent.**

**Example 3 (Multiplication / counting).** A bag has 4 red and 6 blue chips. (a) Draw 2 without replacement—find P(both red). (b) How many ways to choose a 3-chip group from the 10?
*Solution:* (a) P(both red) = (4/10)·(3/9) = 12/90 = 2/15 ≈ 0.133, using P(A)·P(B | A) since the first draw changes the second. (b) Order doesn't matter, so ₁₀C₃ = 10!/(3!·7!) = 120.
**Answer: (a) 2/15 ≈ 0.133; (b) 120 ways.**
