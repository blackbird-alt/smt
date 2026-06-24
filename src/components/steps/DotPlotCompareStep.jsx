import { useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

function maxFrequency(values) {
  const counts = {};
  let max = 0;
  for (const value of values) {
    counts[value] = (counts[value] || 0) + 1;
    max = Math.max(max, counts[value]);
  }
  return max;
}

function DotPlot({ label, values, color, domainMin, domainMax, rows }) {
  const min = domainMin ?? Math.min(...values);
  const max = domainMax ?? Math.max(...values);
  const span = max - min || 1;

  const seen = {};
  const dots = values.map((value) => {
    const stackIndex = seen[value] || 0;
    seen[value] = stackIndex + 1;
    return { value, stackIndex };
  });

  const rowStep = 18;
  const trackHeight = rows * rowStep + 12;

  return (
    <div className="dot-plot-panel">
      <h4 className="dot-plot-title">{label}</h4>
      <div className="dot-plot-track" style={{ height: `${trackHeight}px` }}>
        {dots.map((dot, index) => (
          <span
            key={`${dot.value}-${index}`}
            className="dot-plot-dot"
            style={{
              left: `${8 + ((dot.value - min) / span) * 84}%`,
              bottom: `${6 + dot.stackIndex * rowStep}px`,
              background: color,
            }}
            title={String(dot.value)}
          />
        ))}
      </div>
      <div className="dot-plot-axis">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function DotPlotCompareStep({
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
  const options = step.options || [];
  const showHints = submitted && result && !result.correct;
  const selected = options.find((option) => option.id === selectedId);

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
    <div className="step dot-plot-compare-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      {(() => {
        const aValues = step.seriesA?.values || [];
        const bValues = step.seriesB?.values || [];
        const all = [...aValues, ...bValues];
        const domainMin = all.length ? Math.min(...all) : 0;
        const domainMax = all.length ? Math.max(...all) : 1;
        const rows = Math.max(maxFrequency(aValues), maxFrequency(bValues), 3);
        return (
          <div className="dot-plot-grid">
            <DotPlot
              label={step.seriesA?.label}
              values={aValues}
              color="#6366f1"
              domainMin={domainMin}
              domainMax={domainMax}
              rows={rows}
            />
            <DotPlot
              label={step.seriesB?.label}
              values={bValues}
              color="#0ea5e9"
              domainMin={domainMin}
              domainMax={domainMax}
              rows={rows}
            />
          </div>
        );
      })()}

      <div className="tap-choice-grid">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`tap-choice ${selectedId === option.id ? "tap-choice-selected" : ""}`}
            onClick={() => {
              if (reviewMode) return;
              setSelectedId(option.id);
              setResult(null);
              setSubmitted(false);
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
          disabled={reviewMode || !selectedId}
        >
          Check
        </button>
      </div>
    </div>
  );
}
