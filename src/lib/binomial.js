export function binomialCoeff(n, k) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let index = 0; index < k; index += 1) {
    result = (result * (n - index)) / (index + 1);
  }
  return result;
}

export function binomialPmf(n, p, k) {
  return binomialCoeff(n, k) * p ** k * (1 - p) ** (n - k);
}

export function binomialMean(n, p) {
  return n * p;
}

export function binomialStdDev(n, p) {
  return Math.sqrt(n * p * (1 - p));
}
