import { useMemo, useState } from "react";
import { formatRichText } from "../../lib/formatRichText";

function theoreticalBothRed(red, blue, withReplacement) {
  const total = red + blue;
  if (withReplacement) {
    return (red / total) ** 2;
  }
  return (red / total) * ((red - 1) / (total - 1));
}

export default function BagSimulatorStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const red = step.red ?? 5;
  const blue = step.blue ?? 3;
  const [withReplacement, setWithReplacement] = useState(
    savedState?.withReplacement ?? step.withReplacement ?? false,
  );
  const [draws, setDraws] = useState(savedState?.draws || []);
  const [hits, setHits] = useState(savedState?.hits ?? 0);
  const [explored, setExplored] = useState(savedState?.explored ?? false);

  const theoretical = useMemo(
    () => theoreticalBothRed(red, blue, withReplacement),
    [red, blue, withReplacement],
  );
  const empirical = draws.length === 0 ? null : hits / draws.length;

  function drawBatch(count) {
    if (reviewMode) return;
    let bag = Array.from({ length: red }, () => "R").concat(Array.from({ length: blue }, () => "B"));
    const batchHits = [];

    for (let index = 0; index < count; index += 1) {
      const pool = withReplacement
        ? bag
        : [...bag];
      if (!withReplacement && pool.length < 2) break;

      const firstIndex = Math.floor(Math.random() * pool.length);
      const first = pool[firstIndex];
      let second;
      if (withReplacement) {
        second = pool[Math.floor(Math.random() * pool.length)];
      } else {
        pool.splice(firstIndex, 1);
        second = pool[Math.floor(Math.random() * pool.length)];
      }
      batchHits.push(first === "R" && second === "R");
    }

    const newHits = batchHits.filter(Boolean).length;
    setDraws((current) => [...current, ...batchHits]);
    setHits((current) => current + newHits);
    setExplored(true);
    onSaveProgress?.({
      withReplacement,
      draws: [...draws, ...batchHits],
      hits: hits + newHits,
      explored: true,
    });
  }

  function toggleReplacement() {
    if (reviewMode) return;
    setWithReplacement((current) => !current);
    setDraws([]);
    setHits(0);
    setExplored(false);
  }

  function handleCheck() {
    onComplete(
      { withReplacement, draws, hits, explored: true, theoretical, empirical },
      step.feedback?.ready ?? null,
    );
  }

  return (
    <div className="step bag-simulator-step">
      <p className="step-prompt">{formatRichText(step.prompt)}</p>
      <p className="event-label">
        Bag: <strong>{red} red</strong>, <strong>{blue} blue</strong> ·{" "}
        {withReplacement ? "with replacement" : "without replacement"}
      </p>

      <div className="bag-visual">
        {Array.from({ length: red }).map((_, index) => (
          <span key={`r-${index}`} className="marble marble-red" />
        ))}
        {Array.from({ length: blue }).map((_, index) => (
          <span key={`b-${index}`} className="marble marble-blue" />
        ))}
      </div>

      <div className="dice-stats three-stats">
        <div className="stat">
          <span className="stat-label">Pairs drawn</span>
          <span className="stat-value">{draws.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Both red hits</span>
          <span className="stat-value">{hits}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Hit rate</span>
          <span className="stat-value">
            {empirical === null ? "—" : `${(empirical * 100).toFixed(1)}%`}
          </span>
        </div>
      </div>

      <p className="step-hint">
        Theoretical P(both red) = <strong>{(theoretical * 100).toFixed(1)}%</strong>
        {empirical !== null && draws.length >= 10 && (
          <> · Your rate should drift toward this.</>
        )}
      </p>

      <div className="step-actions roll-batch-actions">
        <button type="button" className="btn btn-secondary" onClick={() => drawBatch(10)} disabled={reviewMode}>
          Draw 10 pairs
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => drawBatch(100)} disabled={reviewMode}>
          Draw 100 pairs
        </button>
        <button type="button" className="btn btn-secondary" onClick={toggleReplacement} disabled={reviewMode}>
          {withReplacement ? "Switch: no replacement" : "Switch: with replacement"}
        </button>
      </div>

      {explored && draws.length >= 10 && (
        <button type="button" className="btn btn-primary" onClick={reviewMode ? () => {} : handleCheck}>
          Continue
        </button>
      )}
    </div>
  );
}
