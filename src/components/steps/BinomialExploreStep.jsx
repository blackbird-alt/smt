import { useMemo, useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import { binomialMean, binomialPmf, binomialStdDev } from "../../lib/binomial";

export default function BinomialExploreStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const [n, setN] = useState(savedState?.n ?? step.initialN ?? 10);
  const [p, setP] = useState(savedState?.p ?? step.initialP ?? 0.3);
  const [explored, setExplored] = useState(savedState?.explored ?? false);

  const bars = useMemo(() => {
    return Array.from({ length: n + 1 }, (_, k) => ({
      k,
      prob: binomialPmf(n, p, k),
    }));
  }, [n, p]);

  const maxProb = Math.max(...bars.map((bar) => bar.prob), 0.001);
  const mean = binomialMean(n, p);
  const sd = binomialStdDev(n, p);

  function updateN(value) {
    if (reviewMode) return;
    setN(value);
    setExplored(true);
    onSaveProgress?.({ n: value, p, explored: true });
  }

  function updateP(value) {
    if (reviewMode) return;
    setP(value);
    setExplored(true);
    onSaveProgress?.({ n, p: value, explored: true });
  }

  function handleCheck() {
    onComplete({ n, p, explored: true, mean, sd }, step.feedback?.ready ?? null);
  }

  const skewLabel = p < 0.5 ? "skewed right" : p > 0.5 ? "skewed left" : "symmetric";

  return (
    <div className="step binomial-explore-step">
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="binomial-controls">
        <label>
          n = {n}
          <input type="range" min={4} max={20} step={1} value={n} onChange={(e) => updateN(Number(e.target.value))} disabled={reviewMode} />
        </label>
        <label>
          p = {p.toFixed(2)}
          <input type="range" min={0.05} max={0.95} step={0.05} value={p} onChange={(e) => updateP(Number(e.target.value))} disabled={reviewMode} />
        </label>
      </div>

      <div className="binomial-chart">
        {bars.map((bar) => (
          <div key={bar.k} className="binomial-bar-wrap">
            <div
              className="binomial-bar"
              style={{ height: `${(bar.prob / maxProb) * 100}%` }}
              title={`P(X=${bar.k})=${(bar.prob * 100).toFixed(1)}%`}
            />
            <span className="binomial-bar-label">{bar.k}</span>
          </div>
        ))}
      </div>

      <div className="live-stats three-stats">
        <div className="stat">
          <span className="stat-label">Mean μ = np</span>
          <span className="stat-value">{mean.toFixed(2)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">SD σ</span>
          <span className="stat-value">{sd.toFixed(2)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Shape</span>
          <span className="stat-value stat-value-text">{skewLabel}</span>
        </div>
      </div>

      {explored && (
        <button type="button" className="btn btn-primary" onClick={reviewMode ? () => {} : handleCheck}>
          Continue
        </button>
      )}
    </div>
  );
}
