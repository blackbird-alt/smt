import { useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

export default function BarChartTapStep({
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
  const bars = step.bars || [];
  const maxCount = Math.max(...bars.map((bar) => bar.count), 1);
  const selected = bars.find((bar) => bar.id === selectedId);
  const showHints = submitted && result && !result.correct;

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
    <div className="step bar-chart-tap-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="bar-chart-interactive" role="group" aria-label="Bar chart">
        {bars.map((bar) => (
          <button
            key={bar.id}
            type="button"
            className={`bar-chart-col ${selectedId === bar.id ? "bar-chart-col-selected" : ""}`}
            onClick={() => {
              if (reviewMode) return;
              setSelectedId(bar.id);
              setResult(null);
              setSubmitted(false);
            }}
            disabled={reviewMode}
          >
            <div
              className="bar-chart-fill"
              style={{ height: `${(bar.count / maxCount) * 100}%` }}
            />
            <span className="bar-chart-count">{bar.count}</span>
            <span className="bar-chart-label">{bar.label}</span>
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
