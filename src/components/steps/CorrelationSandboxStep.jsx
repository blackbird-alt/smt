import { useMemo, useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import { formatR, getPresetPoints, leastSquares, pearsonR } from "../../lib/stats";

const PLOT_SIZE = 280;
const PAD = 28;
const SANDBOX_BOUNDS = { minX: 0, maxX: 10, minY: 0, maxY: 10 };

function toScreen(point, bounds) {
  const { minX, maxX, minY, maxY } = bounds;
  const x = PAD + ((point.x - minX) / (maxX - minX)) * (PLOT_SIZE - PAD * 2);
  const y = PLOT_SIZE - PAD - ((point.y - minY) / (maxY - minY)) * (PLOT_SIZE - PAD * 2);
  return { x, y };
}

function clientToData(clientX, clientY, svg, bounds = SANDBOX_BOUNDS) {
  const rect = svg.getBoundingClientRect();
  const scaleX = PLOT_SIZE / rect.width;
  const scaleY = PLOT_SIZE / rect.height;
  const sx = (clientX - rect.left) * scaleX;
  const sy = (clientY - rect.top) * scaleY;

  const xRatio = (sx - PAD) / (PLOT_SIZE - PAD * 2);
  const yRatio = 1 - (sy - PAD) / (PLOT_SIZE - PAD * 2);
  const { minX, maxX, minY, maxY } = bounds;

  return {
    x: Math.max(minX, Math.min(maxX, minX + xRatio * (maxX - minX))),
    y: Math.max(minY, Math.min(maxY, minY + yRatio * (maxY - minY))),
  };
}

function getBounds(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    minX: Math.min(...xs) - 0.5,
    maxX: Math.max(...xs) + 0.5,
    minY: Math.min(...ys) - 0.5,
    maxY: Math.max(...ys) + 0.5,
  };
}

function initialOutlier(savedState) {
  if (savedState?.customOutlier) return savedState.customOutlier;
  if (savedState?.outlierOn) return { x: 9.5, y: 2.5 };
  return null;
}

export function MiniScatterPlot({ points, showLine = false, className = "" }) {
  const bounds = useMemo(() => getBounds(points), [points]);
  const line = useMemo(() => leastSquares(points), [points]);

  const lineStart = { x: bounds.minX, y: line.intercept + line.slope * bounds.minX };
  const lineEnd = { x: bounds.maxX, y: line.intercept + line.slope * bounds.maxX };
  const start = toScreen(lineStart, bounds);
  const end = toScreen(lineEnd, bounds);

  return (
    <svg
      viewBox={`0 0 ${PLOT_SIZE} ${PLOT_SIZE}`}
      className={`mini-scatter ${className}`}
      role="img"
      aria-hidden="true"
    >
      <rect x={PAD} y={PAD} width={PLOT_SIZE - PAD * 2} height={PLOT_SIZE - PAD * 2} className="scatter-frame" />
      {showLine && (
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="scatter-regression" />
      )}
      {points.map((point, index) => {
        const screen = toScreen(point, bounds);
        return <circle key={index} cx={screen.x} cy={screen.y} r={5} className="scatter-dot" />;
      })}
    </svg>
  );
}

export default function CorrelationSandboxStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const [points, setPoints] = useState(
    () => savedState?.points || getPresetPoints(step.preset || "sandbox"),
  );
  const [customOutlier, setCustomOutlier] = useState(() => initialOutlier(savedState));
  const [explored, setExplored] = useState(savedState?.explored ?? false);
  const [guessR, setGuessR] = useState(savedState?.guessR ?? 0);
  const [revealed, setRevealed] = useState(savedState?.revealed ?? false);

  const activePoints = useMemo(() => {
    if (!customOutlier) return points;
    return [...points, customOutlier];
  }, [points, customOutlier]);

  const r = pearsonR(activePoints);
  const r2 = r * r;
  const line = leastSquares(activePoints);
  const bounds = useMemo(() => getBounds(activePoints), [activePoints]);

  function persistState(next) {
    onSaveProgress?.({
      points,
      customOutlier,
      explored: true,
      guessR,
      revealed,
      ...next,
    });
  }

  function movePoint(index, clientX, clientY, svg) {
    if (reviewMode) return;
    const nextPoint = clientToData(clientX, clientY, svg);

    setPoints((current) => {
      const next = current.map((point, idx) => (idx === index ? nextPoint : point));
      persistState({ points: next });
      return next;
    });
    setExplored(true);
  }

  function moveOutlier(clientX, clientY, svg) {
    if (reviewMode) return;
    const nextOutlier = clientToData(clientX, clientY, svg);
    setCustomOutlier(nextOutlier);
    setExplored(true);
    persistState({ customOutlier: nextOutlier });
  }

  function placeOutlier(event) {
    if (reviewMode) return;
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;

    const nextOutlier = clientToData(event.clientX, event.clientY, svg);
    setCustomOutlier(nextOutlier);
    setExplored(true);
    persistState({ customOutlier: nextOutlier });
  }

  function removeOutlier() {
    if (reviewMode) return;
    setCustomOutlier(null);
    setExplored(true);
    persistState({ customOutlier: null });
  }

  function handleCheck() {
    onComplete(
      { points, customOutlier, explored: true, guessR, revealed, r, r2 },
      step.feedback?.ready ?? null,
    );
  }

  const lineStart = { x: bounds.minX, y: line.intercept + line.slope * bounds.minX };
  const lineEnd = { x: bounds.maxX, y: line.intercept + line.slope * bounds.maxX };
  const start = toScreen(lineStart, bounds);
  const end = toScreen(lineEnd, bounds);

  return (
    <div className="step correlation-sandbox-step">
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="scatter-stage">
        <svg
          viewBox={`0 0 ${PLOT_SIZE} ${PLOT_SIZE}`}
          className="scatter-plot"
          role="img"
          aria-label="Interactive scatterplot"
        >
          <rect x={PAD} y={PAD} width={PLOT_SIZE - PAD * 2} height={PLOT_SIZE - PAD * 2} className="scatter-frame" />
          <rect
            x={PAD}
            y={PAD}
            width={PLOT_SIZE - PAD * 2}
            height={PLOT_SIZE - PAD * 2}
            className="scatter-hit-area"
            onPointerDown={placeOutlier}
          />
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="scatter-regression" />
          {points.map((point, index) => {
            const screen = toScreen(point, bounds);
            return (
              <circle
                key={`base-${index}`}
                cx={screen.x}
                cy={screen.y}
                r={8}
                className="scatter-dot scatter-dot-draggable"
                onPointerDown={(event) => {
                  if (reviewMode) return;
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (reviewMode) return;
                  if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                  movePoint(index, event.clientX, event.clientY, event.currentTarget.ownerSVGElement);
                }}
              />
            );
          })}
          {customOutlier && (
            <circle
              cx={toScreen(customOutlier, bounds).x}
              cy={toScreen(customOutlier, bounds).y}
              r={9}
              className="scatter-dot scatter-dot-outlier scatter-dot-draggable"
              onPointerDown={(event) => {
                if (reviewMode) return;
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (reviewMode) return;
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                moveOutlier(event.clientX, event.clientY, event.currentTarget.ownerSVGElement);
              }}
            />
          )}
        </svg>

        <div className="scatter-stats">
          <div className="stat">
            <span className="stat-label">r</span>
            <span className="stat-value">{formatR(r)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">r²</span>
            <span className="stat-value">{formatR(r2)}</span>
          </div>
          <div className="r2-bar">
            <div className="r2-bar-fill" style={{ width: `${Math.min(100, r2 * 100)}%` }} />
          </div>
          <p className="scatter-line-eq">
            ŷ = {line.intercept.toFixed(1)} + {line.slope.toFixed(2)}x
          </p>
        </div>
      </div>

      <div className="step-actions">
        {customOutlier ? (
          <button type="button" className="btn btn-secondary" onClick={removeOutlier} disabled={reviewMode}>
            Remove outlier
          </button>
        ) : (
          <p className="step-hint scatter-click-hint">Click anywhere on the plot to place your own outlier.</p>
        )}
      </div>

      {step.guessMode && (
        <div className="guess-r-panel">
          <label htmlFor="guess-r">Guess r before looking closely:</label>
          <input
            id="guess-r"
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={guessR}
            onChange={(event) => {
              setGuessR(Number(event.target.value));
              setExplored(true);
            }}
            disabled={reviewMode}
          />
          <span>{formatR(guessR)}</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRevealed(true)}
            disabled={reviewMode || revealed}
          >
            Reveal true r
          </button>
          {revealed && <p className="step-hint">True r = {formatR(r)} (you guessed {formatR(guessR)})</p>}
        </div>
      )}

      {!reviewMode && !explored && (
        <p className="step-hint">Drag any point, click to add an outlier, then watch r and the line update live.</p>
      )}

      {explored && (
        <button type="button" className="btn btn-primary" onClick={reviewMode ? () => {} : handleCheck}>
          Continue
        </button>
      )}
    </div>
  );
}
