import { useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

export default function ZCompareStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const [selectedId, setSelectedId] = useState(savedState?.selectedId ?? null);
  const [result, setResult] = useState(savedState?.result || null);
  const [hintLevel, setHintLevel] = useState(savedState?.hintLevel ?? 0);
  const [submitted, setSubmitted] = useState(Boolean(savedState?.submitted));

  const hints = step.hints || [];
  const points = step.points || [];
  const mean = step.mean ?? 0;
  const sd = step.sd ?? 1;
  const min = step.axisMin ?? mean - 3 * sd;
  const max = step.axisMax ?? mean + 3 * sd;
  const span = max - min || 1;
  const showHints = submitted && result && !result.correct;
  const selected = points.find((point) => point.id === selectedId);

  function position(value) {
    return ((value - min) / span) * 100;
  }

  function openHint() {
    if (reviewMode || hintLevel >= hints.length) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    onSaveProgress?.({ selectedId, hintLevel: next, result, submitted });
  }

  function checkAnswer() {
    if (!selected) return;
    setSubmitted(true);
    const correct = Boolean(selected.correct);
    const message = correct ? null : step.feedback?.wrong || "Try again.";
    setResult({ correct, message });
    const state = { selectedId, result: { correct, message }, hintLevel, submitted: true };
    if (correct) onComplete(state, null);
    else onSaveProgress?.(state);
  }

  return (
    <div className="step z-compare-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="z-number-line">
        <div className="z-number-line-axis" />
        <div
          className="z-number-line-mean-dot"
          style={{ left: `${position(mean)}%` }}
          aria-hidden="true"
        />
        <div className="z-number-line-mean" style={{ left: `${position(mean)}%` }}>
          μ = {mean}
        </div>
        {points.map((point) => (
          <button
            key={point.id}
            type="button"
            className={`z-number-line-point ${selectedId === point.id ? "z-number-line-point-selected" : ""}`}
            style={{ left: `${position(point.value)}%` }}
            onClick={() => {
              if (reviewMode) return;
              setSelectedId(point.id);
              setResult(null);
              setSubmitted(false);
            }}
            disabled={reviewMode}
          >
            <span className="z-number-line-dot" />
            <span className="z-number-line-label">{point.label}</span>
            {point.z !== undefined && (
              <span className="z-number-line-z">z = {point.z > 0 ? "+" : ""}{point.z}</span>
            )}
          </button>
        ))}
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
          disabled={reviewMode || !selectedId}
        >
          Check
        </button>
      </div>
    </div>
  );
}
