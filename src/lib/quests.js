// Daily quests — small, resettable goals that reward the behaviors the learning
// science actually cares about: showing up daily (spacing), doing the work
// (retrieval), and running a review session (spaced retrieval + error review).
// They never change difficulty; they just make the right habit feel rewarding.

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Read today's counters off the profile. If the stored day isn't today, the
// learner hasn't done anything yet today, so everything reads as zero.
export function getDailyStats(profile) {
  const daily = profile?.daily;
  if (!daily || daily.date !== todayKey()) {
    return { correct: 0, xp: 0, reviewed: false };
  }
  return {
    correct: daily.correct || 0,
    xp: daily.xp || 0,
    reviewed: Boolean(daily.reviewed),
  };
}

// Each quest: a target, a function that reads current progress, and a short
// "why" grounding it in the learning science (surfaced in the UI on tap).
const QUEST_DEFS = [
  {
    id: "warmup",
    icon: "target",
    title: "Warm up",
    goal: 3,
    progress: (s) => s.correct,
    label: (s) => `${Math.min(s.correct, 3)}/3 correct today`,
    why: "Producing answers from memory (retrieval) builds memory far better than rereading.",
  },
  {
    id: "in-the-zone",
    icon: "zap",
    title: "In the zone",
    goal: 8,
    progress: (s) => s.correct,
    label: (s) => `${Math.min(s.correct, 8)}/8 correct today`,
    why: "Effortful practice spread across a session strengthens what sticks.",
  },
  {
    id: "lock-it-in",
    icon: "refresh",
    title: "Lock it in",
    goal: 1,
    progress: (s) => (s.reviewed ? 1 : 0),
    label: (s) => (s.reviewed ? "Review done" : "Do a review session"),
    why: "Spaced review of past problems is retrieval, spacing, and error-correction at once — the single highest-leverage study habit.",
  },
];

export function computeDailyQuests(profile) {
  const stats = getDailyStats(profile);
  return QUEST_DEFS.map((q) => {
    const progress = Math.min(q.progress(stats), q.goal);
    return {
      id: q.id,
      icon: q.icon,
      title: q.title,
      goal: q.goal,
      progress,
      percent: Math.round((progress / q.goal) * 100),
      label: q.label(stats),
      why: q.why,
      done: progress >= q.goal,
    };
  });
}

export function questsSummary(profile) {
  const quests = computeDailyQuests(profile);
  const done = quests.filter((q) => q.done).length;
  return { quests, done, total: quests.length, allDone: done === quests.length };
}
