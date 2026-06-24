import { getLessonProgressPercent, getLessonStepCount } from "../content/lessons";

export default function LessonProgressBar({ lessonId, progress, compact = false }) {
  const totalSteps = getLessonStepCount(lessonId);
  const percent = getLessonProgressPercent(progress, lessonId);
  const started = Boolean(progress);
  const currentStep = progress?.completed
    ? totalSteps
    : started
      ? (progress.currentStepIndex ?? 0) + 1
      : 0;

  if (!totalSteps) return null;

  return (
    <div className={`lesson-progress-bar ${compact ? "lesson-progress-bar-compact" : ""}`}>
      <div className="lesson-progress-labels">
        <span>
          {started ? `Page ${currentStep} of ${totalSteps}` : "Not started"}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
