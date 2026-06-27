import { useEffect, useRef, useState } from "react";
import NumberInputStep from "./steps/NumberInputStep";
import TapChoiceStep from "./steps/TapChoiceStep";
import SolutionPanel from "./SolutionPanel";
import Icon from "./Icon";
import AskForHelp from "./AskForHelp";
import { generateReviewProblems } from "../lib/ai";

const XP_PER_PROBLEM = 10;

export default function DailyReview({
  sources = [],
  fallbackProblems = [],
  aiEnabled = false,
  count = 5,
  onClose,
  onAwardXp,
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("answering"); // answering | solved | done
  const [correct, setCorrect] = useState(0);
  const [lastXp, setLastXp] = useState(0);

  // status: "loading" while we try to build a personalized set, then "ready".
  const [status, setStatus] = useState("loading");
  const [problems, setProblems] = useState([]);
  const [personalized, setPersonalized] = useState(false);
  const builtRef = useRef(false);

  useEffect(() => {
    if (builtRef.current) return undefined;
    builtRef.current = true;
    let cancelled = false;

    (async () => {
      if (aiEnabled && sources.length > 0) {
        try {
          const generated = await generateReviewProblems(sources, { count });
          if (!cancelled && generated.length > 0) {
            setProblems(generated);
            setPersonalized(true);
            setStatus("ready");
            return;
          }
        } catch {
          /* fall back to the static set below */
        }
      }
      if (!cancelled) {
        setProblems(fallbackProblems);
        setStatus("ready");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [aiEnabled, sources, fallbackProblems, count]);

  const total = problems.length;
  const problem = problems[index];
  const isLast = index >= total - 1;

  function handleCorrect() {
    onAwardXp?.(XP_PER_PROBLEM);
    setLastXp(XP_PER_PROBLEM);
    setCorrect((current) => current + 1);
    setPhase("solved");
  }

  function next() {
    if (isLast) {
      setPhase("done");
      return;
    }
    setIndex((current) => current + 1);
    setPhase("answering");
  }

  function renderProblem() {
    const props = {
      step: problem,
      savedState: undefined,
      reviewMode: false,
      onComplete: handleCorrect,
      onSaveProgress: () => {},
    };
    switch (problem.type) {
      case "number-input":
        return <NumberInputStep key={problem.id} {...props} />;
      case "tap-choice":
      default:
        return <TapChoiceStep key={problem.id} {...props} />;
    }
  }

  if (status === "loading") {
    return (
      <div className="screen daily-review-screen">
        <header className="daily-review-header">
          <div className="daily-review-titlebar">
            <h1 className="daily-review-title">
              <Icon name="refresh" size={20} /> Daily review
            </h1>
            <button type="button" className="btn-text" onClick={onClose}>
              Skip
            </button>
          </div>
        </header>
        <div className="daily-review-summary">
          <span className="daily-review-summary-icon ask-help-typing">
            <Icon name="sparkles" size={36} />
          </span>
          <h2>Building your review…</h2>
          <p className="daily-review-sub">
            Creating fresh problems based on what you've found tricky.
          </p>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="screen daily-review-screen">
        <header className="daily-review-header">
          <div className="daily-review-titlebar">
            <h1 className="daily-review-title">
              <Icon name="refresh" size={20} /> Daily review
            </h1>
          </div>
        </header>
        <div className="daily-review-summary">
          <span className="daily-review-summary-icon">
            <Icon name="check" size={36} />
          </span>
          <h2>Nothing to review yet</h2>
          <p className="daily-review-sub">Keep going through the course!</p>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Continue to course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen daily-review-screen">
      <header className="daily-review-header">
        <div className="daily-review-titlebar">
          <h1 className="daily-review-title">
            <Icon name="refresh" size={20} /> Daily review
          </h1>
          <button
            type="button"
            className="btn-text"
            onClick={onClose}
            aria-label="Skip review"
          >
            {phase === "done" ? "Done" : "Skip"}
          </button>
        </div>
        {phase !== "done" && (
          <>
            <p className="daily-review-sub">
              {personalized
                ? "Fresh problems based on what you've found tricky."
                : "A quick refresher from chapters you've finished."}
            </p>
            <div className="daily-review-progress" aria-hidden="true">
              {problems.map((p, i) => (
                <span
                  key={p.id}
                  className={`daily-review-pip ${i < index ? "daily-review-pip-done" : ""} ${i === index ? "daily-review-pip-active" : ""}`}
                />
              ))}
            </div>
            <p className="daily-review-count">
              Problem {index + 1} of {total}
              {problem?.lessonTitle ? ` · ${problem.lessonTitle}` : ""}
            </p>
          </>
        )}
      </header>

      {phase === "done" ? (
        <div className="daily-review-summary">
          <span className="daily-review-summary-icon">
            <Icon name="trophy" size={36} />
          </span>
          <h2>Review complete!</h2>
          <p className="daily-review-score">
            {correct} / {total} correct
          </p>
          <p className="daily-review-xp">+{correct * XP_PER_PROBLEM} XP earned</p>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Continue to course
          </button>
        </div>
      ) : (
        <section className="lesson-content daily-review-content">
          {phase === "solved" ? (
            <div className="feedback feedback-correct" role="status">
              <SolutionPanel
                solution={problem.solution}
                xpEarned={lastXp}
                onContinue={next}
                finishLabel={isLast ? "Finish review" : "Next problem"}
              />
            </div>
          ) : (
            <>
              {renderProblem()}
              <AskForHelp
                key={`help-${problem.id}`}
                step={problem}
                attempt={undefined}
                lessonId={problem.lessonId}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}
