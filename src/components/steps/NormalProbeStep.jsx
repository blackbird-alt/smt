import { useMemo, useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import { areaBetween } from "../../lib/normalTable";
import ProblemHints from "../ProblemHints";

const Z_MIN = -3.5;
const Z_MAX = 3.5;
const WIDTH = 360;
const HEIGHT = 150;
const PAD_X = 20;
const BASELINE = 128;
const CURVE_TOP = 22;

function normalPdf(z) {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

function zToX(z) {
  const t = (z - Z_MIN) / (Z_MAX - Z_MIN);
  return PAD_X + t * (WIDTH - PAD_X * 2);
}

function pdfToY(z) {
  const height = BASELINE - CURVE_TOP;
  return BASELINE - (normalPdf(z) / normalPdf(0)) * height;
}

function sampleCurve(zStart, zEnd, steps = 80) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const z = zStart + (index / steps) * (zEnd - zStart);
    return { x: zToX(z), y: pdfToY(z) };
  });
}

function pointsToPath(points) {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function shadeUnderCurve(zLow, zHigh) {
  const low = Math.max(zLow, Z_MIN);
  const high = Math.min(zHigh, Z_MAX);
  const curve = sampleCurve(low, high, 64);
  if (!curve.length) return "";
  const xLow = zToX(low);
  const xHigh = zToX(high);
  let path = `M ${xLow.toFixed(2)} ${BASELINE}`;
  for (const point of curve) {
    path += ` L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }
  path += ` L ${xHigh.toFixed(2)} ${BASELINE} Z`;
  return path;
}

export default function NormalProbeStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const [zLow, setZLow] = useState(savedState?.zLow ?? step.initialLow ?? -1);
  const [zHigh, setZHigh] = useState(savedState?.zHigh ?? step.initialHigh ?? 1);
  const [result, setResult] = useState(savedState?.result || null);
  const [hintLevel, setHintLevel] = useState(savedState?.hintLevel ?? 0);
  const [submitted, setSubmitted] = useState(Boolean(savedState?.submitted));

  const hints = step.hints || [];
  const showHints = submitted && result && !result.correct;
  const lo = Math.min(zLow, zHigh);
  const hi = Math.max(zLow, zHigh);
  const area = areaBetween(lo, hi);
  const target = step.targetArea;
  const tolerance = step.tolerance ?? 0.02;

  const curvePath = useMemo(() => pointsToPath(sampleCurve(Z_MIN, Z_MAX, 120)), []);
  const shadedPath = useMemo(() => shadeUnderCurve(lo, hi), [lo, hi]);

  function persist(next) {
    onSaveProgress?.({
      zLow,
      zHigh,
      result,
      hintLevel,
      submitted,
      area,
      ...next,
    });
  }

  function updateLow(value) {
    if (reviewMode) return;
    setZLow(value);
    setResult(null);
    setSubmitted(false);
    persist({ zLow: value });
  }

  function updateHigh(value) {
    if (reviewMode) return;
    setZHigh(value);
    setResult(null);
    setSubmitted(false);
    persist({ zHigh: value });
  }

  function openHint() {
    if (reviewMode || hintLevel >= hints.length) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    persist({ hintLevel: next });
  }

  function checkAnswer() {
    setSubmitted(true);
    const correct = Math.abs(area - target) <= tolerance;
    const message = correct ? null : step.feedback?.wrong || "Try again.";
    setResult({ correct, message });
    const state = {
      zLow,
      zHigh,
      area,
      result: { correct, message },
      hintLevel,
      submitted: true,
    };
    if (correct) onComplete(state, null);
    else persist(state);
  }

  const boundLow = { x: zToX(lo), y: pdfToY(lo) };
  const boundHigh = { x: zToX(hi), y: pdfToY(hi) };

  return (
    <div className="step normal-probe-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="normal-area-callout normal-area-callout-target">
        <span className="normal-area-label">Your shaded area</span>
        <span className="normal-area-value">{(area * 100).toFixed(1)}%</span>
        {step.targetLabel && (
          <span className="normal-area-bounds">{formatRichText(step.targetLabel)}</span>
        )}
      </div>

      <div className="normal-curve-wrap">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="normal-curve" role="img">
          <line x1={PAD_X} y1={BASELINE} x2={WIDTH - PAD_X} y2={BASELINE} className="normal-axis" />
          <path d={shadedPath} className="normal-shade-fill" />
          <path d={curvePath} className="normal-curve-line" fill="none" />
          <line x1={boundLow.x} y1={boundLow.y} x2={boundLow.x} y2={BASELINE} className="normal-bound-line" />
          <line x1={boundHigh.x} y1={boundHigh.y} x2={boundHigh.x} y2={BASELINE} className="normal-bound-line" />
        </svg>
      </div>

      <div className="normal-sliders">
        <label>
          Left bound z = {zLow.toFixed(1)}
          <input type="range" min={-3} max={3} step={0.1} value={zLow} onChange={(e) => updateLow(Number(e.target.value))} disabled={reviewMode} />
        </label>
        <label>
          Right bound z = {zHigh.toFixed(1)}
          <input type="range" min={-3} max={3} step={0.1} value={zHigh} onChange={(e) => updateHigh(Number(e.target.value))} disabled={reviewMode} />
        </label>
      </div>

      {result && !result.correct && submitted && !reviewMode && (
        <div className="feedback feedback-wrong" role="status">
          {formatRichText(result.message)}
        </div>
      )}

      <ProblemHints hints={hints} hintLevel={hintLevel} showHints={showHints} reviewMode={reviewMode} onOpenHint={openHint} />

      <div className="step-actions">
        <button type="button" className="btn btn-primary" onClick={reviewMode ? () => {} : checkAnswer} disabled={reviewMode}>
          Check
        </button>
      </div>
    </div>
  );
}
