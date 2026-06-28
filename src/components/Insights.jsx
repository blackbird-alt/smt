import { computeAllMastery } from "../lib/mastery";
import Icon from "./Icon";
import ThemeToggle from "./ThemeToggle";

// "Chapter 3 — Elementary Probability" -> "Elementary Probability"
function shortTitle(title) {
  const dash = title.indexOf("—");
  return dash >= 0 ? title.slice(dash + 1).trim() : title;
}

export default function Insights({
  profile,
  lessonProgress,
  onBack,
  onReviewChapter,
}) {
  const mastery = computeAllMastery(lessonProgress, profile);
  const completed = mastery.filter((m) => m.status !== "incomplete");
  const toMaster = completed.filter((m) => m.status === "review");

  const reviewCorrect = profile?.reviewCorrect || 0;
  const reviewAttempts = profile?.reviewAttempts || 0;
  const reviewAccuracy =
    reviewAttempts > 0
      ? `${Math.round((100 * reviewCorrect) / reviewAttempts)}%`
      : "—";

  const outstanding = profile?.mistakes
    ? Object.keys(profile.mistakes).length
    : 0;

  const xp = profile?.xp || 0;
  const streak = profile?.streak || 0;
  // Same lightweight leveling used elsewhere: a level every 100 XP.
  const level = Math.floor(xp / 100) + 1;

  return (
    <div className="screen insights-screen">
      <header className="profile-header">
        <div className="profile-header-top">
          <button
            type="button"
            className="btn-text btn-icon-text"
            onClick={onBack}
          >
            <Icon name="arrow-left" size={16} /> Course
          </button>
          <ThemeToggle />
        </div>
        <h1>Your progress</h1>
        <p className="insights-intro">
          See how well your reviews are sticking — and which chapters are worth a
          second pass.
        </p>
      </header>

      <section className="insights-stats">
        <div className="insights-stat">
          <span className="insights-stat-label">Review accuracy</span>
          <span className="insights-stat-value">{reviewAccuracy}</span>
          <span className="insights-stat-hint">
            {reviewAttempts > 0
              ? `${reviewCorrect}/${reviewAttempts} correct`
              : "No reviews yet"}
          </span>
        </div>
        <div className="insights-stat">
          <span className="insights-stat-label">To review</span>
          <span className="insights-stat-value">{outstanding}</span>
          <span className="insights-stat-hint">tricky problems</span>
        </div>
        <div className="insights-stat">
          <span className="insights-stat-label">Streak</span>
          <span className="insights-stat-value">{streak}</span>
          <span className="insights-stat-hint">day{streak === 1 ? "" : "s"}</span>
        </div>
        <div className="insights-stat">
          <span className="insights-stat-label">Level</span>
          <span className="insights-stat-value">{level}</span>
          <span className="insights-stat-hint">{xp} XP</span>
        </div>
      </section>

      <section className="profile-card">
        <h2>Chapter mastery</h2>
        {completed.length === 0 ? (
          <p className="profile-help">
            Finish a chapter to start tracking your mastery here.
          </p>
        ) : (
          <ul className="mastery-list">
            {completed.map((m) => (
              <li key={m.lessonId} className="mastery-row">
                <div className="mastery-row-head">
                  <span className="mastery-title">{shortTitle(m.title)}</span>
                  <span
                    className={`mastery-chip mastery-chip-${m.status}`}
                  >
                    {m.status === "mastered" ? "Mastered" : "Keep reviewing"}
                  </span>
                </div>
                <div className="mastery-bar-row">
                  <span className="mastery-bar-track">
                    <span
                      className={`mastery-bar-fill mastery-bar-fill-${m.status}`}
                      style={{ width: `${m.masteryPercent}%` }}
                    />
                  </span>
                  <span className="mastery-percent">{m.masteryPercent}%</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toMaster.length > 0 && (
        <section className="profile-card">
          <h2>Review to master</h2>
          <p className="profile-help">
            You finished these chapters but a few problems tripped you up. A
            quick review locks them in.
          </p>
          <ul className="review-master-list">
            {toMaster.map((m) => (
              <li key={m.lessonId} className="review-master-row">
                <div className="review-master-info">
                  <span className="review-master-title">
                    {shortTitle(m.title)}
                  </span>
                  <span className="review-master-sub">
                    {m.masteryPercent}% mastery
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-icon-text"
                  onClick={() => onReviewChapter(m.lessonId)}
                >
                  <Icon name="refresh" size={16} /> Review
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
