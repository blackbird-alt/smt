import chapter1 from "./chapter-1-averages.json";
import chapter2 from "./chapter-2-correlation.json";
import chapter3 from "./chapter-3-probability.json";
import chapter4 from "./chapter-4-binomial.json";
import chapter5 from "./chapter-5-normal.json";
import chapter6 from "./chapter-6-estimation.json";
import chapter7 from "./chapter-7-hypothesis.json";
import chapter8 from "./chapter-8-two-groups.json";
import chapter9 from "./chapter-9-chi-square.json";
import chapter10 from "./chapter-10-regression-inference.json";

export const LESSONS_BY_ID = {
  "chapter-1-averages": chapter1,
  "chapter-2-correlation": chapter2,
  "chapter-3-probability": chapter3,
  "chapter-4-binomial": chapter4,
  "chapter-5-normal": chapter5,
  "chapter-6-estimation": chapter6,
  "chapter-7-hypothesis": chapter7,
  "chapter-8-two-groups": chapter8,
  "chapter-9-chi-square": chapter9,
  "chapter-10-regression-inference": chapter10,
};

export const AVAILABLE_LESSON_IDS = new Set(Object.keys(LESSONS_BY_ID));

export function getLessonStepCount(lessonId) {
  return LESSONS_BY_ID[lessonId]?.steps.length ?? 0;
}

export function getLessonProgressPercent(progress, lessonId) {
  const totalSteps = getLessonStepCount(lessonId);
  if (!totalSteps || !progress) return 0;
  if (progress.completed) return 100;

  const stepIndex = progress.currentStepIndex ?? 0;
  return Math.round((stepIndex / totalSteps) * 100);
}

export function isLessonAvailable(lessonId) {
  return AVAILABLE_LESSON_IDS.has(lessonId);
}
