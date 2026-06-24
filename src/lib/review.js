export function getReviewFeedbackMessage(step, savedState) {
  switch (step.type) {
    case "intro":
      return null;
    case "outlier-drag":
    case "correlation-sandbox":
    case "bag-simulator":
    case "binomial-explore":
    case "normal-shade":
    case "ci-simulator":
    case "scatter-display":
      return step.feedback?.ready ?? null;
    case "number-input":
    case "tap-choice":
    case "scatter-match":
    case "bar-chart-tap":
    case "weighted-mean":
    case "dot-plot-compare":
    case "contingency-table":
    case "normal-probe":
    case "z-compare":
    case "prob-tree":
    case "box-plot":
    case "venn-tap":
    case "outcome-select":
    case "coin-flip-explore":
    case "slider-prediction":
    case "distribution-choice":
      return step.solution?.body ?? savedState?.result?.message ?? null;
    default:
      return null;
  }
}
