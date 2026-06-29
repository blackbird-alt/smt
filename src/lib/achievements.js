import course from "../content/course.json";
import { computeAllMastery } from "./mastery";

// Badges are derived entirely from data the app already persists (xp, streak,
// milestones, review totals, per-chapter mastery) — so unlocking one needs no
// extra writes and can never get out of sync. Each badge rewards a concrete
// behavior; the science-backed ones carry a `why` shown in the trophy case.
const XP_PER_LEVEL = 100;

function levelOf(xp) {
  return Math.floor((xp || 0) / XP_PER_LEVEL) + 1;
}

function buildContext(profile, lessonProgress) {
  const milestones = profile?.milestones || [];
  const completedCount = milestones.filter((m) => String(m).startsWith("completed:")).length;
  const freeTotal = course.lessons.filter((l) => !l.premium && l.available !== false).length;
  const mastery = computeAllMastery(lessonProgress || {}, profile || {});
  const masteredCount = mastery.filter((m) => m.status === "mastered").length;
  const reviewAttempts = profile?.reviewAttempts || 0;
  const reviewCorrect = profile?.reviewCorrect || 0;
  const reviewAccuracy = reviewAttempts > 0 ? reviewCorrect / reviewAttempts : 0;

  return {
    xp: profile?.xp || 0,
    level: levelOf(profile?.xp),
    streak: profile?.streak || 0,
    completedCount,
    freeTotal,
    masteredCount,
    reviewSessions: profile?.reviewSessions || 0,
    reviewAttempts,
    reviewAccuracy,
  };
}

const BADGE_DEFS = [
  {
    id: "first-steps",
    icon: "🎒",
    name: "First Steps",
    desc: "Finish your first chapter.",
    earned: (c) => c.completedCount >= 1,
  },
  {
    id: "halfway",
    icon: "🧗",
    name: "Halfway There",
    desc: "Finish half the free chapters.",
    earned: (c) => c.freeTotal > 0 && c.completedCount >= Math.ceil(c.freeTotal / 2),
  },
  {
    id: "graduate",
    icon: "🎓",
    name: "Graduate",
    desc: "Complete every free chapter.",
    earned: (c) => c.freeTotal > 0 && c.completedCount >= c.freeTotal,
  },
  {
    id: "spark",
    icon: "🔥",
    name: "Warming Up",
    desc: "Reach a 3-day streak.",
    why: "Spacing your practice across days beats one long cram — streaks pull you back daily.",
    earned: (c) => c.streak >= 3,
  },
  {
    id: "on-fire",
    icon: "🚀",
    name: "On Fire",
    desc: "Reach a 7-day streak.",
    why: "A week of spaced sessions is exactly the schedule memory research rewards.",
    earned: (c) => c.streak >= 7,
  },
  {
    id: "two-weeks",
    icon: "⚡",
    name: "Two Weeks Strong",
    desc: "Reach a 14-day streak.",
    why: "Two weeks of spaced practice moves ideas into durable, long-term memory.",
    earned: (c) => c.streak >= 14,
  },
  {
    id: "unstoppable",
    icon: "🌋",
    name: "Unstoppable",
    desc: "Reach a 30-day streak.",
    earned: (c) => c.streak >= 30,
  },
  {
    id: "rising-star",
    icon: "⭐",
    name: "Rising Star",
    desc: "Reach Level 3.",
    earned: (c) => c.level >= 3,
  },
  {
    id: "high-scorer",
    icon: "💫",
    name: "High Scorer",
    desc: "Reach Level 5.",
    earned: (c) => c.level >= 5,
  },
  {
    id: "prodigy",
    icon: "🌟",
    name: "Prodigy",
    desc: "Reach Level 8.",
    earned: (c) => c.level >= 8,
  },
  {
    id: "point-machine",
    icon: "💎",
    name: "Point Machine",
    desc: "Earn 1,000 total XP.",
    earned: (c) => c.xp >= 1000,
  },
  {
    id: "reviewer",
    icon: "🔁",
    name: "Comeback Kid",
    desc: "Finish a review session.",
    why: "Re-attempting problems you missed is retrieval + error-correction — where the real learning happens.",
    earned: (c) => c.reviewSessions >= 1,
  },
  {
    id: "regular-reviewer",
    icon: "📅",
    name: "Regular Reviewer",
    desc: "Finish 5 review sessions.",
    why: "Repeated spaced review is the habit that turns short-term wins into lasting recall.",
    earned: (c) => c.reviewSessions >= 5,
  },
  {
    id: "review-devotee",
    icon: "🧠",
    name: "Review Devotee",
    desc: "Finish 15 review sessions.",
    earned: (c) => c.reviewSessions >= 15,
  },
  {
    id: "sharp-recall",
    icon: "🎯",
    name: "Sharp Recall",
    desc: "Hit 80% accuracy across 10+ review answers.",
    why: "High accuracy on spaced review (not first-time practice) is the signal that knowledge has actually stuck.",
    earned: (c) => c.reviewAttempts >= 10 && c.reviewAccuracy >= 0.8,
  },
  {
    id: "marksman",
    icon: "🏹",
    name: "Marksman",
    desc: "Hit 90% accuracy across 25+ review answers.",
    earned: (c) => c.reviewAttempts >= 25 && c.reviewAccuracy >= 0.9,
  },
  {
    id: "master",
    icon: "🏅",
    name: "Master",
    desc: "Master a chapter (80%+).",
    earned: (c) => c.masteredCount >= 1,
  },
  {
    id: "scholar",
    icon: "👑",
    name: "Scholar",
    desc: "Master 3 chapters.",
    earned: (c) => c.masteredCount >= 3,
  },
  {
    id: "perfectionist",
    icon: "💯",
    name: "Perfectionist",
    desc: "Master 5 chapters.",
    earned: (c) => c.masteredCount >= 5,
  },
  {
    id: "flawless",
    icon: "🦉",
    name: "Flawless",
    desc: "Master every free chapter.",
    why: "Mastering each topic (Bloom's mastery learning) is what one-to-one tutoring does — and it's worth ~2 letter grades.",
    earned: (c) => c.freeTotal > 0 && c.masteredCount >= c.freeTotal,
  },
];

export function computeAchievements(profile, lessonProgress) {
  const ctx = buildContext(profile, lessonProgress);
  const badges = BADGE_DEFS.map((b) => ({
    id: b.id,
    icon: b.icon,
    name: b.name,
    desc: b.desc,
    why: b.why || null,
    earned: Boolean(b.earned(ctx)),
  }));
  const earnedCount = badges.filter((b) => b.earned).length;
  return { badges, earnedCount, total: badges.length };
}
