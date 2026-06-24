import { useState } from "react";
import { formatRichText } from "../../lib/formatRichText";
import ProblemHints from "../ProblemHints";

const WIDTH = 380;
const ROOT_X = 24;
const BRANCH_X = 150;
const LEAF_X = 250;
const LEAF_GAP = 54;
const PAD_Y = 32;

function TreeFigure({ tree }) {
  const branches = tree?.branches || [];

  const leafNodes = [];
  const branchLayout = [];
  let leafIndex = 0;
  for (const branch of branches) {
    const ys = [];
    for (const leaf of branch.leaves || []) {
      const y = PAD_Y + leafIndex * LEAF_GAP;
      ys.push(y);
      leafNodes.push({ branch, leaf, y, branchY: 0 });
      leafIndex += 1;
    }
    const branchY = ys.reduce((sum, v) => sum + v, 0) / (ys.length || 1);
    branchLayout.push({ branch, y: branchY });
    for (const node of leafNodes) {
      if (node.branch === branch) node.branchY = branchY;
    }
  }

  const height = PAD_Y * 2 + Math.max(0, leafIndex - 1) * LEAF_GAP;
  const rootY = height / 2;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="prob-tree"
      role="img"
      aria-label="Probability tree diagram"
    >
      {branchLayout.map(({ branch, y }) => (
        <line
          key={`edge-root-${branch.id}`}
          x1={ROOT_X + 8}
          y1={rootY}
          x2={BRANCH_X - 8}
          y2={y}
          className="prob-tree-edge"
        />
      ))}
      {leafNodes.map(({ branchY, y }, index) => (
        <line
          key={`edge-leaf-${index}`}
          x1={BRANCH_X + 8}
          y1={branchY}
          x2={LEAF_X - 8}
          y2={y}
          className="prob-tree-edge"
        />
      ))}

      {branchLayout.map(({ branch, y }) => (
        <text
          key={`p-root-${branch.id}`}
          x={(ROOT_X + BRANCH_X) / 2}
          y={(rootY + y) / 2 - 4}
          className="prob-tree-prob"
          textAnchor="middle"
        >
          {branch.p}
        </text>
      ))}
      {leafNodes.map(({ leaf, y, branchY }, index) => (
        <text
          key={`p-leaf-${index}`}
          x={(BRANCH_X + LEAF_X) / 2}
          y={(branchY + y) / 2 - 4}
          className="prob-tree-prob"
          textAnchor="middle"
        >
          {leaf.p}
        </text>
      ))}

      <circle cx={ROOT_X} cy={rootY} r={7} className="prob-tree-node" />
      {tree?.rootLabel && (
        <text x={ROOT_X} y={rootY - 12} className="prob-tree-label" textAnchor="middle">
          {tree.rootLabel}
        </text>
      )}

      {branchLayout.map(({ branch, y }) => (
        <g key={`node-${branch.id}`}>
          <circle cx={BRANCH_X} cy={y} r={7} className="prob-tree-node" />
          <text x={BRANCH_X} y={y - 12} className="prob-tree-label" textAnchor="middle">
            {branch.label}
          </text>
        </g>
      ))}

      {leafNodes.map(({ branch, leaf, y }, index) => {
        const joint = leaf.joint ?? null;
        return (
          <g key={`leaf-${index}`}>
            <circle
              cx={LEAF_X}
              cy={y}
              r={7}
              className={`prob-tree-node ${leaf.highlight ? "prob-tree-node-active" : ""}`}
            />
            <text x={LEAF_X + 14} y={y - 2} className="prob-tree-leaf-label">
              {leaf.label}
            </text>
            {joint != null && (
              <text
                x={LEAF_X + 14}
                y={y + 13}
                className={`prob-tree-joint ${leaf.highlight ? "prob-tree-joint-active" : ""}`}
              >
                {branch.p} × {leaf.p} = {joint}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function ProbabilityTreeStep({
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

  const hints = step.hints || [];
  const options = step.options || [];
  const showHints = submitted && result && !result.correct;
  const selected = options.find((option) => option.id === selectedId);

  function openHint() {
    if (reviewMode || hintLevel >= hints.length) return;
    const next = hintLevel + 1;
    setHintLevel(next);
    onSaveProgress?.({ selectedId, hintLevel: next, result, submitted });
  }

  function checkAnswer() {
    if (!selected) return;
    setSubmitted(true);
    const correct = Boolean(selected.correct);
    const message = correct ? null : step.feedback?.wrong || "Try again.";
    setResult({ correct, message });
    const state = { selectedId, result: { correct, message }, hintLevel, submitted: true };
    if (correct) onComplete(state, null);
    else onSaveProgress?.(state);
  }

  return (
    <div className="step prob-tree-step">
      {step.context && (
        <div className="problem-context">{formatRichText(step.context)}</div>
      )}
      <p className="step-prompt">{formatRichText(step.prompt)}</p>

      <div className="prob-tree-wrap">
        <TreeFigure tree={step.tree} />
      </div>

      <div className="tap-choice-grid">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`tap-choice ${selectedId === option.id ? "tap-choice-selected" : ""}`}
            onClick={() => {
              if (reviewMode) return;
              setSelectedId(option.id);
              setResult(null);
              setSubmitted(false);
            }}
            disabled={reviewMode}
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

      <div className="step-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={reviewMode ? () => {} : checkAnswer}
          disabled={reviewMode || !selectedId}
        >
          Check
        </button>
      </div>
    </div>
  );
}
