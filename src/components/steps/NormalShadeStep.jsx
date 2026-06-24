import { useMemo, useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import { areaBetween } from "../../lib/normalTable";

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

export default function NormalShadeStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const [zLow, setZLow] = useState(savedState?.zLow ?? step.initialLow ?? -1);
  const [zHigh, setZHigh] = useState(savedState?.zHigh ?? step.initialHigh ?? 1);
  const [explored, setExplored] = useState(savedState?.explored ?? false);

  const area = areaBetween(zLow, zHigh);
  const areaPercent = (area * 100).toFixed(1);

  const curvePath = useMemo(
    () => pointsToPath(sampleCurve(Z_MIN, Z_MAX, 120)),
    [],
  );
  const shadedPath = useMemo(
    () => shadeUnderCurve(zLow, zHigh),
    [zLow, zHigh],
  );

  const boundLow = { x: zToX(zLow), y: pdfToY(zLow) };
  const boundHigh = { x: zToX(zHigh), y: pdfToY(zHigh) };

  function updateLow(value) {
    if (reviewMode) return;
    const next = Math.min(value, zHigh - 0.1);
    setZLow(next);
    setExplored(true);
    onSaveProgress?.({ zLow: next, zHigh, explored: true });
  }

  function updateHigh(value) {
    if (reviewMode) return;
    const next = Math.max(value, zLow + 0.1);
    setZHigh(next);
    setExplored(true);
    onSaveProgress?.({ zLow, zHigh: next, explored: true });
  }

  function handleCheck() {
    onComplete({ zLow, zHigh, area, explored: true }, step.feedback?.ready ?? null);
  }

  return (
    <div className="step normal-shade-step">
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="normal-area-callout" aria-live="polite">
        <span className="normal-area-label">Shaded area under the curve</span>
        <span className="normal-area-value">{areaPercent}%</span>
        <span className="normal-area-bounds">
          between z = {zLow.toFixed(1)} and z = {zHigh.toFixed(1)}
        </span>
      </div>

      <div className="normal-curve-wrap">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="normal-curve"
          role="img"
          aria-label={`Normal curve with ${areaPercent}% shaded between z ${zLow.toFixed(1)} and ${zHigh.toFixed(1)}`}
        >
          <line
            x1={PAD_X}
            y1={BASELINE}
            x2={WIDTH - PAD_X}
            y2={BASELINE}
            className="normal-axis"
          />

          <path d={shadedPath} className="normal-shade-fill" />

          <path d={curvePath} className="normal-curve-line" fill="none" />

          <line
            x1={boundLow.x}
            y1={boundLow.y}
            x2={boundLow.x}
            y2={BASELINE}
            className="normal-bound-line"
          />
          <line
            x1={boundHigh.x}
            y1={boundHigh.y}
            x2={boundHigh.x}
            y2={BASELINE}
            className="normal-bound-line"
          />

          <circle cx={boundLow.x} cy={boundLow.y} r={3.5} className="normal-bound-dot" />
          <circle cx={boundHigh.x} cy={boundHigh.y} r={3.5} className="normal-bound-dot" />

          {[-2, 0, 2].map((tick) => (
            <g key={tick}>
              <line
                x1={zToX(tick)}
                y1={BASELINE}
                x2={zToX(tick)}
                y2={BASELINE + 5}
                className="normal-tick"
              />
              <text x={zToX(tick)} y={BASELINE + 16} className="normal-tick-label" textAnchor="middle">
                {tick === 0 ? "0" : tick > 0 ? `+${tick}` : tick}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="normal-sliders">
        <label>
          Left bound z = {zLow.toFixed(1)}
          <input
            type="range"
            min={-3}
            max={2.5}
            step={0.1}
            value={zLow}
            onChange={(event) => updateLow(Number(event.target.value))}
            disabled={reviewMode}
          />
        </label>
        <label>
          Right bound z = {zHigh.toFixed(1)}
          <input
            type="range"
            min={-2.5}
            max={3}
            step={0.1}
            value={zHigh}
            onChange={(event) => updateHigh(Number(event.target.value))}
            disabled={reviewMode}
          />
        </label>
      </div>

      {explored && (
        <button type="button" className="btn btn-primary" onClick={reviewMode ? () => {} : handleCheck}>
          Continue
        </button>
      )}
    </div>
  );
}
