import { useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

const WIDTH = 360;
const HEIGHT = 150;
const PAD_X = 24;
const AXIS_Y = 118;
const BOX_TOP = 40;
const BOX_BOTTOM = 86;
const BOX_MID = (BOX_TOP + BOX_BOTTOM) / 2;

function BoxFigure({ box }) {
  const axisMin = box.axisMin;
  const axisMax = box.axisMax;
  const span = axisMax - axisMin || 1;
  const toX = (v) => PAD_X + ((v - axisMin) / span) * (WIDTH - PAD_X * 2);

  const fences = [
    { value: box.lowerFence, label: `LF ${box.lowerFence}` },
    { value: box.upperFence, label: `UF ${box.upperFence}` },
  ].filter((f) => f.value != null && f.value >= axisMin && f.value <= axisMax);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="box-plot" role="img" aria-label="Box plot">
      <line x1={PAD_X} y1={AXIS_Y} x2={WIDTH - PAD_X} y2={AXIS_Y} className="box-axis" />
      <text x={PAD_X} y={AXIS_Y + 18} className="box-axis-tick" textAnchor="middle">{axisMin}</text>
      <text x={WIDTH - PAD_X} y={AXIS_Y + 18} className="box-axis-tick" textAnchor="middle">{axisMax}</text>

      {fences.map((fence) => (
        <g key={fence.label}>
          <line
            x1={toX(fence.value)}
            y1={BOX_TOP - 12}
            x2={toX(fence.value)}
            y2={AXIS_Y}
            className="box-fence"
          />
          <text x={toX(fence.value)} y={BOX_TOP - 16} className="box-fence-label" textAnchor="middle">
            {fence.label}
          </text>
        </g>
      ))}

      {/* whiskers */}
      <line x1={toX(box.min)} y1={BOX_MID} x2={toX(box.q1)} y2={BOX_MID} className="box-whisker" />
      <line x1={toX(box.q3)} y1={BOX_MID} x2={toX(box.max)} y2={BOX_MID} className="box-whisker" />
      <line x1={toX(box.min)} y1={BOX_TOP + 8} x2={toX(box.min)} y2={BOX_BOTTOM - 8} className="box-whisker" />
      <line x1={toX(box.max)} y1={BOX_TOP + 8} x2={toX(box.max)} y2={BOX_BOTTOM - 8} className="box-whisker" />

      {/* box */}
      <rect
        x={toX(box.q1)}
        y={BOX_TOP}
        width={toX(box.q3) - toX(box.q1)}
        height={BOX_BOTTOM - BOX_TOP}
        className="box-rect"
      />
      <line x1={toX(box.median)} y1={BOX_TOP} x2={toX(box.median)} y2={BOX_BOTTOM} className="box-median" />

      <text x={toX(box.q1)} y={BOX_BOTTOM + 16} className="box-tick" textAnchor="middle">Q1 {box.q1}</text>
      <text x={toX(box.median)} y={BOX_TOP - 6} className="box-tick" textAnchor="middle">med {box.median}</text>
      <text x={toX(box.q3)} y={BOX_BOTTOM + 16} className="box-tick" textAnchor="middle">Q3 {box.q3}</text>

      {(box.points || []).map((point, index) => (
        <g key={`${point.value}-${index}`}>
          <circle
            cx={toX(point.value)}
            cy={BOX_MID}
            r={6}
            className={`box-point ${point.outlier ? "box-point-outlier" : ""}`}
          />
          <text x={toX(point.value)} y={BOX_MID - 12} className="box-point-label" textAnchor="middle">
            {point.value}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function BoxPlotStep({
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
    <div className="step box-plot-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="box-plot-wrap">
        <BoxFigure box={step.boxplot || {}} />
      </div>

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
