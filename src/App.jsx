import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useProgress } from "./hooks/useProgress";
import { signOutUser } from "./lib/auth";
import {
  collectMistakeSources,
  collectReviewProblems,
  shouldShowDailyReview,
  todayKey,
} from "./lib/dailyReview";
import { recordMistake, recordReviewShown } from "./lib/progress";
import { isAiHelpEnabled } from "./lib/ai";
import Login from "./components/Login";
import CourseHome from "./components/CourseHome";

// Code-split the screens that aren't needed for first interaction. The lesson
// player pulls in ~30 step renderers + all chapter content, and the profile
// screen is rarely the entry point — keeping them out of the initial bundle
// makes the login/dashboard load fast (< 2s to first interaction).
const LessonPlayer = lazy(() => import("./components/LessonPlayer"));
const Profile = lazy(() => import("./components/Profile"));
const Leaderboard = lazy(() => import("./components/Leaderboard"));
const DailyReview = lazy(() => import("./components/DailyReview"));

function LoadingScreen() {
  return (
    <div className="screen loading-screen">
      <div className="spinner" aria-label="Loading…" />
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading, refreshUser } = useAuth();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Login />;
  }

  // Keying the authed experience on the uid remounts it whenever the signed-in
  // user changes, so navigation state (open lesson, profile screen, etc.) never
  // leaks across sign-out/sign-in or between different accounts.
  return <AuthedApp key={user.uid} user={user} refreshUser={refreshUser} />;
}

function AuthedApp({ user, refreshUser }) {
  const {
    profile,
    lessonProgress,
    loading: progressLoading,
    loadLesson,
    persistStep,
    completeLesson,
    restartLesson,
    refreshProfile,
    grantXp,
  } = useProgress(user);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [localProgress, setLocalProgress] = useState(null);
  const [lessonSession, setLessonSession] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewProblems, setReviewProblems] = useState([]);
  const [reviewSources, setReviewSources] = useState([]);
  const [reviewCount, setReviewCount] = useState(5);
  const reviewDecidedRef = useRef(false);

  // Once per day, starting on the learner's second day, surface a review of
  // problems drawn only from sections they've completed. Decided once after
  // progress loads; the date is recorded immediately so it won't re-pop today.
  useEffect(() => {
    if (progressLoading || reviewDecidedRef.current || !profile) return undefined;

    const completedIds = Object.keys(lessonProgress).filter(
      (id) => lessonProgress[id]?.completed,
    );
    if (!shouldShowDailyReview(profile, completedIds)) {
      reviewDecidedRef.current = true;
      return undefined;
    }
    reviewDecidedRef.current = true;

    let cancelled = false;
    (async () => {
      const problems = collectReviewProblems(completedIds);
      const sources = collectMistakeSources(profile);
      if (problems.length === 0 && sources.length === 0) return;
      await recordReviewShown(user.uid, todayKey());
      await refreshProfile();
      if (cancelled) return;
      setReviewProblems(problems);
      setReviewSources(sources);
      setReviewCount(5);
      setReviewOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [progressLoading, profile, lessonProgress, user.uid, refreshProfile]);

  const activeProgress =
    localProgress ?? (activeLessonId ? lessonProgress[activeLessonId] : null);

  const openLesson = useCallback(
    async (lessonId) => {
      const cached = lessonProgress[lessonId];
      const progress =
        cached?.completed || !cached
          ? await loadLesson(lessonId)
          : cached;

      if (progress?.completed) {
        setReviewMode(true);
        setLocalProgress({
          ...progress,
          currentStepIndex: 0,
          completed: true,
        });
      } else {
        setReviewMode(false);
        setLocalProgress(progress);
      }

      setActiveLessonId(lessonId);
      setLessonSession((current) => current + 1);
    },
    [lessonProgress, loadLesson],
  );

  const handleRestart = useCallback(
    async () => {
      if (!activeLessonId) return;
      const freshProgress = await restartLesson(activeLessonId);
      setReviewMode(false);
      setLocalProgress(freshProgress);
      setLessonSession((current) => current + 1);
    },
    [activeLessonId, restartLesson],
  );

  const closeLesson = useCallback(() => {
    setActiveLessonId(null);
    setLocalProgress(null);
    setReviewMode(false);
  }, []);

  // Manual, on-demand practice of problems similar to ones the learner has
  // missed. Deliberately does NOT call recordReviewShown — this is separate
  // from the once-daily auto review and must not consume/suppress it.
  const openMistakePractice = useCallback(() => {
    const completedIds = Object.keys(lessonProgress).filter(
      (id) => lessonProgress[id]?.completed,
    );
    setReviewSources(collectMistakeSources(profile, 10));
    setReviewProblems(collectReviewProblems(completedIds));
    setReviewCount(10);
    setReviewOpen(true);
  }, [lessonProgress, profile]);

  const hasMistakes = collectMistakeSources(profile).length > 0;

  if (progressLoading) {
    return <LoadingScreen />;
  }

  if (reviewOpen) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <DailyReview
          sources={reviewSources}
          fallbackProblems={reviewProblems}
          aiEnabled={isAiHelpEnabled()}
          count={reviewCount}
          onAwardXp={grantXp}
          onClose={() => setReviewOpen(false)}
        />
      </Suspense>
    );
  }

  if (activeLessonId) {
    return (
      <Suspense fallback={<LoadingScreen />}>
      <LessonPlayer
        key={`${activeLessonId}-${lessonSession}`}
        lessonId={activeLessonId}
        progress={activeProgress}
        reviewMode={reviewMode}
        xp={profile?.xp || 0}
        onBack={closeLesson}
        onRestart={handleRestart}
        onPersistStep={async (stepIndex, stepState) => {
          const hasState = stepState && Object.keys(stepState).length > 0;
          const updateLocal = () => {
            setLocalProgress((current) => ({
              ...(current || {}),
              currentStepIndex: stepIndex,
              stepStates: hasState
                ? {
                    ...(current?.stepStates || {}),
                    [stepIndex]: stepState,
                    [String(stepIndex)]: stepState,
                  }
                : current?.stepStates || {},
            }));
          };

          if (reviewMode) {
            updateLocal();
            return;
          }

          await persistStep(activeLessonId, stepIndex, stepState);
          updateLocal();
        }}
        onCompleteLesson={async () => {
          if (!reviewMode) {
            await completeLesson(activeLessonId, activeProgress?.stepStates);
          }
          closeLesson();
        }}
        onAwardXp={grantXp}
        onRecordMistake={(stepId) => {
          void recordMistake(user.uid, activeLessonId, stepId);
        }}
      />
      </Suspense>
    );
  }

  if (showProfile) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Profile
          user={user}
          profile={profile}
          onBack={() => setShowProfile(false)}
          onSignOut={signOutUser}
          onProfileUpdated={refreshProfile}
          refreshUser={refreshUser}
        />
      </Suspense>
    );
  }

  if (showLeaderboard) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Leaderboard user={user} onBack={() => setShowLeaderboard(false)} />
      </Suspense>
    );
  }

  return (
    <CourseHome
      profile={profile}
      user={user}
      lessonProgress={lessonProgress}
      onStartLesson={openLesson}
      onOpenProfile={() => setShowProfile(true)}
      onOpenLeaderboard={() => setShowLeaderboard(true)}
      onPracticeMistakes={openMistakePractice}
      hasMistakes={hasMistakes}
    />
  );
}
