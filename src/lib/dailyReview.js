import { LESSONS_BY_ID } from "../content/lessons";

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Firestore Timestamp | string | null -> "YYYY-MM-DD" (or null).
function toDayKey(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString().slice(0, 10);
  }
  if (typeof value === "string") return value.slice(0, 10);
  return null;
}

// The daily review pops up on the first login of a NEW day, starting on the
// learner's second calendar day — and only if they've completed at least one
// section. Skipped/in-progress sections contribute nothing (see collect below).
export function shouldShowDailyReview(profile, completedLessonIds) {
  if (!profile) return false;
  if (!completedLessonIds || completedLessonIds.length === 0) return false;

  const today = todayKey();
  if (profile.lastReviewDate === today) return false;

  // Not on the join day (day 1) — only from day 2 onward.
  const joinDay = toDayKey(profile.createdAt);
  if (!joinDay || joinDay >= today) return false;

  // There must actually be review problems available from completed sections.
  return collectReviewProblems(completedLessonIds).length > 0;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Gather review problems only from sections the learner has completed. Takes a
// couple from each (shuffled) so the set spans their done chapters, then caps
// the total. Each problem is tagged with its source lesson.
export function collectReviewProblems(completedLessonIds, max = 5, perChapter = 2) {
  const pool = [];
  for (const lessonId of completedLessonIds) {
    const chapter = LESSONS_BY_ID[lessonId];
    const reviews = chapter?.review || [];
    if (reviews.length === 0) continue;
    const picked = shuffle(reviews).slice(0, perChapter);
    for (const problem of picked) {
      pool.push({ ...problem, lessonId, lessonTitle: chapter.title });
    }
  }
  return shuffle(pool).slice(0, max);
}
