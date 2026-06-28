import { useState } from "react";
import { computeDailyQuests } from "../lib/quests";
import Icon from "./Icon";

// Dashboard card: today's quests. Tapping a quest reveals the learning-science
// reason it exists, so the gamification doubles as a tiny explanation of why the
// habit works. Resets each day (counters live on the profile).
export default function Quests({ profile }) {
  const quests = computeDailyQuests(profile);
  const done = quests.filter((q) => q.done).length;
  const allDone = done === quests.length;
  const [openId, setOpenId] = useState(null);

  return (
    <section className={`quests-card ${allDone ? "quests-card-complete" : ""}`}>
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
          return (
            <li key={q.id} className={`quest-row ${q.done ? "quest-row-done" : ""}`}>
              <span className={`quest-icon ${q.done ? "quest-icon-done" : ""}`}>
                {q.done ? <Icon name="check" size={16} /> : <Icon name={q.icon} size={16} />}
              </span>
              <div className="quest-body">
                <div className="quest-row-top">
                  <strong className="quest-name">{q.title}</strong>
                  <span className="quest-label">{q.label}</span>
                </div>
                <span className="quest-track" aria-hidden="true">
                  <span className="quest-fill" style={{ width: `${q.percent}%` }} />
                </span>
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

      {allDone && (
        <p className="quests-done-msg">
          All quests cleared — see you tomorrow to keep the habit going.
        </p>
      )}
    </section>
  );
}
