import { useEffect, useMemo, useRef, useState } from "react";
import { debounce } from "../../lib/debounce";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

const BATCH_SIZES = [1, 10, 100];

function normalizeUsedBatches(saved) {
  return new Set((saved || []).map(Number));
}

function hasAllBatches(usedBatches) {
  return BATCH_SIZES.every((size) => usedBatches.has(size));
}

function flipPair() {
  const first = Math.random() < 0.5 ? "H" : "T";
  const second = Math.random() < 0.5 ? "H" : "T";
  return `${first}${second}`;
}

export default function CoinFlipExploreStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const trackId = step.trackId || "ht";
  const [flips, setFlips] = useState(savedState?.flips || []);
  const [counts, setCounts] = useState(
    savedState?.counts || { HH: 0, HT: 0, TH: 0, TT: 0 },
  );
  const [lastFlip, setLastFlip] = useState(savedState?.lastFlip || "HH");
  const [animating, setAnimating] = useState(false);
  const [usedBatches, setUsedBatches] = useState(() =>
    normalizeUsedBatches(savedState?.usedBatches),
  );
  const [answerId, setAnswerId] = useState(savedState?.answerId ?? null);
  const [result, setResult] = useState(savedState?.result || null);
  const [hintLevel, setHintLevel] = useState(savedState?.hintLevel ?? 0);
  const [submitted, setSubmitted] = useState(Boolean(savedState?.submitted));
  const skipSaveRef = useRef(true);

  const isGraded = Boolean(step.options?.length);
  const minFlips = step.minFlips ?? 8;
  const canAnswer = flips.length >= minFlips;
  const hints = step.hints || [];
  const showHints = submitted && result && !result.correct;
  const ready = isGraded ? canAnswer : hasAllBatches(usedBatches);
  const trackedCount = counts[trackId.toUpperCase()] ?? 0;
  const trackedRate = flips.length === 0 ? null : trackedCount / flips.length;

  const debouncedSave = useMemo(
    () =>
      debounce((state) => {
        onSaveProgress?.(state);
      }, 400),
    [onSaveProgress],
  );

  useEffect(() => {
    if (reviewMode || !onSaveProgress) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    debouncedSave({ flips, counts, lastFlip, usedBatches: [...usedBatches] });
  }, [flips, counts, lastFlip, usedBatches, reviewMode, onSaveProgress, debouncedSave]);

  function flipBatch(count) {
    if (animating) return;
    setAnimating(true);
    setUsedBatches((current) => new Set([...current, count]));

    let ticks = 0;
    const interval = setInterval(() => {
      setLastFlip(flipPair());
      ticks += 1;
      if (ticks >= 6) {
        clearInterval(interval);
        const batch = Array.from({ length: count }, () => flipPair());
        const nextCounts = { ...counts };
        batch.forEach((pair) => {
          nextCounts[pair] = (nextCounts[pair] || 0) + 1;
        });
        setLastFlip(batch[batch.length - 1]);
        setFlips((current) => [...current, ...batch]);
        setCounts(nextCounts);
        setAnimating(false);
      }
    }, 50);
  }

  function handleCheck() {
    if (isGraded) {
      if (!answerId) return;
      setSubmitted(true);
      const selected = step.options.find((option) => option.id === answerId);
      const correct = Boolean(selected?.correct);
      const message = correct ? null : step.feedback?.wrong || "Try again.";
      setResult({ correct, message });
      const state = {
        flips,
        counts,
        answerId,
        result: { correct, message },
        hintLevel,
        submitted: true,
      };
      if (correct) onComplete(state, null);
      else onSaveProgress?.(state);
      return;
    }

    onComplete(
      { flips, counts, lastFlip, usedBatches: [...usedBatches] },
      step.feedback.ready,
    );
  }

  function openHint() {
    if (reviewMode || hintLevel >= hints.length) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    onSaveProgress?.({ flips, counts, answerId, hintLevel: next, result, submitted });
  }

  const trackLabel = step.trackLabel || "H then T";

  return (
    <div className="step coin-flip-step">
      <p className="step-prompt">{formatRichText(step.prompt)}</p>
      {trackLabel && (
        <p className="event-label">Tracking: <strong>{trackLabel}</strong></p>
      )}

      <div className="coin-stage">
        <div className={`coin ${animating ? "coin-flipping" : ""}`}>
          {lastFlip[0]}
        </div>
        <div className={`coin ${animating ? "coin-flipping" : ""}`}>
          {lastFlip[1]}
        </div>
      </div>

      <div className="coin-counts">
        {["HH", "HT", "TH", "TT"].map((key) => (
          <div
            key={key}
            className={`coin-count ${key === trackId.toUpperCase() ? "coin-count-tracked" : ""}`}
          >
            <span className="stat-label">{key}</span>
            <span className="stat-value">{counts[key] || 0}</span>
          </div>
        ))}
      </div>

      <div className="dice-stats">
        <div className="stat">
          <span className="stat-label">Pairs flipped</span>
          <span className="stat-value">{flips.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">{trackId.toUpperCase()} rate</span>
          <span className="stat-value">
            {trackedRate === null ? "—" : `${(trackedRate * 100).toFixed(0)}%`}
          </span>
        </div>
      </div>

      <div className="step-actions roll-batch-actions">
        {BATCH_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            className={`btn btn-secondary ${usedBatches.has(size) ? "btn-used" : ""}`}
            onClick={() => flipBatch(size)}
            disabled={animating}
          >
            Flip {size === 1 ? "once" : `${size}×`}{usedBatches.has(size) ? " ✓" : ""}
          </button>
        ))}
      </div>

      {!reviewMode && !isGraded && !ready && (
        <p className="step-hint">Flip pairs of coins. Each ordered outcome should land near 25%.</p>
      )}

      {isGraded && (
        <>
          <p className="step-hint">
            {canAnswer
              ? "Now pick the theoretical probability."
              : `Flip at least ${minFlips} pairs before answering.`}
          </p>
          <div className="tap-choice-grid">
            {step.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`tap-choice ${answerId === option.id ? "tap-choice-selected" : ""}`}
                onClick={() => {
                  if (reviewMode || !canAnswer) return;
                  setAnswerId(option.id);
                  setResult(null);
                  setSubmitted(false);
                }}
                disabled={reviewMode || !canAnswer}
              >
                <span className="tap-choice-label">{option.label}</span>
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
        </>
      )}

      {ready && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={reviewMode ? () => {} : handleCheck}
          disabled={isGraded && !answerId}
        >
          {isGraded ? "Check" : "Continue"}
        </button>
      )}
    </div>
  );
}
