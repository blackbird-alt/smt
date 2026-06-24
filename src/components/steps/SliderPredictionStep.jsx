import { useEffect, useMemo, useRef, useState } from "react";
import { gradeSliderPrediction, inferDecimalPlaces } from "../../lib/grading";
import { debounce } from "../../lib/debounce";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

export default function SliderPredictionStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const [value, setValue] = useState(savedState?.value ?? step.initial ?? 3);
  const [result, setResult] = useState(savedState?.result || null);
  const [hintLevel, setHintLevel] = useState(savedState?.hintLevel ?? 0);
  const skipSaveRef = useRef(true);

  const [submitted, setSubmitted] = useState(Boolean(savedState?.submitted));

  const hints = step.hints ?? [];
  const tolerance = step.tolerance ?? (Number.isInteger(step.correct) ? 1 : 0.05);
  const decimalPlaces = step.decimalPlaces ?? inferDecimalPlaces(step.correct);
  const showHints = submitted && result && !result.correct;

  const valueLabel = formatSliderValue(value, step);

  const debouncedSave = useMemo(
    () =>
      debounce((nextValue, nextResult, nextHintLevel) => {
        onSaveProgress?.({
          value: nextValue,
          result: nextResult,
          hintLevel: nextHintLevel,
        });
      }, 400),
    [onSaveProgress],
  );

  useEffect(() => {
    if (reviewMode || !onSaveProgress) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    debouncedSave(value, result, hintLevel);
  }, [value, result, hintLevel, reviewMode, onSaveProgress, debouncedSave]);

  function openHint() {
    if (reviewMode || hintLevel >= hints.length) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    onSaveProgress?.({ value, result, hintLevel: next, submitted });
  }

  function checkAnswer() {
    setSubmitted(true);
    const grade = gradeSliderPrediction(value, step.correct, tolerance, {
      decimalPlaces: Number.isInteger(step.correct) ? null : decimalPlaces,
      integer: false,
    });
    const message = grade.correct ? null : step.feedback?.wrong || step.feedback?.[grade.key] || "Try again.";
    setResult({ correct: grade.correct, message });
    const state = { value, result: { correct: grade.correct, message }, hintLevel, submitted: true };
    if (grade.correct) onComplete(state, null);
    else onSaveProgress?.(state);
  }

  return (
    <div className="step slider-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="prediction-card">
        <div className="prediction-value">{valueLabel}</div>
        <input
          type="range"
          min={step.min}
          max={step.max}
          step={step.step}
          value={value}
          onChange={(event) => {
            if (reviewMode) return;
            setValue(Number(event.target.value));
            setResult(null);
            setSubmitted(false);
          }}
          className="prediction-slider"
          disabled={reviewMode}
        />
        <div className="slider-labels">
          <span>{step.min}</span>
          <span>{step.max}</span>
        </div>
      </div>

      {result && !result.correct && submitted && !reviewMode && (
        <div className="feedback feedback-wrong" role="status">
          {formatRichText(result.message)}
        </div>
      )}

      <ProblemHints
        hints={hints}
        hintLevel={hintLevel}
        showHints={showHints}
        reviewMode={reviewMode}
        onOpenHint={openHint}
      />

      <div className="step-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={reviewMode ? () => {} : checkAnswer}
        >
          Check
        </button>
      </div>
    </div>
  );
}

function formatSliderValue(value, step) {
  const stepSize = step.step ?? 1;
  if (stepSize >= 1) {
    return String(Math.round(value));
  }
  const decimals = String(stepSize).includes(".")
    ? String(stepSize).split(".")[1].length
    : 2;
  return value.toFixed(decimals);
}
