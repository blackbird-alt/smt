import { useCallback, useEffect, useState } from "react";
import course from "../content/course.json";
import {
  ensureUserProfile,
  getLessonProgress,
  getUserProfile,
  isLessonInProgress,
  loadAllLessonProgress,
  recordLessonCompletion,
  resetLessonProgress,
  saveLessonStep,
  saveLessonStepIndex,
  awardXp,
} from "../lib/progress";

const LESSON_IDS = course.lessons.map((lesson) => lesson.id);

export function useProgress(user) {
  const [profile, setProfile] = useState(null);
  const [lessonProgress, setLessonProgress] = useState({});
  const [loading, setLoading] = useState(Boolean(user));

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [nextProfile, allProgress] = await Promise.all([
          ensureUserProfile(user),
          loadAllLessonProgress(user.uid, LESSON_IDS),
        ]);

        if (!cancelled) {
          setProfile(nextProfile);
          setLessonProgress(allProgress);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loadLesson = useCallback(
    async (lessonId) => {
      if (!user) return null;
      const progress = await getLessonProgress(user.uid, lessonId);
      setLessonProgress((current) => ({ ...current, [lessonId]: progress }));
      return progress;
    },
    [user],
  );

  const persistStep = useCallback(
    async (lessonId, stepIndex, stepState) => {
      if (!user) return;

      const hasState = stepState && Object.keys(stepState).length > 0;

      if (hasState) {
        await saveLessonStep(user.uid, lessonId, stepIndex, stepState);
      } else {
        await saveLessonStepIndex(user.uid, lessonId, stepIndex);
      }

      setLessonProgress((current) => {
        const existing = current[lessonId] || {};
        return {
          ...current,
          [lessonId]: {
            ...existing,
            currentStepIndex: stepIndex,
            stepStates: hasState
              ? {
                  ...(existing.stepStates || {}),
                  [stepIndex]: stepState,
                  [String(stepIndex)]: stepState,
                }
              : existing.stepStates || {},
          },
        };
      });
    },
    [user],
  );

  const completeLesson = useCallback(
    async (lessonId, stepStates) => {
      if (!user) return;
      await recordLessonCompletion(user.uid, lessonId, stepStates);
      const nextProfile = await getUserProfile(user.uid);
      setProfile(nextProfile);
      setLessonProgress((current) => ({
        ...current,
        [lessonId]: {
          ...(current[lessonId] || {}),
          ...(stepStates ? { stepStates } : {}),
          completed: true,
        },
      }));
    },
    [user],
  );

  const restartLesson = useCallback(
    async (lessonId) => {
      if (!user) return null;
      await resetLessonProgress(user.uid, lessonId);
      const freshProgress = {
        currentStepIndex: 0,
        stepStates: {},
        completed: false,
      };
      setLessonProgress((current) => ({
        ...current,
        [lessonId]: freshProgress,
      }));
      return freshProgress;
    },
    [user],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    const nextProfile = await getUserProfile(user.uid);
    setProfile(nextProfile);
    return nextProfile;
  }, [user]);

  const grantXp = useCallback(
    async (amount) => {
      if (!user || !amount) return;
      // Optimistically bump XP so the bar animates instantly on a correct answer.
      setProfile((prev) =>
        prev ? { ...prev, xp: (prev.xp || 0) + amount } : prev,
      );
      await awardXp(user.uid, amount);
      const nextProfile = await getUserProfile(user.uid);
      setProfile(nextProfile);
    },
    [user],
  );

  return {
    profile: user ? profile : null,
    lessonProgress: user ? lessonProgress : {},
    loading: user ? loading : false,
    loadLesson,
    persistStep,
    completeLesson,
    restartLesson,
    refreshProfile,
    grantXp,
    isLessonInProgress,
  };
}
