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

// Turn the user's recorded mistakes (a map on their profile) into source
// problems the AI can model fresh practice on. Most-recently-missed first; each
// entry is resolved to its full lesson step so the AI has the concept + answer.
export function collectMistakeSources(profile, max = 6) {
  const map = profile?.mistakes;
  if (!map || typeof map !== "object") return [];

  const entries = Object.values(map)
    .filter((m) => m && m.lessonId && m.stepId != null)
    .sort((a, b) => String(b.lastMissed).localeCompare(String(a.lastMissed)));

  const sources = [];
  for (const entry of entries) {
    const chapter = LESSONS_BY_ID[entry.lessonId];
    if (!chapter) continue;
    const step = (chapter.steps || []).find((s) => String(s.id) === String(entry.stepId));
    if (!step || !step.prompt) continue;
    sources.push({
      lessonId: entry.lessonId,
      lessonTitle: chapter.title,
      type: step.type,
      title: step.title,
      context: step.context,
      prompt: step.prompt,
      options: step.options,
      correct: step.correct,
      solution: step.solution,
      count: entry.count || 1,
    });
    if (sources.length >= max) break;
  }
  return sources;
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
