import fs from "fs";
import path from "path";

const dir = "src/content/lessons";

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
}

function save(name, data) {
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2) + "\n");
}

function step(data, id) {
  const found = data.steps.find((s) => s.id === id);
  if (!found) throw new Error(`Missing step ${id}`);
  return found;
}

function patch(name, id, patchFn) {
  const data = load(name);
  patchFn(step(data, id));
  save(name, data);
}

patch("chapter-1-averages.json", "1-1", (s) => {
  s.type = "bar-chart-tap";
  s.prompt = "Tap the bar for the size that sold most often.";
  s.bars = [
    { id: "7", label: "7", count: 1 },
    { id: "8", label: "8", count: 3, correct: true },
    { id: "9", label: "9", count: 1 },
    { id: "10", label: "10", count: 1 },
    { id: "11", label: "11", count: 1 },
    { id: "12", label: "12", count: 1 },
    { id: "13", label: "13", count: 1 },
    { id: "14", label: "14", count: 1 },
  ];
  delete s.options;
});

patch("chapter-1-averages.json", "1-3", (s) => {
  s.type = "weighted-mean";
  s.prompt = "Adjust the weight sliders until the weighted mean matches the final grade.";
  s.correct = 85.2;
  s.tolerance = 0.15;
  s.categories = [
    { id: "hw", label: "Homework", score: 95, initialWeight: 0.25 },
    { id: "mid", label: "Midterm", score: 78, initialWeight: 0.25 },
    { id: "proj", label: "Project", score: 88, initialWeight: 0.25 },
    { id: "final", label: "Final", score: 84, initialWeight: 0.25 },
  ];
});

patch("chapter-1-averages.json", "1-4", (s) => {
  s.type = "dot-plot-compare";
  s.prompt = "Use the dot plots. Which batch is more consistent?";
  s.seriesA = { label: "Bakery A (g)", values: [96, 100, 100, 100, 100, 100, 100, 104] };
  s.seriesB = { label: "Bakery B (g)", values: [96, 96, 96, 96, 104, 104, 104, 104] };
});

patch("chapter-1-averages.json", "1-6", (s) => {
  s.type = "z-compare";
  s.prompt = "Tap the score that is more unusual relative to the group.";
  s.mean = 500;
  s.sd = 100;
  s.axisMin = 350;
  s.axisMax = 700;
  s.points = [
    { id: "640", label: "640", value: 640, z: 1.4, correct: true },
    { id: "410", label: "410", value: 410, z: -0.9 },
  ];
  delete s.options;
});

patch("chapter-2-correlation.json", "2-5", (s) => {
  s.type = "slider-prediction";
  s.prompt = "Drag the slider to predict annual repair cost for a 6-year-old car ($).";
  s.min = 400;
  s.max = 550;
  s.step = 1;
  s.initial = 430;
  s.correct = 470;
  s.tolerance = 2;
  s.feedback = { wrong: "Use ŷ = 200 + 45(6)." };
});

patch("chapter-2-correlation.json", "2-7", (s) => {
  s.type = "slider-prediction";
  s.prompt = "Drag the slider to set r² (as a decimal).";
  s.min = 0;
  s.max = 1;
  s.step = 0.01;
  s.initial = 0.3;
  s.correct = 0.49;
  s.tolerance = 0.02;
  s.feedback = { wrong: "Square r: 0.7 × 0.7." };
});

patch("chapter-3-probability.json", "3-1", (s) => {
  s.type = "outcome-select";
  s.singleSelect = true;
  s.faces = [1, 2, 3, 4, 5, 6];
  s.correctOutcomes = [5];
  s.prompt = "Tap the die face for rolling a 5.";
});

patch("chapter-3-probability.json", "3-2", (s) => {
  // Keep card context; add interactive contingency for conditional setup
  s.type = "contingency-table";
  s.prompt = "Tap the cell with cards that are **both** heart and face (the overlap).";
  s.rowLabels = ["Heart", "Not heart"];
  s.colLabels = ["Face card", "Not face"];
  s.cells = [
    { id: "0-0", count: 3, correct: true },
    { id: "0-1", count: 10 },
    { id: "1-0", count: 9 },
    { id: "1-1", count: 30 },
  ];
  delete s.options;
  s.feedback.wrong = "Tap the overlap cell: heart and face.";
  s.solution.body = "There are **3** cards in both groups (heart face cards: J, Q, K of hearts). For P(heart ∪ face), use 13 + 12 − 3 = **22/52**.";
});

patch("chapter-3-probability.json", "3-3", (s) => {
  s.type = "coin-flip-explore";
  s.prompt = "Flip two fair coins, then choose P(HH).";
  s.trackId = "hh";
  s.trackLabel = "H then H";
  s.minFlips = 8;
  s.options = [
    { id: "a", label: "1/4", correct: true },
    { id: "b", label: "1/2" },
    { id: "c", label: "1/3" },
  ];
  delete s.context;
});

patch("chapter-3-probability.json", "3-5", (s) => {
  s.type = "contingency-table";
  s.prompt = "Given a student has a part-time job, tap the cell with students who play sports.";
  s.rowLabels = ["Plays sports", "Does not play sports"];
  s.colLabels = ["Has job", "No job"];
  s.cells = [
    { id: "0-0", count: 24, correct: true },
    { id: "0-1", count: 12 },
    { id: "1-0", count: 12 },
    { id: "1-1", count: 52 },
  ];
  delete s.options;
});

patch("chapter-4-binomial.json", "4-1", (s) => {
  s.type = "distribution-choice";
  s.prompt = "Which chart shows a binomial pattern (fixed trials, two outcomes)?";
  s.faces = ["0", "1", "2", "3", "4"];
  s.options = [
    {
      id: "coin",
      label: "20 fair coin flips",
      probabilities: [0.05, 0.15, 0.25, 0.25, 0.2],
      correct: true,
    },
    {
      id: "cards",
      label: "Draw 20 cards without replacement",
      probabilities: [0.4, 0.3, 0.15, 0.1, 0.05],
    },
    {
      id: "flat",
      label: "Every count equally likely",
      probabilities: [0.2, 0.2, 0.2, 0.2, 0.2],
    },
  ];
});

patch("chapter-4-binomial.json", "4-7", (s) => {
  s.type = "distribution-choice";
  s.prompt = "Which binomial shape has center near 3 and a right tail (p = 0.25, n = 12)?";
  s.faces = ["0", "2", "4", "6", "8"];
  s.options = [
    {
      id: "left",
      label: "Skewed left",
      probabilities: [0.05, 0.15, 0.35, 0.3, 0.15],
    },
    {
      id: "right",
      label: "Skewed right",
      probabilities: [0.2, 0.25, 0.25, 0.18, 0.12],
      correct: true,
    },
    {
      id: "sym",
      label: "Symmetric",
      probabilities: [0.05, 0.2, 0.5, 0.2, 0.05],
    },
  ];
});

patch("chapter-5-normal.json", "5-1", (s) => {
  s.type = "normal-probe";
  s.prompt = "Shade the region between z = -1 and z = +1 to match the 68% rule.";
  s.initialLow = -0.5;
  s.initialHigh = 0.5;
  s.targetArea = 0.6827;
  s.tolerance = 0.02;
  s.targetLabel = "Target: about **68%** within 1 SD";
  delete s.options;
});

patch("chapter-5-normal.json", "5-5", (s) => {
  s.type = "normal-probe";
  s.prompt = "Shade the middle region P(-1 < Z < 1) on the standard normal curve.";
  s.initialLow = -0.3;
  s.initialHigh = 0.3;
  s.targetArea = 0.6827;
  s.tolerance = 0.02;
  s.targetLabel = "Match the middle **68%** band";
  delete s.options;
});

patch("chapter-6-estimation.json", "6-4", (s) => {
  s.type = "slider-prediction";
  s.prompt = "Drag to the lower endpoint: x̄ − MOE when x̄ = 52 and MOE = 1.96.";
  s.min = 48;
  s.max = 52;
  s.step = 0.01;
  s.initial = 50;
  s.correct = 50.04;
  s.tolerance = 0.1;
  s.feedback = { wrong: "Subtract the margin of error from 52." };
});

console.log("Converted interactive problems in chapters 1-6");
