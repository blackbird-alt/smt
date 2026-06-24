import { formatRichText } from "../lib/formatRichText";

export default function ProblemHints({ hints, hintLevel, showHints, reviewMode, onOpenHint }) {
  if (!hints?.length || !showHints) return null;

  const canShowMore = hintLevel < hints.length;

  return (
    <div className="problem-hints">
      {hints.slice(0, hintLevel).map((hint, index) => (
        <div key={index} className="scaffold-hint" role="note">
          {formatRichText(hint)}
        </div>
      ))}
      {canShowMore && !reviewMode && (
        <button type="button" className="btn btn-secondary" onClick={onOpenHint}>
          Need help?
        </button>
      )}
    </div>
  );
}
