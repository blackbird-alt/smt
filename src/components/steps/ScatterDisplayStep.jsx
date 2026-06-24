import { useMemo } from "react";
import { formatRichText } from "../../lib/formatRichText";
import { MiniScatterPlot } from "./CorrelationSandboxStep";
import { formatR, getPresetPoints, leastSquares, pearsonR } from "../../lib/stats";

export default function ScatterDisplayStep({ step, reviewMode, onComplete }) {
  const points = useMemo(
    () => step.points || getPresetPoints(step.preset || "sandbox"),
    [step.points, step.preset],
  );
  const showLine = step.showLine ?? true;
  const r = pearsonR(points);
  const line = leastSquares(points);

  return (
    <div className="step scatter-display-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="scatter-stage scatter-display-stage">
        <MiniScatterPlot points={points} showLine={showLine} className="scatter-display-plot" />
        {step.showStats !== false && (
          <div className="scatter-stats">
            <div className="stat">
              <span className="stat-label">r</span>
              <span className="stat-value">{formatR(r)}</span>
            </div>
            {showLine && (
              <p className="scatter-line-eq">
                ŷ = {line.intercept.toFixed(1)} + {line.slope.toFixed(2)}x
              </p>
            )}
          </div>
        )}
      </div>

      {(step.xLabel || step.yLabel) && (
        <div className="scatter-axis-labels">
          {step.xLabel && <span>{step.xLabel}</span>}
          {step.yLabel && <span>{step.yLabel}</span>}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={reviewMode ? () => {} : () => onComplete({}, step.feedback?.ready ?? null)}
      >
        Continue
      </button>
    </div>
  );
}
