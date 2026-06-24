import { useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

export default function DistributionChoiceStep({
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

  const hints = step.hints ?? [];
  const showHints = submitted && result && !result.correct;
  const selectedOption = step.options.find((option) => option.id === selectedId);

  function openHint() {
    if (reviewMode || hintLevel >= hints.length) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    onSaveProgress?.({ selectedId, hintLevel: next, result, submitted });
  }

  function checkAnswer() {
    if (!selectedOption) return;
    setSubmitted(true);
    const correct = Boolean(selectedOption.correct);
    const message = correct ? null : step.feedback?.wrong || "Try again.";
    setResult({ correct, message });
    const state = {
      selectedId,
      probabilities: selectedOption.probabilities,
      result: { correct, message },
      hintLevel,
      submitted: true,
    };
    if (correct) onComplete(state, null);
    else onSaveProgress?.(state);
  }

  return (
    <div className="step distribution-choice-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="distribution-options">
        {step.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`distribution-option ${selectedId === option.id ? "distribution-option-selected" : ""}`}
            onClick={() => {
              if (reviewMode) return;
              setSelectedId(option.id);
              setResult(null);
              setSubmitted(false);
              onSaveProgress?.({
                selectedId: option.id,
                probabilities: option.probabilities,
                hintLevel,
              });
            }}
          >
            <span className="distribution-option-label">{option.label}</span>
            <MiniChart faces={step.faces} probabilities={option.probabilities} />
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

function MiniChart({ faces, probabilities }) {
  return (
    <div className="mini-chart">
      {faces.map((face, index) => (
        <div key={face} className="mini-bar">
          <div
            className="mini-bar-fill"
            style={{ height: `${probabilities[index] * 100 * 3}%` }}
          />
          <span>{face}</span>
        </div>
      ))}
    </div>
  );
}
