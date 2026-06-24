import { useState } from "react";

const COPY = {
  halfway: {
    title: "You've hit the halfway point!",
    subtitle:
      "To unlock the second half of this chapter, please complete a small one-time payment.",
    perks: [
      "Unlimited access to the rest of this chapter",
      "The other 50% of the content you were already doing",
      "A profound sense of having spent a million dollars",
    ],
    declineLabel: "Continue without paying",
  },
  premium: {
    title: "This is a Premium chapter",
    subtitle:
      "Chapters 7–10 are part of Brillyant Premium™. Unlock this chapter with a small one-time payment.",
    perks: [
      "Full access to this premium chapter",
      "Bragging rights at your next dinner party",
      "A profound sense of having spent a million dollars",
    ],
    declineLabel: "No thanks, I'll keep my million",
  },
};

export default function JokePaywall({ onClose, variant = "halfway" }) {
  const [status, setStatus] = useState("idle");
  const copy = COPY[variant] || COPY.halfway;

  function handlePay() {
    setStatus("processing");
    setTimeout(() => setStatus("declined"), 1800);
  }

  return (
    <div
      className="paywall-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <div className="paywall-card">
        <button
          type="button"
          className="paywall-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <p className="paywall-badge">Brillyant Premium™</p>
        <h2 id="paywall-title" className="paywall-title">
          {copy.title}
        </h2>
        <p className="paywall-subtitle">{copy.subtitle}</p>

        <div className="paywall-price">
          <span className="paywall-currency">$</span>
          <span className="paywall-amount">1,000,000</span>
          <span className="paywall-period">/ chapter</span>
        </div>

        <ul className="paywall-perks">
          {copy.perks.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>

        {status === "declined" && (
          <p className="paywall-error" role="alert">
            Card declined. (Shocking, we know.) You can keep learning for free.
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary paywall-pay"
          onClick={handlePay}
          disabled={status === "processing"}
        >
          {status === "processing"
            ? "Charging your card…"
            : "Pay $1,000,000"}
        </button>

        <button type="button" className="paywall-decline" onClick={onClose}>
          {copy.declineLabel || "No thanks, I'll keep my million"}
        </button>
      </div>
    </div>
  );
}
