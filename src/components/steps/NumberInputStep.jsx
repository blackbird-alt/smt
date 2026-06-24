import { useEffect, useMemo, useRef, useState } from "react";
import { gradeNumberInput, inferDecimalPlaces } from "../../lib/grading";
import { debounce } from "../../lib/debounce";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

export default function NumberInputStep({
  step,
  savedState,
  reviewMode,
  onComplete,
  onSaveProgress,
}) {
  const [value, setValue] = useState(savedState?.value ?? "");
  const [result, setResult] = useState(savedState?.result || null);
  const [hintLevel, setHintLevel] = useState(savedState?.hintLevel ?? 0);
  const [submitted, setSubmitted] = useState(Boolean(savedState?.submitted));
  const skipSaveRef = useRef(true);

  const hints = step.hints ?? [];
  const tolerance = step.tolerance ?? 0.05;
  const decimalPlaces = step.decimalPlaces ?? inferDecimalPlaces(step.correct);
  const integer = step.integer ?? (decimalPlaces == null && Number.isInteger(step.correct));
  const showHints = submitted && result && !result.correct;

  const roundingLabel = integer
    ? "Enter a whole number."
    : decimalPlaces != null
      ? `Round to ${decimalPlaces} decimal place${decimalPlaces === 1 ? "" : "s"}.`
      : null;

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
    debouncedSave({ value, hintLevel, result, submitted, hintsOpened: range(hintLevel) });
  }, [value, hintLevel, result, submitted, reviewMode, onSaveProgress, debouncedSave]);

  function openHint() {
    if (reviewMode || hintLevel >= hints.length) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    onSaveProgress?.({
      value,
      hintLevel: next,
      result,
      submitted,
      hintsOpened: range(next),
    });
  }

  function checkAnswer() {
    setSubmitted(true);
    const { correct } = gradeNumberInput(value, step.correct, {
      tolerance,
      decimalPlaces: integer ? null : decimalPlaces,
      integer,
    });
    const message = correct ? null : step.feedback?.wrong || "Try again.";
    setResult({ correct, message });

    const state = {
      value,
      result: { correct, message },
      hintLevel,
      submitted: true,
      hintsOpened: range(hintLevel),
    };

    if (correct) {
      onComplete(state, null);
    } else {
      onSaveProgress?.(state);
    }
  }

  return (
    <div className="step number-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      {roundingLabel && <p className="step-hint number-rounding-hint">{roundingLabel}</p>}

      {step.dataTable && (
        <div className="data-table">
          {step.dataTable.map((row) => (
            <div key={row.label} className="data-table-row">
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      )}

      <div className="number-input-row">
        {step.unit && <span className="input-prefix">{step.unit}</span>}
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          onChange={(event) => {
            if (reviewMode) return;
            setValue(event.target.value);
            setResult(null);
            setSubmitted(false);
          }}
          className="number-input"
          placeholder={step.placeholder || "Enter answer"}
          aria-label={step.inputLabel || "Numeric answer"}
          readOnly={reviewMode}
        />
        {step.unitSuffix && <span className="input-suffix">{step.unitSuffix}</span>}
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

      <div className="step-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={reviewMode ? () => {} : checkAnswer}
          disabled={reviewMode || value === ""}
        >
          Check
        </button>
      </div>
    </div>
  );
}

function range(n) {
  return Array.from({ length: n }, (_, index) => index + 1);
}
