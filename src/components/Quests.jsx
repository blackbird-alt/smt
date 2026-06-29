import { useState } from "react";
import { computeDailyQuests } from "../lib/quests";
import Confetti from "./Confetti";
import Icon from "./Icon";

// Dashboard card: today's quests. Each shows how to complete it and the XP it
// grants; finishing one unlocks a "Claim" button (one-time reward, tracked on
// the profile so it can't be farmed). The "Why this helps" toggle keeps the
// gamification doubling as a tiny explanation of the learning science.
export default function Quests({ profile, onClaim }) {
  const quests = computeDailyQuests(profile);
  const done = quests.filter((q) => q.done).length;
  const allClaimed = quests.every((q) => q.claimed);
  const [openId, setOpenId] = useState(null);
  const [claiming, setClaiming] = useState(null);
  const [confettiId, setConfettiId] = useState(0);

  async function handleClaim(quest) {
    if (claiming || !onClaim) return;
    setClaiming(quest.id);
    setConfettiId(Date.now());
    try {
      await onClaim(quest.id, quest.reward);
    } finally {
      setClaiming(null);
    }
  }

  return (
    <section className={`quests-card ${allClaimed ? "quests-card-complete" : ""}`}>
      {confettiId > 0 && <Confetti key={confettiId} />}
      <div className="quests-head">
        <h3 className="quests-title">
          <Icon name="target" size={18} /> Daily quests
        </h3>
        <span className="quests-count">
          {done}/{quests.length}
        </span>
      </div>

      <ul className="quests-list">
        {quests.map((q) => {
          const open = openId === q.id;
          const isClaiming = claiming === q.id;
          return (
            <li key={q.id} className={`quest-row ${q.done ? "quest-row-done" : ""}`}>
              <span className={`quest-icon ${q.done ? "quest-icon-done" : ""}`}>
                {q.done ? <Icon name="check" size={16} /> : <Icon name={q.icon} size={16} />}
              </span>
              <div className="quest-body">
                <div className="quest-row-top">
                  <strong className="quest-name">{q.title}</strong>
                  <span className={`quest-reward ${q.claimed ? "quest-reward-claimed" : ""}`}>
                    <Icon name="zap" size={12} /> +{q.reward}
                  </span>
                </div>
                <p className="quest-how">{q.how}</p>
                <div className="quest-progress-row">
                  <span className="quest-track" aria-hidden="true">
                    <span className="quest-fill" style={{ width: `${q.percent}%` }} />
                  </span>
                  <span className="quest-label">{q.label}</span>
                </div>

                {q.claimable && (
                  <button
                    type="button"
                    className="btn btn-primary quest-claim-btn"
                    onClick={() => handleClaim(q)}
                    disabled={isClaiming}
                  >
                    <Icon name="sparkles" size={15} />
                    {isClaiming ? "Claiming…" : `Claim +${q.reward} XP`}
                  </button>
                )}
                {q.claimed && (
                  <span className="quest-claimed-tag">
                    <Icon name="check" size={14} /> Reward claimed
                  </span>
                )}

                {q.why && (
                  <>
                    <button
                      type="button"
                      className="quest-why-toggle"
                      onClick={() => setOpenId(open ? null : q.id)}
                      aria-expanded={open}
                    >
                      {open ? "Hide why this helps" : "Why this helps"}
                    </button>
                    {open && <p className="quest-why">{q.why}</p>}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {allClaimed && (
        <p className="quests-done-msg">
          All quests cleared and claimed — see you tomorrow to keep the habit going.
        </p>
      )}
    </section>
  );
}
