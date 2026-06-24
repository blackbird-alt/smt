import { useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

export default function TapChoiceStep({
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
  const selected = step.options.find((option) => option.id === selectedId);
  const showHints = submitted && result && !result.correct;

  function openHint() {
    if (reviewMode || hintLevel >= hints.length) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    onSaveProgress?.({
      selectedId,
      hintLevel: next,
      result,
      submitted,
      hintsOpened: range(next),
    });
  }

  function checkAnswer() {
    if (!selected) return;
    setSubmitted(true);

    const correct = Boolean(selected.correct);
    const message = correct ? null : step.feedback?.wrong || "Try again.";
    setResult({ correct, message });

    const state = {
      selectedId,
      result: { correct, message },
      hintLevel,
      submitted: true,
      hintsOpened: range(hintLevel),
    };

    if (correct) {
      onComplete(state, null);
    } else {
      onSaveProgress?.(state);
    }
  }

  return (
    <div className="step tap-choice-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="tap-choice-grid">
        {step.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`tap-choice ${selectedId === option.id ? "tap-choice-selected" : ""}`}
            onClick={() => {
              if (reviewMode) return;
              setSelectedId(option.id);
              setResult(null);
              setSubmitted(false);
              onSaveProgress?.({ selectedId: option.id, hintLevel, submitted: false, hintsOpened: range(hintLevel) });
            }}
            disabled={reviewMode}
          >
            <span className="tap-choice-label">{option.label}</span>
            {option.sublabel && (
              <span className="tap-choice-sublabel">{formatRichText(option.sublabel)}</span>
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
          disabled={!reviewMode && !selectedId}
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
