import { useEffect, useMemo, useRef, useState } from "react";
import { LESSONS_BY_ID } from "../content/lessons";
import { getStepState } from "../lib/progress";
import { getReviewFeedbackMessage } from "../lib/review";
import { formatRichText } from "../lib/formatRichText";
import { debounce } from "../lib/debounce";
import SolutionPanel from "./SolutionPanel";
import JokePaywall from "./JokePaywall";
import Icon from "./Icon";
import XpBar from "./XpBar";
import IntroStep from "./steps/IntroStep";
import NumberInputStep from "./steps/NumberInputStep";
import TapChoiceStep from "./steps/TapChoiceStep";
import OutlierDragStep from "./steps/OutlierDragStep";
import CorrelationSandboxStep from "./steps/CorrelationSandboxStep";
import ScatterMatchStep from "./steps/ScatterMatchStep";
import BagSimulatorStep from "./steps/BagSimulatorStep";
import BinomialExploreStep from "./steps/BinomialExploreStep";
import NormalShadeStep from "./steps/NormalShadeStep";
import CISimulatorStep from "./steps/CISimulatorStep";
import BarChartTapStep from "./steps/BarChartTapStep";
import WeightedMeanStep from "./steps/WeightedMeanStep";
import DotPlotCompareStep from "./steps/DotPlotCompareStep";
import ContingencyTableStep from "./steps/ContingencyTableStep";
import NormalProbeStep from "./steps/NormalProbeStep";
import ZCompareStep from "./steps/ZCompareStep";
import VennTapStep from "./steps/VennTapStep";
import OutcomeSelectStep from "./steps/OutcomeSelectStep";
import CoinFlipExploreStep from "./steps/CoinFlipExploreStep";
import SliderPredictionStep from "./steps/SliderPredictionStep";
import DistributionChoiceStep from "./steps/DistributionChoiceStep";
import ScatterDisplayStep from "./steps/ScatterDisplayStep";
import ProbabilityTreeStep from "./steps/ProbabilityTreeStep";
import BoxPlotStep from "./steps/BoxPlotStep";

const LESSONS = LESSONS_BY_ID;

const EXPLORE_STEP_TYPES = new Set([
  "outlier-drag",
  "correlation-sandbox",
  "bag-simulator",
  "binomial-explore",
  "normal-shade",
  "ci-simulator",
  "scatter-display",
]);

function problemXp(step) {
  if (step.type === "intro" || EXPLORE_STEP_TYPES.has(step.type)) {
    return 0;
  }
  return step.synthesis ? 25 : 10;
}

export default function LessonPlayer({
  lessonId,
  progress,
  reviewMode = false,
  xp = 0,
  onBack,
  onRestart,
  onPersistStep,
  onCompleteLesson,
  onAwardXp,
}) {
  const lesson = LESSONS[lessonId];
  const [stepIndex, setStepIndex] = useState(() => progress?.currentStepIndex || 0);
  const [feedback, setFeedback] = useState(null);
  const [restarting, setRestarting] = useState(false);
  const paywallEnabled = Boolean(lesson?.paywallHalfway);
  const paywallTrigger = Math.floor((lesson?.steps?.length || 0) / 2);
  const [showPaywall, setShowPaywall] = useState(
    () =>
      paywallEnabled &&
      !reviewMode &&
      Boolean(lesson?.steps?.length) &&
      (progress?.currentStepIndex || 0) >= paywallTrigger,
  );
  const paywallShownRef = useRef(showPaywall);
  const feedbackRef = useRef(null);

  const step = lesson?.steps[stepIndex];
  const savedState = lesson ? getStepState(progress, stepIndex) : undefined;

  const displayFeedback =
    reviewMode && step && step.type !== "intro"
      ? (() => {
          const message = getReviewFeedbackMessage(step, savedState);
          if (!message) return null;
          return step.solution
            ? { correct: true, showSolution: true, xp: 0 }
            : { correct: true, message };
        })()
      : feedback;

  // Start each step (and the lesson itself) scrolled to the top — not wherever
  // the previous step or a review solution left the scroll position.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [stepIndex]);

  // Only auto-scroll to feedback when it appears from a live answer (not when a
  // review-mode solution renders on mount, which would land you at the bottom).
  useEffect(() => {
    if (!feedback || !feedbackRef.current) return;
    feedbackRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [feedback]);

  // Throttle partial/"explore" saves (drags, sliders) so manipulating a visual
  // never fires a Firestore write per frame — keeps interactions at 60 FPS and
  // avoids write amplification under many concurrent learners.
  const persistPartial = useMemo(
    () => debounce((idx, state) => onPersistStep(idx, state), 350),
    [onPersistStep],
  );
  useEffect(() => () => persistPartial.cancel(), [persistPartial]);

  if (!lesson) {
    return (
      <div className="screen">
        <p>Chapter not found.</p>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
      </div>
    );
  }

  const progressPercent = Math.round(((stepIndex + 1) / lesson.steps.length) * 100);

  function advanceStep(state, message) {
    // An authoritative save is coming — drop any pending throttled explore save.
    persistPartial.cancel();

    // Don't re-award XP for a problem that was already solved (e.g. when going
    // back with the "Previous step" button and re-answering it).
    const alreadySolved = Boolean(savedState?.result?.correct);
    const isLastStep = stepIndex >= lesson.steps.length - 1;

    // Persist in the background so grading feedback is never blocked on the
    // network (client-side grading already decided the result instantly).
    // Once a problem is completed, save forward progress immediately so that
    // leaving the lesson (without clicking "Continue") still resumes past it.
    const persistInBackground = async (extraXp) => {
      await onPersistStep(stepIndex, state);
      if (extraXp > 0 && onAwardXp) await onAwardXp(extraXp);
      if (!isLastStep) {
        await onPersistStep(stepIndex + 1, getStepState(progress, stepIndex + 1) || {});
      }
    };

    if (state?.result?.correct && step.solution) {
      const xp = alreadySolved ? 0 : problemXp(step);
      setFeedback({ correct: true, showSolution: true, xp });
      void persistInBackground(xp);
      return;
    }

    if (message) {
      setFeedback({ correct: true, message });
      void persistInBackground(0);
      return;
    }

    void onPersistStep(stepIndex, state);
    goToNextStep();
  }

  async function goToPreviousStep() {
    if (stepIndex <= 0) return;
    persistPartial.cancel();
    setFeedback(null);
    const prevIndex = stepIndex - 1;
    setStepIndex(prevIndex);
    await onPersistStep(prevIndex, getStepState(progress, prevIndex) || {});
  }

  function handleBack() {
    if (stepIndex > 0) {
      goToPreviousStep();
    }
  }

  async function goToNextStep() {
    persistPartial.cancel();
    setFeedback(null);
    if (stepIndex >= lesson.steps.length - 1) {
      onCompleteLesson();
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    if (paywallEnabled && !reviewMode && !paywallShownRef.current && nextIndex >= paywallTrigger) {
      paywallShownRef.current = true;
      setShowPaywall(true);
    }
    await onPersistStep(nextIndex, getStepState(progress, nextIndex) || {});
  }

  async function handleRestart() {
    if (restarting) return;
    persistPartial.cancel();
    const confirmed = window.confirm(
      "Restart this chapter from the beginning? Your saved progress will be cleared.",
    );
    if (!confirmed) return;

    setRestarting(true);
    try {
      await onRestart();
      setStepIndex(0);
      setFeedback(null);
    } finally {
      setRestarting(false);
    }
  }

  function savePartial(state) {
    if (reviewMode) return;
    persistPartial(stepIndex, state);
  }

  function renderStep() {
    const stepKey = `${step.id}-${stepIndex}`;
    const props = {
      step,
      savedState,
      reviewMode,
      onComplete: advanceStep,
      onSaveProgress: savePartial,
    };

    switch (step.type) {
      case "intro":
        return (
          <IntroStep
            key={stepKey}
            step={step}
            onContinue={() => advanceStep({}, null)}
          />
        );
      case "outlier-drag":
        return <OutlierDragStep key={stepKey} {...props} />;
      case "correlation-sandbox":
        return <CorrelationSandboxStep key={stepKey} {...props} />;
      case "scatter-match":
        return <ScatterMatchStep key={stepKey} {...props} />;
      case "scatter-display":
        return <ScatterDisplayStep key={stepKey} {...props} />;
      case "prob-tree":
        return <ProbabilityTreeStep key={stepKey} {...props} />;
      case "box-plot":
        return <BoxPlotStep key={stepKey} {...props} />;
      case "bag-simulator":
        return <BagSimulatorStep key={stepKey} {...props} />;
      case "binomial-explore":
        return <BinomialExploreStep key={stepKey} {...props} />;
      case "normal-shade":
        return <NormalShadeStep key={stepKey} {...props} />;
      case "ci-simulator":
        return <CISimulatorStep key={stepKey} {...props} />;
      case "number-input":
        return <NumberInputStep key={stepKey} {...props} />;
      case "tap-choice":
        return <TapChoiceStep key={stepKey} {...props} />;
      case "bar-chart-tap":
        return <BarChartTapStep key={stepKey} {...props} />;
      case "weighted-mean":
        return <WeightedMeanStep key={stepKey} {...props} />;
      case "dot-plot-compare":
        return <DotPlotCompareStep key={stepKey} {...props} />;
      case "contingency-table":
        return <ContingencyTableStep key={stepKey} {...props} />;
      case "normal-probe":
        return <NormalProbeStep key={stepKey} {...props} />;
      case "z-compare":
        return <ZCompareStep key={stepKey} {...props} />;
      case "venn-tap":
        return <VennTapStep key={stepKey} {...props} />;
      case "outcome-select":
        return <OutcomeSelectStep key={stepKey} {...props} />;
      case "coin-flip-explore":
        return <CoinFlipExploreStep key={stepKey} {...props} />;
      case "slider-prediction":
        return <SliderPredictionStep key={stepKey} {...props} />;
      case "distribution-choice":
        return <DistributionChoiceStep key={stepKey} {...props} />;
      default:
        return <p>Unknown step type: {step.type}</p>;
    }
  }

  return (
    <div className="screen lesson-screen">
      {showPaywall && (
        <JokePaywall
          variant="halfway"
          onClose={() => setShowPaywall(false)}
        />
      )}
      <header className="lesson-header">
        <div className="lesson-header-row">
          <button
            type="button"
            className="btn-text btn-icon-text"
            onClick={onBack}
          >
            <Icon name="arrow-left" size={16} /> Course
          </button>
          <button
            type="button"
            className="btn-text btn-restart btn-icon-text"
            onClick={handleRestart}
            disabled={restarting}
          >
            <Icon name="refresh" size={15} /> Restart
          </button>
        </div>
        <div className="lesson-meta">
          <h1>{lesson.title}</h1>
          <p>
            {reviewMode ? "Review · " : ""}
            Page {stepIndex + 1} of {lesson.steps.length}
          </p>
        </div>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        {!reviewMode && <XpBar xp={xp} />}
      </header>

      <section className="lesson-content">
        {stepIndex > 0 && (
          <button
            type="button"
            className="btn-text btn-step-back"
            onClick={handleBack}
          >
            ← Previous step
          </button>
        )}
        <h2 className="step-title">{step.title}</h2>
        {renderStep()}
      </section>

      {displayFeedback && (
        <div ref={feedbackRef} className="feedback feedback-correct" role="status">
          {displayFeedback.showSolution && step.solution ? (
            <SolutionPanel
              solution={step.solution}
              xpEarned={displayFeedback.xp || 0}
              onContinue={goToNextStep}
              finishLabel={
                stepIndex >= lesson.steps.length - 1 ? "Finish chapter" : "Continue"
              }
            />
          ) : (
            <>
              <p>{formatRichText(displayFeedback.message)}</p>
              <button type="button" className="btn btn-primary" onClick={goToNextStep}>
                {stepIndex >= lesson.steps.length - 1 ? "Finish chapter" : "Continue"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
