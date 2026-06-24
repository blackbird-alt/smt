import { useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";
import { MiniScatterPlot } from "./CorrelationSandboxStep";
import { getPresetPoints } from "../../lib/stats";

const R_LABELS = {
  "-0.95": "−0.95",
  "-0.4": "−0.4",
  "0": "0.0",
  "0.8": "0.8",
};

export default function ScatterMatchStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const [assignments, setAssignments] = useState(
    () => savedState?.assignments || {},
  );
  const [result, setResult] = useState(savedState?.result || null);
  const [hintLevel, setHintLevel] = useState(savedState?.hintLevel ?? 0);
  const [submitted, setSubmitted] = useState(Boolean(savedState?.submitted));

  const hints = step.hints || [];
  const plots = step.plots || [];
  const rOptions = step.rOptions || ["-0.95", "-0.4", "0", "0.8"];

  function assign(plotId, rValue) {
    if (reviewMode) return;
    setAssignments((current) => {
      const next = { ...current, [plotId]: rValue };
      onSaveProgress?.({ assignments: next, hintLevel, submitted: false, hintsOpened: range(hintLevel) });
      return next;
    });
    setResult(null);
    setSubmitted(false);
  }

  function openHint() {
    if (reviewMode || hintLevel >= hints.length) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    onSaveProgress?.({
      assignments,
      hintLevel: next,
      result,
      submitted,
      hintsOpened: range(next),
    });
  }

  function checkAnswer() {
    setSubmitted(true);
    const match = plots.every((plot) => assignments[plot.id] === plot.correctR);
    const message = match ? null : step.feedback?.wrong || "Try again.";
    setResult({ correct: match, message });

    const state = {
      assignments,
      result: { correct: match, message },
      hintLevel,
      submitted: true,
      hintsOpened: range(hintLevel),
    };

    if (match) {
      onComplete(state, null);
    } else {
      onSaveProgress?.(state);
    }
  }

  const allAssigned = plots.every((plot) => assignments[plot.id]);
  const showHints = submitted && result && !result.correct;

  return (
    <div className="step scatter-match-step">
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="scatter-match-grid">
        {plots.map((plot) => {
          const points = getPresetPoints(plot.preset);
          return (
            <div key={plot.id} className="scatter-match-card">
              <strong className="scatter-match-label">Plot {plot.label}</strong>
              <MiniScatterPlot points={points} />
              <div className="scatter-r-options">
                {rOptions.map((rValue) => (
                  <button
                    key={rValue}
                    type="button"
                    className={`scatter-r-btn ${assignments[plot.id] === rValue ? "scatter-r-btn-selected" : ""}`}
                    onClick={() => assign(plot.id, rValue)}
                    disabled={reviewMode}
                  >
                    {R_LABELS[rValue] || rValue}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
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
          disabled={!reviewMode && !allAssigned}
        >
          Check
        </button>
      </div>
    </div>
  );
}

function range(n) {
  return Array.from({ length: n }, (_, index) => index + 1);
}
