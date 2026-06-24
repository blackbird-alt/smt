import { formatRichText } from "../lib/formatRichText";

export default function SolutionPanel({ solution, xpEarned, onContinue, finishLabel }) {
  if (!solution) return null;

  return (
    <div className="solution-panel" role="dialog" aria-label="Solution">
      <p className="solution-heading">Solution</p>
      <div className="solution-body">{formatRichText(solution.body)}</div>
      {solution.takeaway && (
        <p className="solution-takeaway">
          <strong>Takeaway:</strong> {formatRichText(solution.takeaway)}
        </p>
      )}
      {xpEarned > 0 && (
        <p className="solution-xp">+{xpEarned} XP</p>
      )}
      <button type="button" className="btn btn-primary" onClick={onContinue}>
        {finishLabel}
      </button>
    </div>
  );
}
