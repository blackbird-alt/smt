import { formatRichText } from "../../lib/formatRichText";

export default function IntroStep({ step, onContinue }) {
  const definitions = step.definitions || [];

  return (
    <div className="step intro-step">
      <div className="step-body">
        {step.body.split("\n\n").map((paragraph, index) => (
          <p key={index}>{formatRichText(paragraph)}</p>
        ))}
      </div>

      {definitions.length > 0 && (
        <section className="intro-definitions">
          <h3 className="intro-definitions-title">Key terms</h3>
          <dl className="definition-list">
            {definitions.map((entry, index) => (
              <div key={index} className="definition-item">
                <dt className="definition-term">{formatRichText(entry.term)}</dt>
                <dd className="definition-text">
                  {formatRichText(entry.definition)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <button type="button" className="btn btn-primary" onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
