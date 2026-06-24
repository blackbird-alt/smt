export function gradeSliderPrediction(value, correct, tolerance, options = {}) {
  const grade = gradeNumberInput(String(value), correct, {
    tolerance,
    decimalPlaces: options.decimalPlaces,
    integer: options.integer,
  });
  if (grade.correct) {
    return { correct: true, key: "correct" };
  }
  const diff = value - correct;
  return { correct: false, key: diff < 0 ? "tooLow" : "tooHigh" };
}

function roundTo(value, decimalPlaces) {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}

export function gradeNumberInput(value, correct, options = {}) {
  const tolerance = options.tolerance ?? 0.05;
  const { decimalPlaces, integer } = options;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return { correct: false };
  }

  if (integer) {
    return {
      correct: Number.isInteger(parsed) && parsed === correct,
    };
  }

  if (decimalPlaces != null) {
    const maxDelta = 0.5 / 10 ** decimalPlaces;
    const userRounded = roundTo(parsed, decimalPlaces);
    const correctRounded = roundTo(correct, decimalPlaces);
    return {
      correct:
        userRounded === correctRounded &&
        Math.abs(parsed - correct) <= maxDelta + 1e-9,
    };
  }

  return { correct: Math.abs(parsed - correct) <= tolerance };
}

// Rounding precision is capped at 2 decimal places: no question should ever
// ask the learner to round to 3+ decimals.
const MAX_DECIMAL_PLACES = 2;

export function inferDecimalPlaces(correct) {
  if (Number.isInteger(correct)) return null;
  const fraction = String(correct).split(".")[1];
  return Math.min(fraction ? fraction.length : MAX_DECIMAL_PLACES, MAX_DECIMAL_PLACES);
}
