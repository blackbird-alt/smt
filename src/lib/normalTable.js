// Common standard-normal left-tail areas for course problems
export const Z_TABLE = {
  "-1.0": 0.1587,
  "-0.9": 0.1841,
  "0.0": 0.5,
  "1.0": 0.8413,
  "1.25": 0.8944,
  "1.28": 0.8997,
  "1.5": 0.9332,
  "1.645": 0.95,
  "1.96": 0.975,
  "2.0": 0.9772,
  "2.576": 0.995,
};

export function leftTail(z) {
  const key = z.toFixed(2);
  if (Z_TABLE[key] !== undefined) return Z_TABLE[key];
  const rounded = z.toFixed(1);
  if (Z_TABLE[rounded] !== undefined) return Z_TABLE[rounded];
  // rough logistic approximation
  return 1 / (1 + Math.exp(-1.702 * z));
}

export function areaBetween(zLow, zHigh) {
  return leftTail(zHigh) - leftTail(zLow);
}
