import { computeAchievements } from "../lib/achievements";
import Mascot from "./Mascot";
import Icon from "./Icon";

// Trophy case: every badge, earned or still locked. Locked badges stay visible
// (greyed) so they read as goals — and the science-backed ones explain why the
// habit they reward actually works.
export default function Achievements({ profile, lessonProgress, onBack }) {
  const { badges, earnedCount, total } = computeAchievements(profile, lessonProgress);

  return (
    <div className="screen achievements-screen">
      <header className="achievements-header">
        <button type="button" className="btn-text btn-icon-text" onClick={onBack}>
          <Icon name="arrow-left" size={16} /> Course
        </button>
        <div className="achievements-hero">
          <Mascot mood={earnedCount > 0 ? "happy" : "idle"} size={72} />
          <div>
            <h1 className="achievements-title">Trophy case</h1>
            <p className="achievements-sub">
              {earnedCount} of {total} badges earned
            </p>
          </div>
        </div>
        <div className="achievements-progress" aria-hidden="true">
          <span
            className="achievements-progress-fill"
            style={{ width: `${Math.round((earnedCount / total) * 100)}%` }}
          />
        </div>
      </header>

      <ul className="badge-grid">
        {badges.map((b) => (
          <li
            key={b.id}
            className={`badge-card ${b.earned ? "badge-card-earned" : "badge-card-locked"}`}
          >
            <span className="badge-icon" aria-hidden="true">
              {b.earned ? b.icon : <Icon name="lock" size={20} />}
            </span>
            <strong className="badge-name">{b.name}</strong>
            <span className="badge-desc">{b.desc}</span>
            {b.why && <span className="badge-why">{b.why}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
