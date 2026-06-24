import { useMemo, useRef, useState } from "react";
import { formatRichText } from "../../lib/formatRichText";

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function sampleStdDev(values) {
  const avg = mean(values);
  const sumSquares = values.reduce((total, value) => total + (value - avg) ** 2, 0);
  return Math.sqrt(sumSquares / (values.length - 1));
}

export default function OutlierDragStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const baseValues = useMemo(
    () => step.values || [42, 45, 47, 50, 56],
    [step.values],
  );
  const draggableIndex = step.draggableIndex ?? baseValues.length - 1;
  const min = step.min ?? 40;
  const max = step.max ?? 90;
  const scaleMin = min - 5;
  const scaleMax = max + 5;
  const initialValue = baseValues[draggableIndex];

  const [draggedValue, setDraggedValue] = useState(
    savedState?.draggedValue ?? initialValue,
  );
  const trackRef = useRef(null);
  const draggingRef = useRef(false);

  const hasDragged = Math.abs(draggedValue - initialValue) >= 2;

  const values = useMemo(() => {
    const next = [...baseValues];
    next[draggableIndex] = draggedValue;
    return next;
  }, [baseValues, draggableIndex, draggedValue]);

  const stats = useMemo(
    () => ({
      mean: mean(values),
      median: median(values),
      sd: sampleStdDev(values),
    }),
    [values],
  );

  const originalMean = useMemo(() => mean(baseValues), [baseValues]);

  function valueFromClientX(clientX) {
    if (!trackRef.current) return draggedValue;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(scaleMin + ratio * (scaleMax - scaleMin));
  }

  function updateDraggedValue(clientX) {
    if (reviewMode) return;
    const next = Math.max(min, Math.min(max, valueFromClientX(clientX)));
    setDraggedValue(next);
    onSaveProgress?.({ draggedValue: next, hasDragged: Math.abs(next - initialValue) >= 2 });
  }

  function handlePointerDown(event) {
    if (reviewMode) return;
    draggingRef.current = true;
    trackRef.current?.setPointerCapture(event.pointerId);
    updateDraggedValue(event.clientX);
  }

  function handlePointerMove(event) {
    if (reviewMode || !draggingRef.current) return;
    if (!trackRef.current?.hasPointerCapture(event.pointerId)) return;
    updateDraggedValue(event.clientX);
  }

  function handlePointerUp(event) {
    draggingRef.current = false;
    trackRef.current?.releasePointerCapture(event.pointerId);
  }

  function handleCheck() {
    if (!hasDragged) return;
    onComplete(
      { draggedValue, hasDragged: true, stats },
      step.feedback?.ready ?? null,
    );
  }

  function positionFor(value) {
    return ((value - scaleMin) / (scaleMax - scaleMin)) * 100;
  }

  return (
    <div className="step outlier-drag-step">
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div
        className="dot-plot"
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="dot-plot-axis" />
        {values.map((value, index) => {
          const isDraggable = index === draggableIndex;
          return (
            <div
              key={index}
              className={`dot-plot-point ${isDraggable ? "dot-plot-point-draggable" : ""}`}
              style={{ left: `${positionFor(value)}%` }}
              aria-hidden={!isDraggable}
            >
              {value}
            </div>
          );
        })}
        <div
          className="dot-plot-marker dot-plot-mean"
          style={{ left: `${positionFor(stats.mean)}%` }}
          title="Mean"
        >
          <span>x̄</span>
        </div>
        <div
          className="dot-plot-marker dot-plot-median"
          style={{ left: `${positionFor(stats.median)}%` }}
          title="Median"
        >
          <span>M</span>
        </div>
      </div>

      <div className="live-stats three-stats">
        <div className="stat">
          <span className="stat-label">Mean</span>
          <span className="stat-value">{stats.mean.toFixed(1)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Median</span>
          <span className="stat-value">{stats.median.toFixed(1)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Sample SD</span>
          <span className="stat-value">{stats.sd.toFixed(1)}</span>
        </div>
      </div>

      {hasDragged && Math.abs(stats.mean - originalMean) > 0.5 && (
        <p className="step-hint">
          The mean slid from {originalMean.toFixed(1)} to {stats.mean.toFixed(1)} g. Watch the median — does it jump only when you cross the middle?
        </p>
      )}

      {!reviewMode && !hasDragged && (
        <p className="step-hint">Drag along the axis to move the highlighted point (rightmost).</p>
      )}

      <div className="step-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={reviewMode ? () => {} : handleCheck}
          disabled={!reviewMode && !hasDragged}
        >
          Check
        </button>
      </div>
    </div>
  );
}
