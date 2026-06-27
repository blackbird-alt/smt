import { useEffect, useRef, useState } from "react";
import course from "../content/course.json";
import {
  getProfileAvatar,
  getProfileDisplayName,
  getProfilePhotoUrl,
} from "../lib/account";
import { isLessonInProgress } from "../lib/progress";
import { isLessonAvailable } from "../content/lessons";
import LessonProgressBar from "./LessonProgressBar";
import UserAvatar from "./UserAvatar";
import CoursePath from "./CoursePath";
import Icon from "./Icon";
import ThemeToggle from "./ThemeToggle";
import JokePaywall from "./JokePaywall";

// Scattered across the whole viewport; each drifts gently and is pushed away
// from the cursor (see the repel effect below).
const FLOATING_GLYPHS = [
  { c: "Σ", top: "8%", left: "6%", size: "5rem", color: "var(--primary)" },
  { c: "π", top: "13%", left: "86%", size: "4rem", color: "var(--accent)" },
  { c: "μ", top: "29%", left: "16%", size: "3.6rem", color: "var(--aqua)" },
  { c: "σ", top: "24%", left: "70%", size: "4.6rem", color: "var(--primary-2)" },
  { c: "%", top: "44%", left: "4%", size: "3.4rem", color: "var(--joy)" },
  { c: "x̄", top: "50%", left: "90%", size: "4.2rem", color: "var(--accent)" },
  { c: "√", top: "63%", left: "11%", size: "3.8rem", color: "var(--primary)" },
  { c: "∞", top: "69%", left: "80%", size: "4.4rem", color: "var(--aqua)" },
  { c: "÷", top: "82%", left: "8%", size: "3.4rem", color: "var(--primary-2)" },
  { c: "≈", top: "87%", left: "64%", size: "3.6rem", color: "var(--joy)" },
  { c: "∑", top: "39%", left: "45%", size: "3rem", color: "var(--accent)" },
  { c: "±", top: "92%", left: "32%", size: "3.2rem", color: "var(--primary)" },
  { c: "∫", top: "5%", left: "48%", size: "3.4rem", color: "var(--aqua)" },
  { c: "θ", top: "57%", left: "50%", size: "3rem", color: "var(--primary-2)" },
];

export default function CourseHome({
  profile,
  user,
  lessonProgress,
  onStartLesson,
  onOpenProfile,
  onOpenLeaderboard,
  onPracticeMistakes,
  hasMistakes = false,
}) {
  const [premiumOpen, setPremiumOpen] = useState(false);
  const glyphRefs = useRef([]);

  // Push the background glyphs away from the cursor. Kept cheap: a passive
  // pointer listener feeds one rAF per frame, base centers are cached, and only
  // compositor-friendly transforms are written (no per-frame layout reads), so
  // it never affects scrolling/interaction speed. Skipped for reduced motion.
  useEffect(() => {
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return undefined;

    const els = glyphRefs.current.filter(Boolean);
    if (els.length === 0) return undefined;

    const RADIUS = 150;
    const MAX_PUSH = 70;
    let bases = [];
    let pointer = { x: -9999, y: -9999 };
    let raf = 0;

    const measure = () => {
      bases = els.map((el) => {
        const prev = el.style.transform;
        el.style.transform = "none";
        const rect = el.getBoundingClientRect();
        el.style.transform = prev;
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
    };

    const update = () => {
      raf = 0;
      for (let i = 0; i < els.length; i += 1) {
        const base = bases[i];
        if (!base) continue;
        const dx = base.x - pointer.x;
        const dy = base.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < RADIUS && dist > 0.001) {
          const push = ((RADIUS - dist) / RADIUS) * MAX_PUSH;
          els[i].style.transform = `translate(${(dx / dist) * push}px, ${(dy / dist) * push}px)`;
        } else {
          els[i].style.transform = "";
        }
      }
    };

    const onMove = (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onLeave = () => {
      pointer = { x: -9999, y: -9999 };
      if (!raf) raf = requestAnimationFrame(update);
    };

    measure();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", measure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const lessons = [...course.lessons].sort((a, b) => a.order - b.order);
  const availableLessons = lessons.filter((lesson) => lesson.available !== false && isLessonAvailable(lesson.id));
  const completedCount = availableLessons.filter(
    (lesson) => lessonProgress[lesson.id]?.completed,
  ).length;

  const nextLesson =
    availableLessons.find((lesson) => !lessonProgress[lesson.id]?.completed) ||
    availableLessons[availableLessons.length - 1];

  const nextProgress = nextLesson ? lessonProgress[nextLesson.id] : null;
  const nextInProgress = isLessonInProgress(nextProgress);
  const displayName = getProfileDisplayName(user, profile);
  const photoURL = getProfilePhotoUrl(user, profile);
  const avatar = getProfileAvatar(profile);

  function lessonButtonLabel(lessonId) {
    const progress = lessonProgress[lessonId];
    if (progress?.completed) return "Review chapter";
    if (isLessonInProgress(progress)) return "Continue chapter";
    return "Start chapter";
  }

  return (
    <div className="screen home-screen">
      <div className="home-bg-shapes" aria-hidden="true">
        {FLOATING_GLYPHS.map((glyph, i) => (
          <span
            key={i}
            ref={(el) => {
              glyphRefs.current[i] = el;
            }}
            className="floating-glyph"
            style={{
              top: glyph.top,
              left: glyph.left,
              fontSize: glyph.size,
              color: glyph.color,
            }}
          >
            <span
              className="floating-glyph-inner"
              style={{ animationDelay: `${-i * 1.3}s` }}
            >
              {glyph.c}
            </span>
          </span>
        ))}
      </div>
      {premiumOpen && (
        <JokePaywall variant="premium" onClose={() => setPremiumOpen(false)} />
      )}
      <header className="home-header">
        <div>
          <p className="eyebrow">{course.subject}</p>
          <h1>{course.title}</h1>
          <p className="subtitle">{course.description}</p>
        </div>
        <div className="home-header-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onOpenLeaderboard}
            aria-label="Open leaderboard"
            title="Leaderboard"
          >
            <Icon name="trophy" size={18} />
          </button>
          <ThemeToggle />
          <button
            type="button"
            className="profile-chip profile-chip-main"
            onClick={onOpenProfile}
            aria-label={`Open profile for ${displayName}`}
          >
            <UserAvatar name={displayName} photoURL={photoURL} avatar={avatar} />
            <strong className="profile-chip-name">{displayName}</strong>
          </button>
        </div>
      </header>

      <section className="stats-row">
        <div className="stat-card">
          <span className="stat-card-icon stat-icon-xp">
            <Icon name="zap" size={18} />
          </span>
          <div className="stat-card-body">
            <span className="stat-card-label">XP</span>
            <span className="stat-card-value">{profile?.xp || 0}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon stat-icon-streak">
            <Icon name="flame" size={18} />
          </span>
          <div className="stat-card-body">
            <span className="stat-card-label">Streak</span>
            <span className="stat-card-value">{profile?.streak || 0} days</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon stat-icon-progress">
            <Icon name="target" size={18} />
          </span>
          <div className="stat-card-body">
            <span className="stat-card-label">Progress</span>
            <span className="stat-card-value">
              {completedCount}/{availableLessons.length} chapters
            </span>
          </div>
        </div>
      </section>

      {hasMistakes && (
        <section className="practice-mistakes-row">
          <button
            type="button"
            className="btn btn-primary btn-icon-text"
            onClick={onPracticeMistakes}
          >
            <Icon name="sparkles" size={18} />
            Practice your mistakes
          </button>
        </section>
      )}

      {nextLesson && (
        <section className="next-card">
          <p className="eyebrow">{nextInProgress ? "Continue where you left off" : "Up next"}</p>
          <h2>{nextLesson.title}</h2>
          <p>{nextLesson.description}</p>
          <LessonProgressBar lessonId={nextLesson.id} progress={nextProgress} />
          <button
            type="button"
            className="btn btn-primary btn-icon-text"
            onClick={() => onStartLesson(nextLesson.id)}
          >
            <Icon name={nextProgress?.completed ? "check" : "play"} size={18} />
            {lessonButtonLabel(nextLesson.id)}
          </button>
        </section>
      )}

      <section className="course-path-section">
        <div className="course-path-head">
          <h3>Your path</h3>
          <span className="course-path-count">
            {completedCount}/{availableLessons.length} done
          </span>
        </div>
        <CoursePath
          lessons={lessons}
          lessonProgress={lessonProgress}
          onStartLesson={onStartLesson}
          onPremium={() => setPremiumOpen(true)}
        />
      </section>
    </div>
  );
}
