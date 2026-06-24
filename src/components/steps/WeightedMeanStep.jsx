import { useMemo, useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

export default function WeightedMeanStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const categories = useMemo(() => step.categories ?? [], [step.categories]);
  const initialWeights = useMemo(
    () =>
      savedState?.weights ||
      categories.map((cat) => cat.initialWeight ?? cat.weight ?? 0.25),
    [savedState?.weights, categories],
  );

  const [weights, setWeights] = useState(initialWeights);
  const [result, setResult] = useState(savedState?.result || null);
  const [hintLevel, setHintLevel] = useState(savedState?.hintLevel ?? 0);
  const [submitted, setSubmitted] = useState(Boolean(savedState?.submitted));

  const hints = step.hints || [];
  const showHints = submitted && result && !result.correct;

  const weightedMean = useMemo(() => {
    return categories.reduce(
      (total, cat, index) => total + cat.score * weights[index],
      0,
    );
  }, [categories, weights]);

  function updateWeight(index, value) {
    if (reviewMode) return;
    setWeights((current) => {
      const next = [...current];
      next[index] = value;
      onSaveProgress?.({ weights: next, hintLevel, result, submitted });
      return next;
    });
    setResult(null);
    setSubmitted(false);
  }

  function openHint() {
    if (reviewMode || hintLevel >= hints.length) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    onSaveProgress?.({ weights, hintLevel: next, result, submitted });
  }

  function checkAnswer() {
    setSubmitted(true);
    const correct = Math.abs(weightedMean - step.correct) <= (step.tolerance ?? 0.15);
    const message = correct ? null : step.feedback?.wrong || "Try again.";
    setResult({ correct, message });
    const state = {
      weights,
      weightedMean,
      result: { correct, message },
      hintLevel,
      submitted: true,
    };
    if (correct) onComplete(state, null);
    else onSaveProgress?.(state);
  }

  return (
    <div className="step weighted-mean-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="weighted-mean-panel">
        {categories.map((cat, index) => (
          <div key={cat.id} className="weighted-mean-row">
            <div className="weighted-mean-meta">
              <strong>{cat.label}</strong>
              <span>Score: {cat.score}</span>
            </div>
            <label className="weighted-mean-slider">
              Weight: {(weights[index] * 100).toFixed(0)}%
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={weights[index]}
                onChange={(event) => updateWeight(index, Number(event.target.value))}
                disabled={reviewMode}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="weighted-mean-live">
        Weighted mean: <strong>{weightedMean.toFixed(2)}</strong>
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
          disabled={reviewMode}
        >
          Check
        </button>
      </div>
    </div>
  );
}
