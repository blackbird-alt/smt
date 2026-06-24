import { useEffect, useMemo, useRef } from "react";
import { isLessonInProgress } from "../lib/progress";
import {
  getLessonProgressPercent,
  getLessonStepCount,
  isLessonAvailable,
} from "../content/lessons";
import Icon from "./Icon";

const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function statusFor(lesson, progress) {
  if (lesson.premium) return "premium";
  if (lesson.available === false || !isLessonAvailable(lesson.id)) return "locked";
  if (progress?.completed) return "completed";
  if (isLessonInProgress(progress)) return "in-progress";
  return "available";
}

const STATUS_CHIP = {
  completed: "Completed",
  "in-progress": "In Progress",
  available: "Not Started",
  premium: "Premium",
  locked: "Locked",
};

function ctaLabel(status) {
  if (status === "completed") return "Review";
  if (status === "in-progress") return "Continue";
  if (status === "premium") return "Unlock";
  if (status === "locked") return "Locked";
  return "Start";
}

function centerIcon(status) {
  if (status === "completed") return "check";
  if (status === "locked") return "lock";
  if (status === "premium") return "crown";
  return null;
}

// "Chapter 3 — Elementary Probability" -> "Elementary Probability"
function shortTitle(title) {
  const dash = title.indexOf("—");
  return dash >= 0 ? title.slice(dash + 1).trim() : title;
}

function ProgressRing({ percent, status }) {
  const filled = status === "completed" ? 100 : percent;
  const offset = RING_CIRCUMFERENCE * (1 - filled / 100);
  return (
    <svg className="ring" viewBox="0 0 48 48" aria-hidden="true">
      <circle className="ring-track" cx="24" cy="24" r={RING_RADIUS} />
      {filled > 0 && (
        <circle
          className="ring-fill"
          cx="24"
          cy="24"
          r={RING_RADIUS}
          transform="rotate(-90 24 24)"
          style={{
            strokeDasharray: RING_CIRCUMFERENCE,
            strokeDashoffset: offset,
          }}
        />
      )}
    </svg>
  );
}

export default function CoursePath({ lessons, lessonProgress, onStartLesson, onPremium }) {
  const activeRef = useRef(null);

  const items = useMemo(() => {
    let currentIndex = lessons.findIndex((lesson) => {
      const status = statusFor(lesson, lessonProgress[lesson.id]);
      return status === "available" || status === "in-progress";
    });

    return lessons.map((lesson, index) => {
      const progress = lessonProgress[lesson.id];
      return {
        lesson,
        status: statusFor(lesson, progress),
        percent: getLessonProgressPercent(progress, lesson.id),
        currentStep: (progress?.currentStepIndex ?? 0) + 1,
        totalSteps: getLessonStepCount(lesson.id),
        isCurrent: index === currentIndex,
      };
    });
  }, [lessons, lessonProgress]);

  useEffect(() => {
    const node = activeRef.current;
    if (!node) return;
    const t = setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    return () => clearTimeout(t);
  }, []);

  function handleSelect(item) {
    if (item.status === "premium") {
      onPremium();
      return;
    }
    if (item.status === "locked") return;
    onStartLesson(item.lesson.id);
  }

  return (
    <ol className="path-timeline">
      {items.map((item) => {
        const { lesson, status } = item;
        const icon = centerIcon(status);
        const interactive = status !== "locked";
        const showBar = status === "in-progress";

        return (
          <li
            key={lesson.id}
            className={`path-row path-row-${status} ${item.isCurrent ? "path-row-current" : ""}`}
            ref={item.isCurrent ? activeRef : null}
          >
            <div className="path-rail" aria-hidden="true">
              <span className="path-line" />
              <span className="path-node">
                <ProgressRing percent={item.percent} status={status} />
                <span className="path-node-face">
                  {icon ? (
                    <Icon name={icon} size={18} />
                  ) : (
                    <span className="path-node-num">{lesson.order}</span>
                  )}
                </span>
              </span>
            </div>

            <button
              type="button"
              className="path-card"
              onClick={() => handleSelect(item)}
              disabled={!interactive}
              aria-label={`${lesson.title} — ${STATUS_CHIP[status]}`}
            >
              <span className="path-card-head">
                <span className="path-eyebrow">
                  Chapter {lesson.order}
                  {lesson.estimatedMinutes ? (
                    <>
                      {" · "}
                      <span className="path-mins">{lesson.estimatedMinutes} min</span>
                    </>
                  ) : null}
                </span>
                <span className={`path-chip path-chip-${status}`}>
                  {STATUS_CHIP[status]}
                </span>
              </span>

              <strong className="path-card-title">{shortTitle(lesson.title)}</strong>
              <span className="path-card-desc">{lesson.description}</span>

              {showBar && (
                <span className="path-progress">
                  <span className="path-progress-track">
                    <span
                      className="path-progress-fill"
                      style={{ width: `${item.percent}%` }}
                    />
                  </span>
                  <span className="path-progress-label">
                    Page {item.currentStep} of {item.totalSteps}
                  </span>
                </span>
              )}

              {interactive && (
                <span className="path-cta">
                  {ctaLabel(status)}
                  <Icon name="chevron-right" size={16} />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
