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
    return { correct: 0, xp: 0, reviewed: false, claimed: [] };
  }
  return {
    correct: daily.correct || 0,
    xp: daily.xp || 0,
    reviewed: Boolean(daily.reviewed),
    claimed: Array.isArray(daily.claimed) ? daily.claimed : [],
  };
}

// Each quest: a target, how to complete it, the XP reward, the progress reader,
// and a short "why" grounding it in the learning science (surfaced on tap).
const QUEST_DEFS = [
  {
    id: "warmup",
    icon: "target",
    title: "Warm up",
    how: "Answer 3 problems correctly in any chapter today.",
    reward: 30,
    goal: 3,
    progress: (s) => s.correct,
    label: (s) => `${Math.min(s.correct, 3)}/3 correct`,
    why: "Producing answers from memory (retrieval) builds memory far better than rereading.",
  },
  {
    id: "in-the-zone",
    icon: "zap",
    title: "In the zone",
    how: "Answer 8 problems correctly today — keep the session going.",
    reward: 50,
    goal: 8,
    progress: (s) => s.correct,
    label: (s) => `${Math.min(s.correct, 8)}/8 correct`,
    why: "Effortful practice spread across a session strengthens what sticks.",
  },
  {
    id: "lock-it-in",
    icon: "refresh",
    title: "Lock it in",
    how: 'Finish one review session — tap "Practice your mistakes" or the daily review.',
    reward: 40,
    goal: 1,
    progress: (s) => (s.reviewed ? 1 : 0),
    label: (s) => (s.reviewed ? "Done" : "0/1 review"),
    why: "Spaced review of past problems is retrieval, spacing, and error-correction at once — the single highest-leverage study habit.",
  },
];

export function computeDailyQuests(profile) {
  const stats = getDailyStats(profile);
  return QUEST_DEFS.map((q) => {
    const progress = Math.min(q.progress(stats), q.goal);
    const done = progress >= q.goal;
    const claimed = stats.claimed.includes(q.id);
    return {
      id: q.id,
      icon: q.icon,
      title: q.title,
      how: q.how,
      reward: q.reward,
      goal: q.goal,
      progress,
      percent: Math.round((progress / q.goal) * 100),
      label: q.label(stats),
      why: q.why,
      done,
      claimed,
      claimable: done && !claimed,
    };
  });
}

export function questsSummary(profile) {
  const quests = computeDailyQuests(profile);
  const done = quests.filter((q) => q.done).length;
  return { quests, done, total: quests.length, allDone: done === quests.length };
}
