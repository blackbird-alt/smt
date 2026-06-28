import { LESSONS_BY_ID } from "../content/lessons";

// Interactive sandboxes have no single right answer, so they never count toward
// a chapter's "graded" step total (they can't be missed). Everything else with
// a checkable answer does.
const EXPLORE_STEP_TYPES = new Set([
  "outlier-drag",
  "correlation-sandbox",
  "scatter-match",
  "scatter-display",
  "prob-tree",
  "bag-simulator",
  "binomial-explore",
  "normal-shade",
  "ci-simulator",
  "coin-flip-explore",
]);

function isGradedStep(step) {
  if (!step || !step.type) return false;
  if (step.type === "intro") return false;
  return !EXPLORE_STEP_TYPES.has(step.type);
}

function countGradedSteps(lessonId) {
  const chapter = LESSONS_BY_ID[lessonId];
  if (!chapter) return 0;
  return (chapter.steps || []).filter(isGradedStep).length;
}

// How many distinct tracked mistakes belong to this chapter.
function countChapterMistakes(profile, lessonId) {
  const map = profile?.mistakes;
  if (!map || typeof map !== "object") return 0;
  return Object.values(map).filter((m) => m && m.lessonId === lessonId).length;
}

// A soft mastery signal for a single chapter. Only meaningful once the chapter
// is completed; before that it reports "incomplete" so callers can skip it.
// masteryPercent = graded answers landed cleanly (graded - missed) over graded.
export function computeChapterMastery(lessonId, lessonProgress, profile) {
  const chapter = LESSONS_BY_ID[lessonId];
  const title = chapter?.title || lessonId;
  const completed = Boolean(lessonProgress?.[lessonId]?.completed);

  if (!completed) {
    return {
      lessonId,
      title,
      status: "incomplete",
      masteryPercent: null,
      graded: countGradedSteps(lessonId),
      missed: 0,
    };
  }

  const graded = countGradedSteps(lessonId);
  const missed = countChapterMistakes(profile, lessonId);

  if (graded === 0) {
    // No gradable problems (shouldn't happen for real chapters) — treat the
    // finished chapter as mastered rather than dividing by zero.
    return {
      lessonId,
      title,
      status: "mastered",
      masteryPercent: 100,
      graded: 0,
      missed,
    };
  }

  const clean = graded - Math.min(missed, graded);
  const masteryPercent = Math.round((100 * clean) / graded);
  const mastered = masteryPercent >= 80;

  return {
    lessonId,
    title,
    status: mastered ? "mastered" : "review",
    masteryPercent,
    graded,
    missed,
  };
}

// Mastery for every known chapter, in course order.
export function computeAllMastery(lessonProgress, profile) {
  return Object.keys(LESSONS_BY_ID).map((lessonId) =>
    computeChapterMastery(lessonId, lessonProgress, profile),
  );
}
