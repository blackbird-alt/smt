import { useState } from "react";
import { formatRichText } from "../../lib/formatRichText";

function randomNormal(mean, sd) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + sd * z;
}

export default function CISimulatorStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const mean = step.populationMean ?? 100;
  const sd = step.populationSd ?? 15;
  const n = step.sampleSize ?? 25;
  const zStar = step.zStar ?? 1.96;
  const se = sd / Math.sqrt(n);
  const margin = zStar * se;

  const [intervals, setIntervals] = useState(savedState?.intervals || []);
  const [explored, setExplored] = useState(savedState?.explored ?? false);

  const captures = intervals.filter((interval) => interval.captures).length;
  const rate = intervals.length === 0 ? null : captures / intervals.length;

  function runBatch(count) {
    if (reviewMode) return;
    const batch = Array.from({ length: count }, () => {
      const sampleMean = randomNormal(mean, se);
      const low = sampleMean - margin;
      const high = sampleMean + margin;
      return { low, high, mean: sampleMean, captures: low <= mean && mean <= high };
    });
    setIntervals((current) => [...current, ...batch].slice(-30));
    setExplored(true);
    onSaveProgress?.({ intervals: [...intervals, ...batch].slice(-30), explored: true });
  }

  function handleCheck() {
    onComplete({ intervals, captures, rate, explored: true }, step.feedback?.ready ?? null);
  }

  return (
    <div className="step ci-simulator-step">
      <p className="step-prompt">{formatRichText(step.prompt)}</p>
      <p className="event-label">
        True mean = <strong>{mean}</strong> · 95% CI uses x̄ ± {zStar}·(σ/√n)
      </p>

      <div className="ci-chart">
        <div className="ci-true-mean" style={{ left: "50%" }}>
          <span>μ = {mean}</span>
        </div>
        {intervals.slice(-12).map((interval, index) => (
          <div
            key={index}
            className={`ci-bar ${interval.captures ? "ci-bar-hit" : "ci-bar-miss"}`}
            style={{
              left: `${Math.max(5, Math.min(85, ((interval.low - (mean - 3 * margin)) / (6 * margin)) * 80 + 10))}%`,
              width: `${Math.max(8, ((interval.high - interval.low) / (6 * margin)) * 80)}%`,
            }}
          />
        ))}
      </div>

      <div className="dice-stats three-stats">
        <div className="stat">
          <span className="stat-label">Intervals run</span>
          <span className="stat-value">{intervals.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Captured μ</span>
          <span className="stat-value">{captures}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Capture rate</span>
          <span className="stat-value">{rate === null ? "—" : `${(rate * 100).toFixed(0)}%`}</span>
        </div>
      </div>

      <div className="step-actions roll-batch-actions">
        <button type="button" className="btn btn-secondary" onClick={() => runBatch(5)} disabled={reviewMode}>
          Run 5 CIs
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => runBatch(20)} disabled={reviewMode}>
          Run 20 CIs
        </button>
      </div>

      {explored && intervals.length >= 5 && (
        <button type="button" className="btn btn-primary" onClick={reviewMode ? () => {} : handleCheck}>
          Continue
        </button>
      )}
    </div>
  );
}
