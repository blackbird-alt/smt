import { useMemo, useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

function buildRegions(setA, setB, universe) {
  const a = new Set(setA.outcomes);
  const b = new Set(setB.outcomes);
  const aOnly = universe.filter((face) => a.has(face) && !b.has(face));
  const bOnly = universe.filter((face) => b.has(face) && !a.has(face));
  const both = universe.filter((face) => a.has(face) && b.has(face));
  const union = universe.filter((face) => a.has(face) || b.has(face));
  const givenB = universe.filter((face) => b.has(face));

  return { aOnly, bOnly, both, union, givenB };
}

export default function VennTapStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const universe = useMemo(() => step.faces || [1, 2, 3, 4, 5, 6], [step.faces]);
  const regions = useMemo(
    () => buildRegions(step.setA, step.setB, universe),
    [step.setA, step.setB, universe],
  );

  const [selectedRegion, setSelectedRegion] = useState(savedState?.selectedRegion ?? null);
  const [result, setResult] = useState(savedState?.result || null);
  const [hintLevel, setHintLevel] = useState(savedState?.hintLevel ?? 0);
  const [submitted, setSubmitted] = useState(Boolean(savedState?.submitted));

  const targetRegion = step.targetRegion || "union";
  const activeOutcomes = selectedRegion ? regions[selectedRegion] : [];
  const hints = step.hints || [];
  const showHints = submitted && result && !result.correct;

  const regionButtons = [
    { id: "aOnly", label: `Only ${step.setA.label}`, count: regions.aOnly.length },
    { id: "both", label: `${step.setA.label} ∩ ${step.setB.label}`, count: regions.both.length },
    { id: "bOnly", label: `Only ${step.setB.label}`, count: regions.bOnly.length },
    { id: "union", label: `${step.setA.label} ∪ ${step.setB.label}`, count: regions.union.length },
  ].filter((button) => button.id !== "union" || targetRegion === "union" || targetRegion === "givenB");

  function selectRegion(regionId) {
    if (reviewMode) return;
    setSelectedRegion(regionId);
    setResult(null);
    setSubmitted(false);
    onSaveProgress?.({ selectedRegion: regionId, hintLevel, result: null, submitted: false });
  }

  function openHint() {
    if (reviewMode || hintLevel >= hints.length) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    onSaveProgress?.({ selectedRegion, hintLevel: next, result, submitted });
  }

  function checkAnswer() {
    setSubmitted(true);
    const match = selectedRegion === targetRegion;
    const message = match ? null : step.feedback?.wrong || "Try again.";
    setResult({ correct: match, message });

    const state = {
      selectedRegion,
      highlightedOutcomes: activeOutcomes,
      result: { correct: match, message },
      hintLevel,
      submitted: true,
    };

    if (match) onComplete(state, null);
    else onSaveProgress?.(state);
  }

  const displayOutcomes =
    targetRegion === "givenB" && selectedRegion === "givenB"
      ? regions.givenB
      : activeOutcomes;

  return (
    <div className="step venn-tap-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="venn-legend">
        <span className="venn-tag venn-tag-a">{step.setA.label}: {step.setA.outcomes.join(", ")}</span>
        <span className="venn-tag venn-tag-b">{step.setB.label}: {step.setB.outcomes.join(", ")}</span>
      </div>

      {targetRegion === "givenB" ? (
        <button
          type="button"
          className={`venn-region-btn ${selectedRegion === "givenB" ? "venn-region-selected" : ""}`}
          onClick={() => selectRegion("givenB")}
          disabled={reviewMode}
        >
          Given {step.setB.label} — {regions.givenB.length} outcomes
        </button>
      ) : (
        <div className="venn-region-grid">
          {regionButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              className={`venn-region-btn ${selectedRegion === button.id ? "venn-region-selected" : ""}`}
              onClick={() => selectRegion(button.id)}
              disabled={reviewMode}
            >
              <span>{button.label}</span>
              <span className="venn-region-count">{button.count} face{button.count === 1 ? "" : "s"}</span>
            </button>
          ))}
        </div>
      )}

      <div className="outcome-grid venn-outcome-grid">
        {universe.map((face) => {
          const inA = step.setA.outcomes.includes(face);
          const inB = step.setB.outcomes.includes(face);
          const highlighted = displayOutcomes.includes(face);
          return (
            <div
              key={face}
              className={`venn-outcome ${highlighted ? "venn-outcome-highlight" : ""} ${inA ? "venn-outcome-a" : ""} ${inB ? "venn-outcome-b" : ""}`}
            >
              {face}
            </div>
          );
        })}
      </div>

      {selectedRegion && (
        <p className="venn-count-label">
          {displayOutcomes.length} outcome{displayOutcomes.length === 1 ? "" : "s"} in this region:{" "}
          <strong>{displayOutcomes.join(", ") || "—"}</strong>
        </p>
      )}

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
          disabled={!reviewMode && !selectedRegion}
        >
          Check
        </button>
      </div>
    </div>
  );
}
