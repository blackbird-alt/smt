import { useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

export default function OutcomeSelectStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const [selected, setSelected] = useState(
    () => new Set(savedState?.selected || []),
  );
  const [result, setResult] = useState(savedState?.result || null);
  const [hintLevel, setHintLevel] = useState(savedState?.hintLevel ?? 0);
  const [submitted, setSubmitted] = useState(Boolean(savedState?.submitted));

  const faces = step.faces || [1, 2, 3, 4, 5, 6];
  const correct = new Set(step.correctOutcomes || []);
  const hints = step.hints || [];
  const showHints = submitted && result && !result.correct;
  const singleSelect = step.singleSelect === true;

  function toggle(face) {
    if (reviewMode) return;
    setSelected((current) => {
      const next = singleSelect ? new Set() : new Set(current);
      if (next.has(face)) next.delete(face);
      else next.add(face);
      onSaveProgress?.({ selected: [...next], hintLevel, result: null, submitted: false });
      return next;
    });
    setResult(null);
    setSubmitted(false);
  }

  function openHint() {
    if (reviewMode || hintLevel >= hints.length) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    onSaveProgress?.({ selected: [...selected], hintLevel: next, result, submitted });
  }

  function checkAnswer() {
    setSubmitted(true);
    const match =
      selected.size === correct.size &&
      [...correct].every((face) => selected.has(face));
    const message = match ? null : step.feedback?.wrong || "Try again.";
    setResult({ correct: match, message });

    const state = { selected: [...selected], result: { correct: match, message }, hintLevel, submitted: true };
    if (match) onComplete(state, null);
    else onSaveProgress?.(state);
  }

  const total = faces.length;
  const count = selected.size;

  return (
    <div className="step outcome-select-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="outcome-grid">
        {faces.map((face) => (
          <button
            key={face}
            type="button"
            className={`outcome-face ${selected.has(face) ? "outcome-face-selected" : ""}`}
            onClick={() => toggle(face)}
            disabled={reviewMode}
          >
            {face}
          </button>
        ))}
      </div>

      <div className="outcome-meter">
        <div className="outcome-meter-label">
          <span>{count} of {total} selected</span>
          {count > 0 && (
            <span className="outcome-fraction">{count}/{total}</span>
          )}
        </div>
        <div className="outcome-meter-track">
          <div
            className="outcome-meter-fill"
            style={{ width: `${(count / total) * 100}%` }}
          />
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
          disabled={!reviewMode && selected.size === 0}
        >
          Check
        </button>
      </div>
    </div>
  );
}
