import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { deriveUsername, writePublicProfile } from "./social";

function userRef(uid) {
  return doc(db, "users", uid);
}

function progressRef(uid, lessonId) {
  return doc(db, "users", uid, "progress", lessonId);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function ensureUserProfile(user) {
  const ref = userRef(user.uid);
  const snapshot = await getDoc(ref);
  const username = deriveUsername(user);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      displayName: user.displayName || "Learner",
      email: user.email,
      photoURL: user.photoURL || null,
      username,
      streak: 0,
      xp: 0,
      lastActiveDate: null,
      milestones: [],
      createdAt: serverTimestamp(),
    });
  } else {
    const data = snapshot.data();
    const updates = {};
    if (user.displayName && data.displayName !== user.displayName) {
      updates.displayName = user.displayName;
    }
    if (user.photoURL && data.photoURL !== user.photoURL) {
      updates.photoURL = user.photoURL;
    }
    if (!data.username) {
      updates.username = username;
    }
    if (Object.keys(updates).length > 0) {
      await setDoc(ref, updates, { merge: true });
    }
  }

  const fresh = (await getDoc(ref)).data();

  // Mirror the public, world-readable copy used by leaderboards & friend search.
  await writePublicProfile(user.uid, {
    username: fresh.username || username,
    displayName: fresh.displayName || "Learner",
    avatarId: fresh.avatarId || null,
    xp: fresh.xp || 0,
    streak: fresh.streak || 0,
  });

  return fresh;
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(userRef(uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export function normalizeLessonProgress(data) {
  if (!data) return null;

  const raw = data.stepStates;
  if (!raw || typeof raw !== "object") {
    return { ...data, stepStates: {} };
  }

  const stepStates = {};
  for (const [key, value] of Object.entries(raw)) {
    stepStates[String(key)] = value;
  }

  return { ...data, stepStates };
}

export async function getLessonProgress(uid, lessonId) {
  const snapshot = await getDoc(progressRef(uid, lessonId));
  return snapshot.exists() ? normalizeLessonProgress(snapshot.data()) : null;
}

export async function loadAllLessonProgress(uid, lessonIds) {
  const entries = await Promise.all(
    lessonIds.map(async (lessonId) => {
      const progress = await getLessonProgress(uid, lessonId);
      return [lessonId, progress];
    }),
  );

  return Object.fromEntries(entries);
}

export async function saveLessonProgress(uid, lessonId, data) {
  await setDoc(
    progressRef(uid, lessonId),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveLessonStep(uid, lessonId, stepIndex, stepState) {
  const ref = progressRef(uid, lessonId);
  const snapshot = await getDoc(ref);
  const existing = snapshot.exists() ? snapshot.data() : {};
  const stepStates = {
    ...(existing.stepStates || {}),
    [String(stepIndex)]: stepState,
  };

  await setDoc(
    ref,
    {
      currentStepIndex: stepIndex,
      stepStates,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveLessonStepIndex(uid, lessonId, stepIndex) {
  await setDoc(
    progressRef(uid, lessonId),
    {
      currentStepIndex: stepIndex,
      completed: false,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function awardXp(uid, amount) {
  if (!amount) return;
  const userSnapshot = await getDoc(userRef(uid));
  const profile = userSnapshot.data() || {};
  const today = todayKey();
  const yesterday = yesterdayKey();
  const lastActive = profile.lastActiveDate;

  let streak = profile.streak || 0;
  if (lastActive !== today) {
    streak = lastActive === yesterday ? streak + 1 : 1;
  }

  const nextXp = (profile.xp || 0) + amount;
  await setDoc(
    userRef(uid),
    {
      xp: nextXp,
      streak,
      lastActiveDate: today,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await writePublicProfile(uid, { xp: nextXp, streak });
}

export async function recordLessonCompletion(uid, lessonId, stepStates) {
  const userSnapshot = await getDoc(userRef(uid));
  const profile = userSnapshot.data() || {};
  const today = todayKey();
  const yesterday = yesterdayKey();
  const lastActive = profile.lastActiveDate;

  let streak = profile.streak || 0;
  if (lastActive !== today) {
    streak = lastActive === yesterday ? streak + 1 : 1;
  }

  const milestones = new Set(profile.milestones || []);
  milestones.add(`completed:${lessonId}`);

  await setDoc(
    userRef(uid),
    {
      streak,
      lastActiveDate: today,
      milestones: [...milestones],
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await writePublicProfile(uid, { streak });

  const completionData = {
    completed: true,
    completedAt: serverTimestamp(),
  };

  if (stepStates && Object.keys(stepStates).length > 0) {
    completionData.stepStates = stepStates;
  }

  await saveLessonProgress(uid, lessonId, completionData);
}

export async function resetLessonProgress(uid, lessonId) {
  await setDoc(progressRef(uid, lessonId), {
    currentStepIndex: 0,
    stepStates: {},
    completed: false,
    completedAt: null,
    updatedAt: serverTimestamp(),
  });
}

// Remember problems the learner answered incorrectly so the daily review can
// generate fresh, similar practice targeting their weak spots. Stored as a
// capped map on the user doc keyed by "lessonId::stepId" (dedup + count).
const MAX_TRACKED_MISTAKES = 40;

export async function recordMistake(uid, lessonId, stepId) {
  if (!uid || !lessonId || stepId == null) return;
  const ref = userRef(uid);
  const snapshot = await getDoc(ref);
  const data = snapshot.exists() ? snapshot.data() : {};
  const mistakes = { ...(data.mistakes || {}) };

  const key = `${lessonId}::${stepId}`;
  const prev = mistakes[key];
  mistakes[key] = {
    lessonId,
    stepId: String(stepId),
    count: (prev?.count || 0) + 1,
    lastMissed: new Date().toISOString(),
  };

  // Cap the map: keep only the most recently missed problems.
  const keys = Object.keys(mistakes);
  if (keys.length > MAX_TRACKED_MISTAKES) {
    keys
      .sort((a, b) =>
        String(mistakes[b].lastMissed).localeCompare(String(mistakes[a].lastMissed)),
      )
      .slice(MAX_TRACKED_MISTAKES)
      .forEach((stale) => delete mistakes[stale]);
  }

  await setDoc(ref, { mistakes, updatedAt: serverTimestamp() }, { merge: true });
}

export async function recordReviewShown(uid, dateKey) {
  await setDoc(
    userRef(uid),
    { lastReviewDate: dateKey, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function isLessonInProgress(progress) {
  if (!progress || progress.completed) return false;
  if (progress.currentStepIndex > 0) return true;
  return Object.keys(progress.stepStates || {}).length > 0;
}

export function getStepState(progress, stepIndex) {
  const states = progress?.stepStates;
  if (!states) return undefined;
  return states[stepIndex] ?? states[String(stepIndex)];
}
