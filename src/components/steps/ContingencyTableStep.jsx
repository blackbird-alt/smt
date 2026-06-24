import { useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

function parseFraction(input) {
  if (input == null) return null;
  const text = String(input).trim();
  if (!text) return null;
  if (text.includes("/")) {
    const [rawNum, rawDen, ...rest] = text.split("/");
    if (rest.length > 0) return null;
    const num = Number(rawNum);
    const den = Number(rawDen);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
      return null;
    }
    return num / den;
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function gradeFraction(input, fraction) {
  const parsed = parseFraction(input);
  if (parsed == null) return false;
  const target = fraction.numerator / fraction.denominator;
  const tolerance = fraction.tolerance ?? 0.01;
  return Math.abs(parsed - target) <= tolerance;
}

export default function ContingencyTableStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const [selectedId, setSelectedId] = useState(savedState?.selectedId ?? null);
  const [result, setResult] = useState(savedState?.result || null);
  const [hintLevel, setHintLevel] = useState(savedState?.hintLevel ?? 0);
  const [submitted, setSubmitted] = useState(Boolean(savedState?.submitted));
  const [part1Done, setPart1Done] = useState(Boolean(savedState?.part1Done));

  const [fractionValue, setFractionValue] = useState(savedState?.fractionValue ?? "");
  const [fractionResult, setFractionResult] = useState(savedState?.fractionResult || null);
  const [fractionHintLevel, setFractionHintLevel] = useState(
    savedState?.fractionHintLevel ?? 0,
  );
  const [fractionSubmitted, setFractionSubmitted] = useState(
    Boolean(savedState?.fractionSubmitted),
  );

  const hints = step.hints || [];
  const cells = step.cells || [];
  const rowLabels = step.rowLabels || [];
  const colLabels = step.colLabels || [];
  const fraction = step.fraction || null;
  const fractionHints = fraction?.hints || [];
  const showHints = submitted && result && !result.correct;
  const showFractionHints =
    fractionSubmitted && fractionResult && !fractionResult.correct;
  const selected = cells.find((cell) => cell.id === selectedId);

  const showFractionPart = Boolean(fraction) && (part1Done || reviewMode);
  const lockCells = reviewMode || part1Done;

  function part1State(overrides = {}) {
    return {
      selectedId,
      result,
      hintLevel,
      submitted,
      part1Done,
      fractionValue,
      fractionHintLevel,
      fractionSubmitted,
      fractionResult,
      ...overrides,
    };
  }

  function openHint() {
    if (reviewMode || hintLevel >= hints.length) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    onSaveProgress?.(part1State({ hintLevel: next }));
  }

  function openFractionHint() {
    if (reviewMode || fractionHintLevel >= fractionHints.length) return;
    const next = fractionHintLevel + 1;
    setFractionHintLevel(next);
    onSaveProgress?.(part1State({ fractionHintLevel: next }));
  }

  function checkAnswer() {
    if (!selected) return;
    setSubmitted(true);
    const correct = Boolean(selected.correct);
    const message = correct ? null : step.feedback?.wrong || "Try again.";
    setResult({ correct, message });

    if (!correct) {
      onSaveProgress?.(part1State({ result: { correct, message }, submitted: true }));
      return;
    }

    // Cell is correct. If there's no follow-up fraction, finish here.
    if (!fraction) {
      onComplete(
        { selectedId, result: { correct, message }, hintLevel, submitted: true },
        null,
      );
      return;
    }

    setPart1Done(true);
    onSaveProgress?.(
      part1State({ result: { correct, message }, submitted: true, part1Done: true }),
    );
  }

  function checkFraction() {
    setFractionSubmitted(true);
    const correct = gradeFraction(fractionValue, fraction);
    const message = correct
      ? null
      : fraction.feedback?.wrong ||
        "Not quite — check the numerator and denominator.";
    setFractionResult({ correct, message });

    const state = part1State({
      result: { correct: true },
      submitted: true,
      part1Done: true,
      fractionSubmitted: true,
      fractionResult: { correct, message },
    });

    if (correct) {
      onComplete(state, null);
    } else {
      onSaveProgress?.(state);
    }
  }

  const grid = rowLabels.map((rowLabel, rowIndex) =>
    colLabels.map((colLabel, colIndex) => {
      const id = `${rowIndex}-${colIndex}`;
      return cells.find((cell) => cell.id === id) || { id, count: 0 };
    }),
  );

  return (
    <div className="step contingency-table-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="contingency-table-wrap">
        <table className="contingency-table">
          <thead>
            <tr>
              <th />
              {colLabels.map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, rowIndex) => (
              <tr key={rowLabels[rowIndex]}>
                <th scope="row">{rowLabels[rowIndex]}</th>
                {row.map((cell) => (
                  <td key={cell.id}>
                    <button
                      type="button"
                      className={`contingency-cell ${selectedId === cell.id ? "contingency-cell-selected" : ""}`}
                      onClick={() => {
                        if (lockCells) return;
                        setSelectedId(cell.id);
                        setResult(null);
                        setSubmitted(false);
                      }}
                      disabled={lockCells}
                    >
                      {cell.count}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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

      {!part1Done && !reviewMode && (
        <div className="step-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={checkAnswer}
            disabled={!selectedId}
          >
            Check
          </button>
        </div>
      )}

      {showFractionPart && (
        <div className="contingency-fraction-part">
          {part1Done && !reviewMode && (
            <div className="feedback feedback-correct" role="status">
              Right cell. Now finish the calculation below.
            </div>
          )}

          <p className="step-prompt">{formatRichText(fraction.prompt)}</p>

          <div className="number-input-row">
            <input
              type="text"
              inputMode="text"
              value={fractionValue}
              onChange={(event) => {
                if (reviewMode) return;
                setFractionValue(event.target.value);
                setFractionResult(null);
                setFractionSubmitted(false);
              }}
              className="number-input"
              placeholder={fraction.placeholder || "a/b"}
              aria-label="Probability as a fraction"
              readOnly={reviewMode}
            />
          </div>

          {fractionResult && !fractionResult.correct && fractionSubmitted && !reviewMode && (
            <div className="feedback feedback-wrong" role="status">
              {formatRichText(fractionResult.message)}
            </div>
          )}

          <ProblemHints
            hints={fractionHints}
            hintLevel={fractionHintLevel}
            showHints={showFractionHints}
            reviewMode={reviewMode}
            onOpenHint={openFractionHint}
          />

          {!reviewMode && (
            <div className="step-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={checkFraction}
                disabled={fractionValue.trim() === ""}
              >
                Check
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
